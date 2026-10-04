import base64
from pathlib import Path
import tempfile
import unittest

from validate_env import REQUIRED, read_values, validate


def fixture():
    values = {name: "configured" for name in REQUIRED}
    values.update({
        "JWT_SECRET": "u" * 48, "SERVICE_JWT_SECRET": "s" * 48,
        "NACOS_AUTH_TOKEN": base64.b64encode(b"n" * 32).decode("ascii"),
        "NACOS_ADMIN_PASSWORD": "admin-password", "NACOS_PASSWORD": "discovery-password",
        "MYSQL_USER": "root", "MYSQL_PASSWORD": "database-password",
        "MYSQL_ROOT_PASSWORD": "database-password",
    })
    return values


class DeploymentEnvironmentTest(unittest.TestCase):
    def test_complete_separate_credentials_pass(self):
        validate(fixture())

    def test_missing_credentials_fail_without_printing_a_value(self):
        values = fixture()
        values.pop("SERVICE_JWT_SECRET")
        with self.assertRaisesRegex(ValueError, "Missing deployment variables: SERVICE_JWT_SECRET"):
            validate(values)

    def test_default_shared_or_short_secrets_fail(self):
        for name, value in (("JWT_SECRET", "tiny"), ("SERVICE_JWT_SECRET", "u" * 48),
                            ("NACOS_PASSWORD", "admin-password"), ("NACOS_USERNAME", "nacos"),
                            ("RABBITMQ_PASSWORD", "guest"), ("NACOS_AUTH_TOKEN", "not base64")):
            values = fixture()
            values[name] = value
            with self.subTest(name=name), self.assertRaises(ValueError):
                validate(values)

    def test_dotenv_is_parsed_without_shell_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "credentials"
            path.write_text("# comment\nA='$(never execute)' # comment\nexport B=plain # ignored\nC=\"quoted\"\n", encoding="utf-8")
            self.assertEqual({"A": "$(never execute)", "B": "plain", "C": "quoted"}, read_values(path))

    def test_duplicate_and_unclosed_values_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "credentials"
            for source in ("A=first\nA=second\n", "A='not-closed\n"):
                path.write_text(source, encoding="utf-8")
                with self.assertRaises(ValueError):
                    read_values(path)


if __name__ == "__main__":
    unittest.main()
