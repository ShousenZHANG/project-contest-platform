import contextlib
import io
import unittest
from urllib.error import HTTPError
from unittest.mock import patch

from bootstrap import BootstrapError, Nacos, provision


class FakeNacos:
    def __init__(self, existing=False):
        self.calls = []
        self.users = [{"username": "competition-platform"}] if existing else []
        self.roles = [{"role": "competition-platform-discovery"}] if existing else []
        self.permissions = [{"resource": "public:*", "action": "rw"}] if existing else []
        self.bad_login = None

    def call(self, method, route, fields=None, token=None):
        self.calls.append((method, route, fields, token))

    def login(self, username, password):
        self.calls.append(("LOGIN", username, None, None))
        if username == self.bad_login:
            raise BootstrapError("Credentials do not match.")
        return "token-for-" + username

    def rows(self, route, fields, token):
        self.calls.append(("GET", route, fields, token))
        return {"user/list": self.users, "role/list": self.roles, "permission/list": self.permissions}[route]


class BootstrapTest(unittest.TestCase):
    def run_provision(self, api):
        with contextlib.redirect_stdout(io.StringIO()):
            provision(api, "admin-secret", "competition-platform", "service-secret")

    def test_fresh_volume_creates_namespace_scoped_account(self):
        api = FakeNacos()
        self.run_provision(api)
        writes = [(route, fields) for method, route, fields, _ in api.calls if method == "POST"]
        self.assertEqual([route for route, _ in writes], ["user/admin", "user", "role", "permission"])
        self.assertEqual(writes[-1][1], {"role": "competition-platform-discovery", "resource": "public:*", "action": "rw"})
        self.assertTrue(all(method != "PUT" for method, *_ in api.calls))

    def test_existing_account_is_idempotent_and_never_resets_passwords(self):
        api = FakeNacos(existing=True)
        self.run_provision(api)
        self.assertEqual([route for method, route, *_ in api.calls if method == "POST"], ["user/admin"])
        self.assertTrue(all(method != "PUT" for method, *_ in api.calls))

    def test_wrong_existing_admin_password_stops_before_account_writes(self):
        api = FakeNacos(existing=True); api.bad_login = "nacos"
        with self.assertRaises(BootstrapError): self.run_provision(api)
        self.assertFalse(any(route in ("user", "role", "permission") for _, route, *_ in api.calls))

    def test_wrong_existing_service_password_stops_before_permissions_change(self):
        api = FakeNacos(existing=True); api.bad_login = "competition-platform"
        with self.assertRaises(BootstrapError): self.run_provision(api)
        self.assertFalse(any(route in ("role", "permission") for _, route, *_ in api.calls))

    def test_admin_role_or_foreign_namespace_permission_is_rejected(self):
        api = FakeNacos(existing=True); api.roles = [{"role": "ROLE_ADMIN"}]
        with self.assertRaises(BootstrapError): self.run_provision(api)
        api = FakeNacos(existing=True); api.permissions = [{"resource": "*:*", "action": "rw"}]
        with self.assertRaises(BootstrapError): self.run_provision(api)

    def test_separate_credentials_and_nonadmin_service_identity_are_required(self):
        for username, password in [("nacos", "different"), ("competition-platform", "admin-secret"), ("invalid space", "different")]:
            api = FakeNacos()
            with self.assertRaises(BootstrapError): provision(api, "admin-secret", username, password)
            self.assertEqual(api.calls, [])

    @patch("bootstrap.urlopen")
    def test_protocol_uses_server_8848_auth_header_and_wrapped_json(self, request):
        request.return_value.__enter__.return_value = io.StringIO('{"code":0,"data":{"pageItems":[]}}')
        api = Nacos("http://nacos:8848")
        self.assertEqual(api.rows("user/list", {"username": "safe-account"}, "private-token"), [])
        outgoing = request.call_args.args[0]
        self.assertTrue(outgoing.full_url.startswith("http://nacos:8848/nacos/v3/auth/user/list?"))
        self.assertNotIn("private-token", outgoing.full_url)
        self.assertEqual(outgoing.get_header("Accesstoken"), "private-token")

    @patch("bootstrap.urlopen")
    def test_http_error_does_not_print_response_secrets(self, request):
        request.side_effect = HTTPError("http://nacos:8848", 403, "secret-response", {}, None)
        with self.assertRaisesRegex(BootstrapError, r"HTTP 403") as error:
            Nacos("http://nacos:8848").call("POST", "user/login", {"password": "private-password"})
        self.assertNotIn("secret-response", str(error.exception))
        self.assertNotIn("private-password", str(error.exception))


if __name__ == "__main__": unittest.main()
