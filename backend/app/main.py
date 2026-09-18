import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine
from app.features.drops.cleanup import run_cleanup_loop
from app.features.drops.router import router as drops_router
from app.features.health.router import router as health_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    cleanup = asyncio.create_task(run_cleanup_loop())
    yield
    cleanup.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await cleanup
    await engine.dispose()


app = FastAPI(
    title="Nurl API",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

api = APIRouter(prefix="/api")
api.include_router(health_router)
api.include_router(drops_router)
app.include_router(api)
