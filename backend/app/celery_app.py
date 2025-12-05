from __future__ import annotations

"""
Celery 应用实例。

该模块集中管理 Celery 配置，供 worker / beat 进程复用。
默认使用 Redis 作为 broker 和 result backend，具体连接信息通过 .env 中的
CELERY_BROKER_URL / CELERY_RESULT_BACKEND 进行配置。

使用方式（在 backend 目录下）::

    # 启动 worker
    celery -A app.celery_app.celery_app worker -l info

    # 启动 beat（如需定时任务）
    celery -A app.celery_app.celery_app beat -l info
"""

from celery import Celery

from app.settings import settings


celery_app = Celery(
    "apiproxy",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_default_queue=settings.celery_task_default_queue,
    timezone=settings.celery_timezone,
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
)

# 自动发现 app 包下的 tasks 模块（即 app.tasks）。
celery_app.autodiscover_tasks(["app"])


__all__ = ["celery_app"]
