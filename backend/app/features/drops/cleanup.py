import asyncio
import logging

from app.core.config import settings
from app.core.database import SessionFactory
from app.core.storage import storage
from app.features.drops.service import DropService

logger = logging.getLogger(__name__)


async def run_cleanup_loop() -> None:
    """Periodically removes expired and consumed drops together with their files."""
    while True:
        try:
            async with SessionFactory() as session:
                removed = await DropService(session, storage).purge_expired()
            if removed:
                logger.info("Removed %d expired drops", removed)
        except Exception:
            logger.exception("Cleanup iteration failed")
        await asyncio.sleep(settings.cleanup_interval_seconds)
