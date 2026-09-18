import base64
import hashlib
import hmac
import secrets
import time

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

from app.core.config import settings

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerificationError:
        return False


def generate_secret() -> str:
    return secrets.token_urlsafe(32)


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _sign(payload: str) -> str:
    digest = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def create_access_token(subject: str, ttl_seconds: int) -> str:
    payload = f"{subject}.{int(time.time()) + ttl_seconds}"
    return f"{payload}.{_sign(payload)}"


def verify_access_token(token: str, subject: str) -> bool:
    try:
        token_subject, expires, signature = token.rsplit(".", 2)
        expires_at = int(expires)
    except ValueError:
        return False
    payload = f"{token_subject}.{expires}"
    return (
        token_subject == subject
        and expires_at > time.time()
        and hmac.compare_digest(signature, _sign(payload))
    )
