"""Provision one namespace-scoped discovery account without resetting existing credentials."""
import json
import os
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class BootstrapError(RuntimeError):
    pass


class Nacos:
    def __init__(self, address):
        self.base = address.rstrip("/") + "/nacos/v3/auth/"

    def call(self, method, route, fields=None, token=None):
        fields = fields or {}
        url = self.base + route
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        if token:
            headers["accessToken"] = token
        data = None
        if method == "GET":
            url += "?" + urlencode(fields)
        else:
            data = urlencode(fields).encode()
        try:
            with urlopen(Request(url, data=data, headers=headers, method=method), timeout=10) as response:
                payload = json.load(response)
        except HTTPError as error:
            if route == "user/admin" and error.code == 409:
                return None
            raise BootstrapError(f"Nacos {method} {route} failed (HTTP {error.code}).") from None
        except (URLError, ValueError):
            raise BootstrapError(f"Nacos {method} {route} returned no valid response.") from None
        if isinstance(payload, dict):
            code = payload.get("code", 200)
            if code not in (0, 200):
                # The admin initializer is intentionally unavailable after the first use.
                if route == "user/admin" and code == 409:
                    return None
                raise BootstrapError(f"Nacos {method} {route} failed (code {code}).")
            return payload.get("data", payload)
        return payload

    def login(self, username, password):
        result = self.call("POST", "user/login", {"username": username, "password": password})
        token = result.get("accessToken") if isinstance(result, dict) else None
        if not token:
            raise BootstrapError("Nacos credentials do not match the existing account; no passwords were changed.")
        return token

    def rows(self, route, fields, token):
        result = self.call("GET", route, dict(fields, search="accurate", pageNo=1, pageSize=100), token)
        if not isinstance(result, dict) or not isinstance(result.get("pageItems"), list):
            raise BootstrapError(f"Nacos {route} returned an unexpected page.")
        if result.get("totalCount", len(result["pageItems"])) > 100:
            raise BootstrapError(f"Nacos {route} needs manual reconciliation before bootstrap.")
        return result["pageItems"]


def provision(api, admin_password, username, password, namespace="public"):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", username) or username == "nacos":
        raise BootstrapError("NACOS_USERNAME must name a dedicated service account, not nacos.")
    if namespace != "public":
        raise BootstrapError("This deployment provisions only the public namespace.")
    if not admin_password or not password or admin_password == password:
        raise BootstrapError("Set separate nonempty NACOS_ADMIN_PASSWORD and NACOS_PASSWORD values.")
    api.call("POST", "user/admin", {"password": admin_password})
    admin_token = api.login("nacos", admin_password)
    users = api.rows("user/list", {"username": username}, admin_token)
    if not any(user.get("username") == username for user in users):
        api.call("POST", "user", {"username": username, "password": password}, admin_token)
    # Check existing credentials before changing any role or permission.
    api.login(username, password)
    role = "competition-platform-discovery"
    roles = api.rows("role/list", {"username": username}, admin_token)
    if any(item.get("role") != role for item in roles):
        raise BootstrapError("Discovery account has unexpected roles; reconcile it manually.")
    if not roles:
        api.call("POST", "role", {"role": role, "username": username}, admin_token)
    permissions = api.rows("permission/list", {"role": role}, admin_token)
    expected = {"resource": "public:*", "action": "rw"}
    if any(item.get("resource") != expected["resource"] or item.get("action") != expected["action"] for item in permissions):
        raise BootstrapError("Discovery role has unexpected permissions; reconcile it manually.")
    if not permissions:
        api.call("POST", "permission", dict(expected, role=role), admin_token)
    print("Nacos discovery account ready.")


if __name__ == "__main__":
    try:
        provision(Nacos(os.environ.get("NACOS_SERVER_URL", "http://nacos:8848")),
                  os.environ.get("NACOS_ADMIN_PASSWORD", ""),
                  os.environ.get("NACOS_USERNAME", "competition-platform"),
                  os.environ.get("NACOS_PASSWORD", ""))
    except BootstrapError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
