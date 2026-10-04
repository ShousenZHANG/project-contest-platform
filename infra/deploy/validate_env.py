"""Validate required deployment credentials without executing or printing them."""

import base64
import binascii
from pathlib import Path
import re
import sys


REQUIRED = (
    "MYSQL_ROOT_PASSWORD", "MYSQL_USER", "MYSQL_PASSWORD",
    "RABBITMQ_USER", "RABBITMQ_PASSWORD", "MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD",
    "JWT_SECRET", "SERVICE_JWT_SECRET", "NACOS_AUTH_TOKEN", "NACOS_AUTH_IDENTITY_KEY",
    "NACOS_AUTH_IDENTITY_VALUE", "NACOS_ADMIN_PASSWORD", "NACOS_USERNAME", "NACOS_PASSWORD",
    "CORS_ALLOWED_ORIGINS", "OAUTH_REDIRECT_BASE_URL", "FRONTEND_BASE_URL",
    "MINIO_PUBLIC_ENDPOINT", "VITE_API_BASE_URL",
)


def read_values(path):
    values = {}
    for line in Path(path).read_text(encoding="utf-8-sig").splitlines():
        match = re.match(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$", line)
        if not match:
            continue
        name, value = match.groups()
        value = value.strip()
        if value.startswith(("'", '"')):
            closing = value.rfind(value[0])
            trailing = value[closing + 1:].strip()
            if closing <= 0 or trailing and not trailing.startswith("#"):
                raise ValueError(f"Invalid quoted environment value: {name}")
            value = value[1:closing]
        else:
            value = re.split(r"\s+#", value, maxsplit=1)[0].rstrip()
        if name in values:
            raise ValueError(f"Duplicate environment variable: {name}")
        values[name] = value
    return values


def validate(values):
    missing = [name for name in REQUIRED if not values.get(name, "").strip()]
    if missing:
        raise ValueError("Missing deployment variables: " + ", ".join(missing))
    for name in ("JWT_SECRET", "SERVICE_JWT_SECRET"):
        if len(values[name].encode("utf-8")) < 32:
            raise ValueError(f"{name} must contain at least 32 bytes")
        if values[name].startswith("dev_"):
            raise ValueError(f"Replace the development value of {name}")
    if values["JWT_SECRET"] == values["SERVICE_JWT_SECRET"]:
        raise ValueError("User and service JWT secrets must be independent")
    try:
        signing_key = base64.b64decode(values["NACOS_AUTH_TOKEN"], validate=True)
    except (ValueError, binascii.Error):
        raise ValueError("NACOS_AUTH_TOKEN must be Base64 encoded") from None
    if len(signing_key) < 32:
        raise ValueError("NACOS_AUTH_TOKEN must encode at least 32 bytes")
    if values["NACOS_USERNAME"] == "nacos" or values["NACOS_ADMIN_PASSWORD"] == values["NACOS_PASSWORD"]:
        raise ValueError("Use separate Nacos administrator and discovery credentials")
    if values["MYSQL_USER"] == "root" and values["MYSQL_PASSWORD"] != values["MYSQL_ROOT_PASSWORD"]:
        raise ValueError("Root MySQL credentials must match the initialized database")
    defaults = {
        "MYSQL_ROOT_PASSWORD": "root", "MYSQL_PASSWORD": "root",
        "RABBITMQ_PASSWORD": "guest", "MINIO_ROOT_PASSWORD": "minio123",
    }
    for name, default in defaults.items():
        if values[name] == default:
            raise ValueError(f"Replace the development value of {name}")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: validate_env.py <Jenkins Secret File environment>")
    try:
        validate(read_values(sys.argv[1]))
    except (ValueError, OSError) as error:
        # Validation errors contain variable names only, never their values.
        raise SystemExit(str(error)) from None
    print("Deployment environment passed credential checks.")


if __name__ == "__main__":
    main()
