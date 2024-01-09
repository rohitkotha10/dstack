import os
from pathlib import Path

from dstack import version

DSTACK_DIR_PATH = Path("~/.dstack/").expanduser()

SERVER_DIR_PATH = Path(os.getenv("DSTACK_SERVER_DIR", DSTACK_DIR_PATH / "server"))

SERVER_CONFIG_FILE_PATH = SERVER_DIR_PATH / "config.yml"

SERVER_DATA_DIR_PATH = SERVER_DIR_PATH / "data"
SERVER_DATA_DIR_PATH.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite+aiosqlite:///{str(SERVER_DATA_DIR_PATH.absolute())}/sqlite.db"


SERVER_HOST = os.getenv("DSTACK_SERVER_HOST", "localhost")
SERVER_PORT = os.getenv("DSTACK_SERVER_PORT", "8000")
SERVER_URL = os.getenv("DSTACK_SERVER_URL", f"http://{SERVER_HOST}:{SERVER_PORT}")

SERVER_ENVIRONMENT = os.getenv("DSTACK_SERVER_ENVIRONMENT", "dev")

ROOT_LOG_LEVEL = os.getenv("DSTACK_SERVER_ROOT_LOG_LEVEL", "ERROR").upper()
LOG_LEVEL = os.getenv("DSTACK_SERVER_LOG_LEVEL", "WARNING").upper()

ALEMBIC_MIGRATIONS_LOCATION = os.getenv(
    "DSTACK_ALEMBIC_MIGRATIONS_LOCATION", "dstack._internal.server:migrations"
)

SERVER_CONFIG_DISABLED = os.getenv("DSTACK_SERVER_CONFIG_DISABLED") is not None
SERVER_CONFIG_ENABLED = not SERVER_CONFIG_DISABLED
LOCAL_BACKEND_ENABLED = os.getenv("DSTACK_LOCAL_BACKEND_ENABLED") is not None

SERVER_BUCKET = os.getenv("DSTACK_SERVER_BUCKET")
SERVER_BUCKET_REGION = os.getenv("DSTACK_SERVER_BUCKET_REGION", "eu-west-1")

DEFAULT_PROJECT_NAME = "main"

DSTACK_UPDATE_DEFAULT_PROJECT = os.getenv("DSTACK_UPDATE_DEFAULT_PROJECT", "false") is True
DSTACK_DO_NOT_UPDATE_DEFAULT_PROJECT = (
    os.getenv("DSTACK_DO_NOT_UPDATE_DEFAULT_PROJECT", "false") is True
)

SENTRY_DSN = os.getenv("DSTACK_SENTRY_DSN")
SENTRY_TRACES_SAMPLE_RATE = float(os.getenv("DSTACK_SENTRY_TRACES_SAMPLE_RATE", 0.1))


DEFAULT_CREDS_DISABLED = os.getenv("DSTACK_DEFAULT_CREDS_DISABLED") is not None
DEFAULT_CREDS_ENABLED = not DEFAULT_CREDS_DISABLED
