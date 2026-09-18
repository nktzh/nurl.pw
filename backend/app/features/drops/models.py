import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.features.drops.constants import AccessType, DropStatus, Retention


def _str_enum(enum_cls: type) -> Enum:
    return Enum(
        enum_cls,
        native_enum=False,
        length=16,
        values_callable=lambda e: [m.value for m in e],
    )


class Drop(Base):
    __tablename__ = "drops"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    name: Mapped[str | None] = mapped_column(String(32))
    access: Mapped[AccessType] = mapped_column(_str_enum(AccessType))
    status: Mapped[DropStatus] = mapped_column(
        _str_enum(DropStatus), default=DropStatus.PENDING
    )
    retention: Mapped[Retention] = mapped_column(_str_enum(Retention))
    password_hash: Mapped[str | None] = mapped_column(String(255))
    owner_token_hash: Mapped[str] = mapped_column(String(64))
    total_size: Mapped[int] = mapped_column(BigInteger, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    files: Mapped[list["DropFile"]] = relationship(
        back_populates="drop",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
        order_by="DropFile.position",
    )

    __table_args__ = (
        Index("uq_drops_name_lower", func.lower(name), unique=True),
    )


class DropFile(Base):
    __tablename__ = "drop_files"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    drop_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("drops.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(default=0)
    name: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(BigInteger)
    content_type: Mapped[str | None] = mapped_column(String(255))
    uploaded: Mapped[bool] = mapped_column(Boolean, default=False)

    drop: Mapped[Drop] = relationship(back_populates="files")
