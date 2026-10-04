import base64
from pathlib import Path
import tempfile
import unittest

from run import BACKENDS, bootstrap_command, compose_command, environment_values, prepare_environment, require_backend_jars, runtime_environment


class RuntimePreparationTest(unittest.TestCase):
    def test_independent_secrets_and_matching_database_credentials(self):
        values = environment_values()
        self.assertEqual(values["MYSQL_ROOT_PASSWORD"], values["MYSQL_PASSWORD"])
        self.assertEqual(32, len(base64.b64decode(values["NACOS_AUTH_TOKEN"])))
        secret_names = (
            "JWT_SECRET", "SERVICE_JWT_SECRET", "NACOS_ADMIN_PASSWORD", "NACOS_PASSWORD",
            "RABBITMQ_PASSWORD", "MINIO_ROOT_PASSWORD", "ADMIN_BOOTSTRAP_PASSWORD",
        )
        self.assertEqual(len(secret_names), len({values[name] for name in secret_names}))
        self.assertEqual("false", values["MAIL_AUTH"])
        self.assertEqual("mailpit", values["MAIL_HOST"])

    def test_existing_credentials_and_real_env_are_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".git").mkdir()
            real_env = root / ".env"
            real_env.write_text("do-not-touch", encoding="utf-8")
            target = root / ".git" / "runtime-tests.env"
            prepare_environment(root, target)
            original = target.read_bytes()
            prepare_environment(root, target)
            self.assertEqual(original, target.read_bytes())
            self.assertEqual("do-not-touch", real_env.read_text(encoding="utf-8"))

    def test_secrets_outside_git_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".git").mkdir()
            with self.assertRaises(ValueError):
                prepare_environment(root, root / ".env")
            self.assertFalse((root / ".env").exists())

    def test_explicit_compose_env_and_project_for_every_action(self):
        for action in ("config", "infra", "backend", "all"):
            command = compose_command(Path("checkout"), Path("checkout/.git/runtime-tests.env"), action)
            self.assertEqual("--env-file", command[2])
            self.assertEqual("runtime-tests", command[5])
            self.assertTrue(any(str(item).endswith("docker-compose.integration.yml") for item in command))
            self.assertNotIn("down", command)
        self.assertEqual(["config", "--quiet"], compose_command("checkout", "env", "config")[-2:])

    def test_backend_requires_all_runtime_jars_without_building_them(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaisesRegex(ValueError, "verified JDK 25"):
                require_backend_jars(root)
            for name in BACKENDS:
                jar = root / "backend" / name / "target" / f"{name}-0.0.1-SNAPSHOT.jar"
                jar.parent.mkdir(parents=True)
                jar.touch()
            require_backend_jars(root)

    def test_bootstrap_arguments_do_not_contain_credential_values(self):
        command = bootstrap_command("checkout", "checkout/.git/runtime-tests.env")
        self.assertIn("ADMIN_BOOTSTRAP_PASSWORD", command)
        self.assertIn("org.springframework.boot.loader.launch.PropertiesLauncher", command)
        self.assertNotIn("down", command)
        self.assertFalse(any("=" in part for part in command if not part.startswith("-Dloader.main=")))

    def test_generated_values_are_loaded_only_into_child_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "runtime-tests.env"
            path.write_text("# task file\nEXAMPLE=literal=with=equals\n", encoding="utf-8")
            self.assertEqual("literal=with=equals", runtime_environment(path)["EXAMPLE"])


if __name__ == "__main__":
    unittest.main()
