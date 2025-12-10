from __future__ import annotations

from pathlib import Path

from alembic.script import ScriptDirectory

from app.db.migration_runner import _build_alembic_config


def test_build_config_uses_absolute_version_locations(monkeypatch):
    project_root = Path(__file__).resolve().parents[3]
    backend_dir = project_root / "backend"

    # 模拟在仓库根目录执行 pytest / alembic 命令时的场景，
    # 若 version_locations 仍为相对路径会导致 Alembic 无法找到最新 revision。
    monkeypatch.chdir(project_root)

    cfg = _build_alembic_config(backend_dir)
    version_locations = cfg.get_main_option("version_locations")
    assert version_locations == str(backend_dir / "alembic" / "versions")

    script = ScriptDirectory.from_config(cfg)
    assert "0027_add_probe_settings" in script.get_heads()
