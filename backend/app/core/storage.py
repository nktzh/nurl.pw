import shutil
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

import anyio

from app.core.config import settings


class FileTooLargeError(Exception):
    pass


class LocalStorage:
    """Stores drop files on disk as <base>/<drop_id>/<file_id>."""

    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir

    def drop_dir(self, drop_id: uuid.UUID) -> Path:
        return self.base_dir / str(drop_id)

    def file_path(self, drop_id: uuid.UUID, file_id: uuid.UUID) -> Path:
        return self.drop_dir(drop_id) / str(file_id)

    async def write_stream(
        self, path: Path, stream: AsyncIterator[bytes], max_bytes: int
    ) -> int:
        await anyio.Path(path.parent).mkdir(parents=True, exist_ok=True)
        written = 0
        try:
            async with await anyio.open_file(path, "wb") as fh:
                async for chunk in stream:
                    written += len(chunk)
                    if written > max_bytes:
                        raise FileTooLargeError
                    await fh.write(chunk)
        except BaseException:
            await anyio.Path(path).unlink(missing_ok=True)
            raise
        return written

    async def delete_drop(self, drop_id: uuid.UUID) -> None:
        await anyio.to_thread.run_sync(
            lambda: shutil.rmtree(self.drop_dir(drop_id), ignore_errors=True)
        )


storage = LocalStorage(settings.storage_dir)
