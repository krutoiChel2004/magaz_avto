from __future__ import annotations

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mcm_api.api.routes import admin, auth, catalog, orders
from mcm_api.core.config import settings
from mcm_api.services.storage import storage

app = FastAPI(
    title="MCM Auto Store API",
    description="API дипломного интернет-магазина ООО «Малые строительные машины»",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(orders.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)


@app.on_event("startup")
async def on_startup() -> None:
    if storage.enabled:
        await storage.ensure_bucket()


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "MCM Auto Store API"}


def run() -> None:
    uvicorn.run("mcm_api.main:app", host="0.0.0.0", port=8000, reload=True)
