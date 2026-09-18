import re
from datetime import timedelta
from enum import StrEnum

GB = 1024**3


class AccessType(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"
    ONE_TIME = "one_time"


class DropStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"
    CONSUMED = "consumed"


class Retention(StrEnum):
    HOUR = "1h"
    HALF_DAY = "12h"
    DAY = "1d"
    THREE_DAYS = "3d"


# Storage time is inversely proportional to the allowed size.
RETENTION_RULES: dict[Retention, tuple[timedelta, int]] = {
    Retention.HOUR: (timedelta(hours=1), 16 * GB),
    Retention.HALF_DAY: (timedelta(hours=12), 8 * GB),
    Retention.DAY: (timedelta(days=1), 4 * GB),
    Retention.THREE_DAYS: (timedelta(days=3), 2 * GB),
}

CODE_LENGTH = 6
# Case-sensitive, without look-alike characters (0/O/o, 1/I/l).
CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
NAME_RE = re.compile(r"^[A-Za-z0-9_-]{3,32}$")
PASSWORD_MIN_LENGTH = 4
PASSWORD_MAX_LENGTH = 128

# How long a consumed one-time drop may linger before the cleanup job removes it.
CONSUMED_GRACE = timedelta(hours=6)
