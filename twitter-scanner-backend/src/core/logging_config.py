"""Logging system configuration module - Twitter Scanner Backend"""

import os
import logging
import structlog
from logging.handlers import TimedRotatingFileHandler
from typing import Optional


def setup_logging(
    log_level: str = "INFO", environment: str = "development"
) -> structlog.stdlib.BoundLogger:
    """
    Set up logging system with daily file rotation

    Args:
        log_level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        environment: Runtime environment (development, production)

    Returns:
        Configured structlog logger instance
    """

    # Ensure logs directory exists
    logs_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "logs",
    )
    os.makedirs(logs_dir, exist_ok=True)

    # Create timed rotating file handler
    log_file_path = os.path.join(logs_dir, "twitter-scanner.log")

    # Use TimedRotatingFileHandler for daily rotation
    file_handler = TimedRotatingFileHandler(
        filename=log_file_path,
        when="midnight",  # Rotate at midnight
        interval=1,  # Every 1 day
        backupCount=30,  # Keep 30 days of logs
        encoding="utf-8",
    )

    # Set filename format to twitter-scanner.log.2024-01-01
    file_handler.suffix = "%Y-%m-%d"

    # Create console handler
    console_handler = logging.StreamHandler()

    # Set log format
    formatter = logging.Formatter(
        "%(asctime)s | %(name)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    # Configure standard library logging
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        handlers=[file_handler, console_handler],
        force=True,  # Force reconfiguration
    )

    # Configure structlog with simple format (no colors)
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            # Use simple key-value format, no colors
            structlog.processors.KeyValueRenderer(
                key_order=["timestamp", "level", "event"], drop_missing=True
            ),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Create and return logger instance
    logger = structlog.get_logger()

    # Log logging system initialization info
    logger.info(
        "Logging system initialized",
        logs_directory=logs_dir,
        log_level=log_level.upper(),
        environment=environment,
        file_rotation="daily",
        backup_count=30,
        log_file=log_file_path,
    )

    return logger


def get_logger(name: Optional[str] = None) -> structlog.stdlib.BoundLogger:
    """
    Get logger instance

    Args:
        name: Logger name, if not provided uses default name

    Returns:
        structlog logger instance
    """
    if name:
        return structlog.get_logger(name)
    else:
        return structlog.get_logger()


# Quick setup convenience function
def quick_setup(log_level: str = "INFO", environment: str = "development"):
    """
    Quick setup convenience function for logging system

    Args:
        log_level: Log level
        environment: Runtime environment
    """
    setup_logging(log_level, environment)
