from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


def make_session_factory(engine: Engine) -> sessionmaker[Session]:
    # expire_on_commit=False: repositories return detached-safe Pydantic models,
    # and the UoW closes the session right after commit.
    return sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
