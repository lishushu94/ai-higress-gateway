from __future__ import annotations

import datetime as dt

from celery import shared_task

from app.celery_app import celery_app
from app.db import SessionLocal
from app.metrics.offline_recalc import OfflineMetricsRecalculator
from app.settings import settings


def _now_utc_minute() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(second=0, microsecond=0)


def _build_recalculator() -> OfflineMetricsRecalculator:
    return OfflineMetricsRecalculator(
        diff_threshold=settings.offline_metrics_diff_threshold,
        source_version=settings.offline_metrics_source_version,
        min_total_requests=settings.offline_metrics_min_total_requests,
    )


@shared_task(name="tasks.metrics.offline_recalc_recent")
def recalc_recent_metrics(hours: int | None = None) -> int:
    """Recompute aggregate metrics for the recent lookback window."""

    session = SessionLocal()
    try:
        end = _now_utc_minute()
        lookback = hours or settings.offline_metrics_lookback_hours
        start = end - dt.timedelta(hours=lookback)

        total_written = 0
        for window in settings.offline_metrics_windows:
            recalculator = _build_recalculator()
            total_written += recalculator.recalculate_and_persist(
                session,
                start=start,
                end=end,
                window_seconds=window,
            )

        session.commit()
        return total_written
    finally:
        session.close()


celery_app.conf.beat_schedule = getattr(celery_app.conf, "beat_schedule", {}) or {}
celery_app.conf.beat_schedule.update(
    {
        "offline-metrics-recalc": {
            "task": "tasks.metrics.offline_recalc_recent",
            "schedule": settings.offline_metrics_interval_seconds,
        }
    }
)


__all__ = ["recalc_recent_metrics"]
