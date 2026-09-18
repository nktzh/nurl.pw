from typing import Annotated

from fastapi import Depends, Header, Query

from app.core.database import SessionDep
from app.core.storage import storage
from app.features.drops.service import DropService


def get_drop_service(session: SessionDep) -> DropService:
    return DropService(session, storage)


DropServiceDep = Annotated[DropService, Depends(get_drop_service)]

OwnerToken = Annotated[str, Header(alias="X-Owner-Token")]


def get_access_token(
    header_token: Annotated[str | None, Header(alias="X-Access-Token")] = None,
    query_token: Annotated[str | None, Query(alias="token")] = None,
) -> str | None:
    return header_token or query_token


AccessToken = Annotated[str | None, Depends(get_access_token)]
