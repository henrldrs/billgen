import logging
import sys

import structlog


def configure_logging() -> None:
    # Windows consoles often use a legacy codepage (cp1252); a log record with
    # characters outside it (e.g. Playwright's box-drawing banners) must never
    # crash the request that emitted it.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="backslashreplace")

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.add_log_level,
            structlog.processors.KeyValueRenderer(
                key_order=["timestamp", "level", "event"]
            ),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )
