from fastapi import APIRouter, Request
from sqlalchemy import text

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@router.get("/readyz")
def readyz(request: Request) -> dict:
    session_factory = request.app.state.session_factory
    with session_factory() as session:
        session.execute(text("SELECT 1"))
    return {"status": "ready"}
