import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path


_LOGGING_CONFIGURED = False


class DailyFileHandler(TimedRotatingFileHandler):
    """
    TimedRotatingFileHandler that names rotated files like:
    logs/app-YYYY-MM-DD.log
    while the current-day file remains logs/app.log.
    """

    def rotation_filename(self, default_name: str) -> str:  # type: ignore[override]
        # default_name is usually "<base>.YYYY-MM-DD" because suffix is "%Y-%m-%d".
        base = Path(self.baseFilename)
        prefix = base.stem  # "app" from "app.log"
        ext = base.suffix  # ".log"
        # Extract the date part from default_name (after the last dot).
        date_suffix = default_name.rsplit(".", 1)[-1]
        rotated = base.with_name(f"{prefix}-{date_suffix}{ext}")
        return str(rotated)


def setup_logging() -> None:
    """
    Configure application logging.
    Writes logs to a daily rotating file under ./logs/,
    with rotated files named logs/app-YYYY-MM-DD.log.
    """
    global _LOGGING_CONFIGURED
    if _LOGGING_CONFIGURED:
        return

    log_dir = Path("logs")
    log_dir.mkdir(parents=True, exist_ok=True)

    log_file = log_dir / "app.log"

    root_logger = logging.getLogger()
    app_logger = logging.getLogger("apiproxy")

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s - %(message)s"
    )

    # File handler: only for our application logs.
    file_handler = DailyFileHandler(
        log_file,
        when="midnight",
        interval=1,
        backupCount=7,
        encoding="utf-8",
    )
    # Use date-only suffix; DailyFileHandler will remap it to the desired pattern.
    file_handler.suffix = "%Y-%m-%d"
    file_handler.setFormatter(formatter)

    # Only application logs (logger "apiproxy") go into the daily log file.
    # Extra safety: filter by logger name in case handlers get attached higher up.
    file_handler.addFilter(lambda record: record.name.startswith("apiproxy"))
    app_logger.setLevel(logging.INFO)
    app_logger.propagate = True  # let logs also go to root/uvicorn handlers (console)
    app_logger.addHandler(file_handler)

    # Console handler: attach to root so that uvicorn/watchfiles and apiproxy
    # logs are visible in the terminal, but not written to our file.
    root_logger.setLevel(logging.INFO)
    has_console = False
    for h in root_logger.handlers:
        if isinstance(h, logging.StreamHandler) and not isinstance(
            h, logging.FileHandler
        ):
            has_console = True
            break
    if not has_console:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    _LOGGING_CONFIGURED = True


logger = logging.getLogger("apiproxy")
