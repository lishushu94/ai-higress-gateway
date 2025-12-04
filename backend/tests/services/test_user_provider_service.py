from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base
from app.schemas.provider_control import UserProviderCreateRequest
from app.services.user_provider_service import create_private_provider
from tests.utils import seed_user_and_key


def _session_factory() -> tuple[object, sessionmaker[Session]]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return engine, SessionLocal


def test_create_private_provider_generates_id() -> None:
    engine, SessionLocal = _session_factory()
    try:
        with SessionLocal() as session:
            user, _ = seed_user_and_key(session, token_plain="seed")

        with SessionLocal() as session:
            payload = UserProviderCreateRequest(
                name="OpenAI 生产环境",
                base_url="https://api.openai.com/v1",
                api_key="sk-test",
            )
            provider = create_private_provider(session, user.id, payload)
            assert provider.provider_id
            assert provider.provider_id.startswith("openai")
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_duplicate_names_generate_unique_provider_ids() -> None:
    engine, SessionLocal = _session_factory()
    try:
        with SessionLocal() as session:
            user, _ = seed_user_and_key(session, token_plain="seed")

        payload_data = {
            "name": "Aggregator",
            "base_url": "https://upstream.example.com/api",
            "api_key": "sk-test",
        }

        with SessionLocal() as session:
            provider_a = create_private_provider(
                session, user.id, UserProviderCreateRequest(**payload_data)
            )

        with SessionLocal() as session:
            provider_b = create_private_provider(
                session, user.id, UserProviderCreateRequest(**payload_data)
            )

        assert provider_a.provider_id != provider_b.provider_id
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
