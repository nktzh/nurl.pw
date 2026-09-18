import uuid
from urllib.parse import quote

from fastapi import APIRouter, Request, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from starlette.background import BackgroundTask

from app.core.config import settings
from app.core.database import SessionFactory
from app.core.storage import storage
from app.features.drops.constants import AccessType
from app.features.drops.dependencies import AccessToken, DropServiceDep, OwnerToken
from app.features.drops.exceptions import InvalidOperation
from app.features.drops.models import Drop, DropFile
from app.features.drops.schemas import (
    AccessGranted,
    AccessRequest,
    DropCreate,
    DropCreated,
    DropOut,
    UploadSlot,
)
from app.features.drops.service import DropService

router = APIRouter(prefix="/drops", tags=["drops"])


# --- owner flow: create -> upload files -> complete -> (delete) -----------


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_drop(data: DropCreate, service: DropServiceDep) -> DropCreated:
    drop, owner_token = await service.create(data)
    return DropCreated(
        id=drop.id,
        code=drop.code,
        name=drop.name,
        access=drop.access,
        expires_at=drop.expires_at,
        owner_token=owner_token,
        files=[UploadSlot.model_validate(f) for f in drop.files],
    )


@router.put("/{drop_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def upload_file(
    drop_id: uuid.UUID,
    file_id: uuid.UUID,
    request: Request,
    owner_token: OwnerToken,
    service: DropServiceDep,
) -> None:
    drop = await service.get_owned(drop_id, owner_token)
    await service.upload_file(drop, file_id, request.stream())


@router.post("/{drop_id}/complete")
async def complete_drop(
    drop_id: uuid.UUID, owner_token: OwnerToken, service: DropServiceDep
) -> DropOut:
    drop = await service.get_owned(drop_id, owner_token)
    drop = await service.complete(drop)
    return service.to_public(drop, token=None)


@router.delete("/{drop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_drop(
    drop_id: uuid.UUID, owner_token: OwnerToken, service: DropServiceDep
) -> None:
    drop = await service.get_owned(drop_id, owner_token)
    await service.delete_by_id(drop.id)


# --- recipient flow ---------------------------------------------------------


@router.get("/{key}")
async def get_drop(key: str, token: AccessToken, service: DropServiceDep) -> DropOut:
    drop = await service.get_ready(key)
    return service.to_public(drop, token)


@router.post("/{key}/access")
async def request_access(
    key: str, data: AccessRequest, service: DropServiceDep
) -> AccessGranted:
    drop = await service.get_ready(key)
    token = await service.grant_access(drop, data.password)
    return AccessGranted(token=token, expires_in=settings.access_token_ttl_seconds)


@router.get("/{key}/files/{file_id}")
async def download_file(
    key: str, file_id: uuid.UUID, token: AccessToken, service: DropServiceDep
) -> FileResponse:
    drop = await service.get_ready(key)
    _reject_one_time(drop)
    service.ensure_access(drop, token)
    return _file_response(drop, service.get_file(drop, file_id))


@router.get("/{key}/archive")
async def download_archive(
    key: str, token: AccessToken, service: DropServiceDep
) -> StreamingResponse:
    drop = await service.get_ready(key)
    _reject_one_time(drop)
    service.ensure_access(drop, token)
    return _archive_response(service, drop)


@router.get("/{key}/download")
async def download_one_time(key: str, service: DropServiceDep) -> Response:
    """One-time drops: the first download consumes and then erases the drop."""
    drop = await service.get_ready(key)
    if drop.access != AccessType.ONE_TIME:
        raise InvalidOperation("Используйте обычную ссылку на скачивание")
    await service.consume(drop)
    cleanup = BackgroundTask(_delete_drop, drop.id)
    if len(drop.files) == 1:
        return _file_response(drop, drop.files[0], cleanup)
    return _archive_response(service, drop, cleanup)


def _reject_one_time(drop: Drop) -> None:
    if drop.access == AccessType.ONE_TIME:
        raise InvalidOperation("Одноразовую папку можно скачать только целиком")


def _file_response(
    drop: Drop, file: DropFile, background: BackgroundTask | None = None
) -> FileResponse:
    return FileResponse(
        storage.file_path(drop.id, file.id),
        filename=file.name,
        media_type=file.content_type or "application/octet-stream",
        background=background,
    )


def _archive_response(
    service: DropService, drop: Drop, background: BackgroundTask | None = None
) -> StreamingResponse:
    archive = service.build_archive(drop)
    filename = f"nurl-{drop.name or drop.code}.zip"
    return StreamingResponse(
        archive,
        media_type="application/zip",
        headers={
            "Content-Length": str(len(archive)),
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        },
        background=background,
    )


async def _delete_drop(drop_id: uuid.UUID) -> None:
    async with SessionFactory() as session:
        await DropService(session, storage).delete_by_id(drop_id)
