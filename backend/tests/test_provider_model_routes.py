from __future__ import annotations

from urllib.parse import quote

from sqlalchemy import select

from app.models import Provider, ProviderModel
from tests.utils import jwt_auth_headers, seed_user_and_key


def _create_admin(session):
    admin, _ = seed_user_and_key(
        session,
        token_plain="model-admin-token",
        username="model-admin",
        email="model-admin@example.com",
        is_superuser=True,
    )
    return admin


def _create_provider(session, provider_slug: str) -> Provider:
    provider = Provider(
        provider_id=provider_slug,
        name=f"Provider {provider_slug}",
        base_url="https://models.example.com",
        provider_type="native",
        transport="http",
        visibility="public",
    )
    session.add(provider)
    session.commit()
    session.refresh(provider)
    return provider


def test_admin_get_pricing_accepts_slash_model_id(client, db_session):
    admin = _create_admin(db_session)
    provider = _create_provider(db_session, "provider-pricing-slash")

    headers = jwt_auth_headers(str(admin.id))
    model_id = "provider-1/qwen3-32b"
    encoded_model_id = quote(model_id, safe="")

    resp = client.get(
        f"/admin/providers/{provider.provider_id}/models/{encoded_model_id}/pricing",
        headers=headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["provider_id"] == provider.provider_id
    assert data["model_id"] == model_id
    assert data["pricing"] is None


def test_admin_update_pricing_accepts_slash_model_id(client, db_session):
    admin = _create_admin(db_session)
    provider = _create_provider(db_session, "provider-pricing-update-slash")

    headers = jwt_auth_headers(str(admin.id))
    model_id = "provider-2/qwen3-32b"
    encoded_model_id = quote(model_id, safe="")

    resp = client.put(
        f"/admin/providers/{provider.provider_id}/models/{encoded_model_id}/pricing",
        headers=headers,
        json={"input": 1.5, "output": 3.0},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["model_id"] == model_id
    assert data["pricing"] == {"input": 1.5, "output": 3.0}

    model_row = (
        db_session.execute(
            select(ProviderModel).where(
                ProviderModel.provider_id == provider.id,
                ProviderModel.model_id == model_id,
            )
        )
        .scalars()
        .first()
    )
    assert model_row is not None
    assert model_row.pricing == {"input": 1.5, "output": 3.0}


def test_get_provider_model_mapping_accepts_slash_model_id(client, db_session):
    admin = _create_admin(db_session)
    provider = _create_provider(db_session, "provider-mapping-slash")

    model_id = "provider-3/qwen3-72b"
    model = ProviderModel(
        provider_id=provider.id,
        model_id=model_id,
        alias="qwen3-72b",
        family="qwen",
        display_name="qwen3-72b",
        context_length=8192,
        capabilities=["chat"],
        pricing=None,
        metadata_json=None,
        meta_hash=None,
    )
    db_session.add(model)
    db_session.commit()

    headers = jwt_auth_headers(str(admin.id))
    encoded_model_id = quote(model_id, safe="")
    resp = client.get(
        f"/providers/{provider.provider_id}/models/{encoded_model_id}/mapping",
        headers=headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["model_id"] == model_id
    assert data["alias"] == "qwen3-72b"


def test_update_provider_model_mapping_accepts_slash_model_id(client, db_session):
    admin = _create_admin(db_session)
    provider = _create_provider(db_session, "provider-mapping-update-slash")

    headers = jwt_auth_headers(str(admin.id))
    model_id = "provider-4/qwen3-120b"
    encoded_model_id = quote(model_id, safe="")

    resp = client.put(
        f"/providers/{provider.provider_id}/models/{encoded_model_id}/mapping",
        headers=headers,
        json={"alias": "qwen3-120b"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["model_id"] == model_id
    assert data["alias"] == "qwen3-120b"

    model_row = (
        db_session.execute(
            select(ProviderModel).where(
                ProviderModel.provider_id == provider.id,
                ProviderModel.model_id == model_id,
            )
        )
        .scalars()
        .first()
    )
    assert model_row is not None
    assert model_row.alias == "qwen3-120b"
