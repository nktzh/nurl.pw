import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.features.drops.constants import (
    GB,
    NAME_RE,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    RETENTION_RULES,
    AccessType,
    Retention,
)


class FileIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    size: int = Field(ge=0)
    content_type: str | None = Field(default=None, max_length=255)

    @field_validator("name")
    @classmethod
    def strip_path(cls, value: str) -> str:
        name = value.replace("\\", "/").rsplit("/", 1)[-1].strip()
        if not name or name in {".", ".."}:
            raise ValueError("Некорректное имя файла")
        return name


class DropCreate(BaseModel):
    access: AccessType
    retention: Retention
    name: str | None = None
    password: str | None = None
    password_confirm: str | None = None
    files: list[FileIn] = Field(min_length=1)

    @field_validator("name", "password", "password_confirm", mode="before")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("name")
    @classmethod
    def check_name(cls, value: str | None) -> str | None:
        if value is not None and not NAME_RE.fullmatch(value):
            raise ValueError(
                "Имя папки: от 3 до 32 символов, латиница, цифры, «-» и «_»"
            )
        return value

    @model_validator(mode="after")
    def check_access(self) -> Self:
        if self.access == AccessType.ONE_TIME:
            self.name = None
        if self.access != AccessType.PRIVATE:
            self.password = self.password_confirm = None
        else:
            if not self.password:
                raise ValueError("Для приватной папки нужен пароль")
            if not PASSWORD_MIN_LENGTH <= len(self.password) <= PASSWORD_MAX_LENGTH:
                raise ValueError(
                    f"Пароль должен быть от {PASSWORD_MIN_LENGTH} "
                    f"до {PASSWORD_MAX_LENGTH} символов"
                )
            if self.password != self.password_confirm:
                raise ValueError("Пароли не совпадают")

        _, limit = RETENTION_RULES[self.retention]
        if sum(f.size for f in self.files) > limit:
            raise ValueError(
                f"Превышен лимит {limit // GB} ГБ для выбранного срока хранения"
            )
        return self


class UploadSlot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    size: int


class DropCreated(BaseModel):
    id: uuid.UUID
    code: str
    name: str | None
    access: AccessType
    expires_at: datetime
    owner_token: str
    files: list[UploadSlot]


class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    size: int
    content_type: str | None


class DropOut(BaseModel):
    code: str
    name: str | None
    access: AccessType
    retention: Retention
    expires_at: datetime
    total_size: int
    file_count: int
    locked: bool
    files: list[FileOut]


class AccessRequest(BaseModel):
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class AccessGranted(BaseModel):
    token: str
    expires_in: int
