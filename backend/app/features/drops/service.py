import secrets
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from zipstream import ZIP_STORED, ZipStream

from app.core import security
from app.core.config import settings
from app.core.storage import FileTooLargeError, LocalStorage
from app.features.drops.constants import (
    CODE_ALPHABET,
    CODE_LENGTH,
    CONSUMED_GRACE,
    GB,
    RETENTION_RULES,
    AccessType,
    DropStatus,
)
from app.features.drops.exceptions import (
    AccessDenied,
    DropNotFound,
    FileNotFound,
    InvalidOperation,
    InvalidOwnerToken,
    NameTaken,
    StorageFull,
    WrongPassword,
)
from app.features.drops.models import Drop, DropFile
from app.features.drops.schemas import DropCreate, DropOut, FileOut


def _now() -> datetime:
    return datetime.now(UTC)


class DropService:
    def __init__(self, session: AsyncSession, storage: LocalStorage) -> None:
        self.session = session
        self.storage = storage

    # --- creation & upload -------------------------------------------------

    async def create(self, data: DropCreate) -> tuple[Drop, str]:
        if len(data.files) > settings.max_files_per_drop:
            raise InvalidOperation(
                f"Можно загрузить не более {settings.max_files_per_drop} файлов за раз"
            )
        await self.purge_expired()

        total_size = sum(f.size for f in data.files)
        await self._check_quota(total_size)
        if data.name and await self._key_taken(data.name):
            raise NameTaken

        ttl, _ = RETENTION_RULES[data.retention]
        owner_token = security.generate_secret()
        password_hash = (
            await run_in_threadpool(security.hash_password, data.password)
            if data.password
            else None
        )
        drop = Drop(
            code=await self._generate_code(),
            name=data.name,
            access=data.access,
            status=DropStatus.PENDING,
            retention=data.retention,
            password_hash=password_hash,
            owner_token_hash=security.hash_secret(owner_token),
            total_size=total_size,
            expires_at=_now() + ttl,
            files=[
                DropFile(
                    position=i,
                    name=f.name,
                    size=f.size,
                    content_type=f.content_type,
                )
                for i, f in enumerate(data.files)
            ],
        )
        self.session.add(drop)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise NameTaken from exc
        return drop, owner_token

    async def get_owned(self, drop_id: uuid.UUID, owner_token: str) -> Drop:
        drop = await self.session.get(Drop, drop_id)
        if drop is None or drop.expires_at <= _now():
            raise DropNotFound
        if not secrets.compare_digest(
            drop.owner_token_hash, security.hash_secret(owner_token)
        ):
            raise InvalidOwnerToken
        return drop

    async def upload_file(
        self, drop: Drop, file_id: uuid.UUID, stream: AsyncIterator[bytes]
    ) -> None:
        if drop.status != DropStatus.PENDING:
            raise InvalidOperation("Загрузка в эту папку уже завершена")
        file = self.get_file(drop, file_id)
        if file.uploaded:
            raise InvalidOperation("Файл уже загружен")

        path = self.storage.file_path(drop.id, file.id)
        try:
            written = await self.storage.write_stream(path, stream, file.size)
        except FileTooLargeError as exc:
            raise InvalidOperation("Размер файла больше заявленного") from exc
        if written != file.size:
            path.unlink(missing_ok=True)
            raise InvalidOperation("Файл загружен не полностью")

        file.uploaded = True
        await self.session.commit()

    async def complete(self, drop: Drop) -> Drop:
        if drop.status != DropStatus.PENDING:
            raise InvalidOperation("Загрузка в эту папку уже завершена")
        if not all(f.uploaded for f in drop.files):
            raise InvalidOperation("Не все файлы загружены")
        drop.status = DropStatus.READY
        await self.session.commit()
        return drop

    # --- reading -----------------------------------------------------------

    async def get_ready(self, key: str) -> Drop:
        # Codes are case-sensitive, names are not.
        key = key.strip()
        drop = await self.session.scalar(
            select(Drop)
            .where(
                or_(Drop.code == key, func.lower(Drop.name) == key.lower()),
                Drop.status == DropStatus.READY,
                Drop.expires_at > _now(),
            )
            .order_by((Drop.code == key).desc())
            .limit(1)
        )
        if drop is None:
            raise DropNotFound
        return drop

    def has_access(self, drop: Drop, token: str | None) -> bool:
        if drop.access != AccessType.PRIVATE:
            return True
        return bool(token) and security.verify_access_token(token, str(drop.id))

    def ensure_access(self, drop: Drop, token: str | None) -> None:
        if not self.has_access(drop, token):
            raise AccessDenied

    def to_public(self, drop: Drop, token: str | None) -> DropOut:
        locked = not self.has_access(drop, token)
        return DropOut(
            code=drop.code,
            name=drop.name,
            access=drop.access,
            retention=drop.retention,
            expires_at=drop.expires_at,
            total_size=drop.total_size,
            file_count=len(drop.files),
            locked=locked,
            files=[] if locked else [FileOut.model_validate(f) for f in drop.files],
        )

    async def grant_access(self, drop: Drop, password: str) -> str:
        if drop.access != AccessType.PRIVATE or drop.password_hash is None:
            raise InvalidOperation("Эта папка не защищена паролем")
        valid = await run_in_threadpool(
            security.verify_password, drop.password_hash, password
        )
        if not valid:
            raise WrongPassword
        return security.create_access_token(
            str(drop.id), settings.access_token_ttl_seconds
        )

    def get_file(self, drop: Drop, file_id: uuid.UUID) -> DropFile:
        file = next((f for f in drop.files if f.id == file_id), None)
        if file is None:
            raise FileNotFound
        return file

    def build_archive(self, drop: Drop) -> ZipStream:
        archive = ZipStream(compress_type=ZIP_STORED, sized=True)
        used: set[str] = set()
        for file in drop.files:
            archive.add_path(
                str(self.storage.file_path(drop.id, file.id)),
                arcname=_unique_name(file.name, used),
            )
        return archive

    async def consume(self, drop: Drop) -> None:
        """Atomically marks a one-time drop as used; only the first caller wins."""
        consumed_id = await self.session.scalar(
            update(Drop)
            .where(Drop.id == drop.id, Drop.status == DropStatus.READY)
            .values(status=DropStatus.CONSUMED, consumed_at=_now())
            .returning(Drop.id)
        )
        await self.session.commit()
        if consumed_id is None:
            raise DropNotFound

    # --- maintenance -------------------------------------------------------

    async def purge_expired(self) -> int:
        now = _now()
        ids = list(
            await self.session.scalars(
                delete(Drop)
                .where(
                    or_(
                        Drop.expires_at <= now,
                        Drop.consumed_at <= now - CONSUMED_GRACE,
                    )
                )
                .returning(Drop.id)
            )
        )
        await self.session.commit()
        for drop_id in ids:
            await self.storage.delete_drop(drop_id)
        return len(ids)

    async def delete_by_id(self, drop_id: uuid.UUID) -> None:
        await self.session.execute(delete(Drop).where(Drop.id == drop_id))
        await self.session.commit()
        await self.storage.delete_drop(drop_id)

    # --- helpers -----------------------------------------------------------

    async def _key_taken(self, key: str) -> bool:
        # Compared case-insensitively so a name can never shadow a code.
        key = key.lower()
        found = await self.session.scalar(
            select(Drop.id)
            .where(or_(func.lower(Drop.code) == key, func.lower(Drop.name) == key))
            .limit(1)
        )
        return found is not None

    async def _generate_code(self) -> str:
        for _ in range(20):
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
            if not await self._key_taken(code):
                return code
        raise StorageFull

    async def _check_quota(self, incoming: int) -> None:
        if settings.storage_quota_gb <= 0:
            return
        used = await self.session.scalar(select(func.coalesce(func.sum(Drop.total_size), 0)))
        if used + incoming > settings.storage_quota_gb * GB:
            raise StorageFull


def _unique_name(name: str, used: set[str]) -> str:
    candidate = name
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, ""
    counter = 1
    while candidate.lower() in used:
        candidate = f"{stem} ({counter}){'.' + ext if ext else ''}"
        counter += 1
    used.add(candidate.lower())
    return candidate
