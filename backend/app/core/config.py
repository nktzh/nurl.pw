from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://nurl:nurl@localhost:5432/nurl"
    secret_key: str = "change-me"
    storage_dir: Path = Path("./data/uploads")
    # Total disk budget for all active drops, 0 = unlimited.
    storage_quota_gb: float = 0
    max_files_per_drop: int = 500
    access_token_ttl_seconds: int = 3600
    cleanup_interval_seconds: int = 60
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
