"""Prepare an isolated runtime stack without loading the checkout's .env.

The generated secrets stay under .git and remain stable between runs. No action
removes containers or volumes. Maven builds and API acceptance are separate gates.
"""

import argparse
import base64
import os
from pathlib import Path
import secrets
import subprocess


PROJECT_NAME = "runtime-tests"
BACKENDS = (
    "api-gateway", "user-service", "competition-service", "file-service",
    "registration-service", "interaction-service", "judge-service",
)
INFRASTRUCTURE = (
    "mysql", "database-migrations", "redis", "rabbitmq", "nacos",
    "nacos-bootstrap", "minio", "zipkin", "mailpit",
)


def environment_values():
    database_password = secrets.token_hex(24)
    return {
        "MYSQL_ROOT_PASSWORD": database_password,
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": database_password,
        "RABBITMQ_USER": "runtime-user",
        "RABBITMQ_PASSWORD": secrets.token_hex(24),
        "MINIO_ROOT_USER": "runtime-user",
        "MINIO_ROOT_PASSWORD": secrets.token_hex(24),
        "MINIO_ENDPOINT": "http://minio:9000",
        "MINIO_REGION": "",
        "JWT_SECRET": secrets.token_hex(32),
        "SERVICE_JWT_SECRET": secrets.token_hex(32),
        "NACOS_AUTH_TOKEN": base64.b64encode(secrets.token_bytes(32)).decode("ascii"),
        "NACOS_AUTH_IDENTITY_KEY": "runtime-platform-node",
        "NACOS_AUTH_IDENTITY_VALUE": secrets.token_hex(24),
        "NACOS_ADMIN_PASSWORD": secrets.token_hex(24),
        "NACOS_USERNAME": "competition-platform",
        "NACOS_PASSWORD": secrets.token_hex(24),
        "CORS_ALLOWED_ORIGINS": "http://localhost:3000",
        "OAUTH_REDIRECT_BASE_URL": "http://localhost:8080",
        "FRONTEND_BASE_URL": "http://localhost:3000",
        "MINIO_PUBLIC_ENDPOINT": "http://localhost:9000",
        "VITE_API_BASE_URL": "http://localhost:8080",
        "GOOGLE_CLIENT_ID": "",
        "GOOGLE_CLIENT_SECRET": "",
        "GITHUB_CLIENT_ID": "",
        "GITHUB_CLIENT_SECRET": "",
        "MAIL_HOST": "mailpit",
        "MAIL_PORT": "1025",
        "MAIL_AUTH": "false",
        "MAIL_STARTTLS_ENABLE": "false",
        "MAIL_USERNAME": "noreply@competition.test",
        "MAIL_PASSWORD": "",
        "ADMIN_BOOTSTRAP_EMAIL": "admin@competition.test",
        "ADMIN_BOOTSTRAP_PASSWORD": secrets.token_hex(24),
        "MIGRATION_DATABASE_URL": (
            "jdbc:mysql://localhost:3306/project_contest_platform"
            "?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=UTC"
        ),
    }


def prepare_environment(root, env_path):
    root = Path(root).resolve()
    git_directory = (root / ".git").resolve()
    target = Path(env_path).resolve()
    if not git_directory.is_dir() or not target.is_relative_to(git_directory):
        raise ValueError("Runtime secrets must be stored inside this checkout's .git directory")
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with target.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write("# Isolated runtime-tests credentials; never commit or publish.\n")
            for name, value in environment_values().items():
                stream.write(f"{name}={value}\n")
        target.chmod(0o600)
    except FileExistsError:
        # Existing Nacos/MySQL volumes retain these credentials. Never rotate
        # them implicitly or read the real checkout .env as a fallback.
        if not target.is_file() or target.stat().st_size == 0:
            raise ValueError("Existing runtime environment must be a nonempty regular file")
    return target


def compose_command(root, env_path, action):
    command = compose_prefix(root, env_path)
    if action == "config":
        return command + ["config", "--quiet"]
    services = {
        "infra": INFRASTRUCTURE,
        "backend": tuple(f"backend-{name}" for name in BACKENDS),
        "all": tuple(f"backend-{name}" for name in BACKENDS) + ("frontend-web",),
    }[action]
    return command + ["up", "-d", "--wait", "--wait-timeout", "600", "--build", *services]


def compose_prefix(root, env_path):
    return [
        "docker", "compose", "--env-file", str(env_path), "-p", PROJECT_NAME,
        "-f", str(Path(root) / "docker-compose.yml"),
        "-f", str(Path(root) / "docker-compose.integration.yml"),
    ]


def runtime_environment(path):
    # Only the generated task environment is accepted by prepare_environment.
    # It contains single-line literal values; never source a shell or a real .env.
    values = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#"):
            name, value = line.split("=", 1)
            values[name] = value
    # New aliases also apply to already generated task files, without rotating
    # storage credentials or accepting unrelated host S3 credentials.
    values.setdefault("MINIO_ENDPOINT", "http://minio:9000")
    values.setdefault("MINIO_ACCESS_KEY", values.get("MINIO_ROOT_USER", ""))
    values.setdefault("MINIO_SECRET_KEY", values.get("MINIO_ROOT_PASSWORD", ""))
    values.setdefault("MINIO_REGION", "")
    values["COMPOSE_PROFILES"] = ""
    values["COMPOSE_DISABLE_ENV_FILE"] = "1"
    return {**os.environ, **values}


def bootstrap_command(root, env_path):
    command = compose_prefix(root, env_path) + ["exec", "-T"]
    for name in (
        "ADMIN_BOOTSTRAP_EMAIL", "ADMIN_BOOTSTRAP_PASSWORD", "MYSQL_USER",
        "MYSQL_PASSWORD", "MIGRATION_DATABASE_URL",
    ):
        command += ["-e", name]
    return command + [
        "backend-user-service", "java",
        "-Dloader.main=com.w16a.danish.user.bootstrap.AdminBootstrap",
        "-cp", "/app/application.jar", "org.springframework.boot.loader.launch.PropertiesLauncher",
    ]


def require_backend_jars(root):
    missing = [
        str(Path("backend") / name / "target" / f"{name}-0.0.1-SNAPSHOT.jar")
        for name in BACKENDS
        if not (Path(root) / "backend" / name / "target" / f"{name}-0.0.1-SNAPSHOT.jar").is_file()
    ]
    if missing:
        raise ValueError("Build the verified JDK 25 Maven reactor first; missing: " + ", ".join(missing))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("prepare", "config", "infra", "backend", "all", "bootstrap", "smoke"))
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--node", default="node", help="Node 24 executable for the API smoke test")
    arguments = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    env_path = prepare_environment(root, arguments.env_file or root / ".git" / "runtime-tests.env")
    if arguments.action == "prepare":
        print(f"Runtime environment ready: {env_path}")
        return
    if arguments.action in ("backend", "all"):
        require_backend_jars(root)
    if arguments.action == "bootstrap":
        environment = runtime_environment(env_path)
        environment["MIGRATION_DATABASE_URL"] = (
            "jdbc:mysql://mysql:3306/project_contest_platform"
            "?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=UTC"
        )
        subprocess.run(bootstrap_command(root, env_path), cwd=root, env=environment, check=True)
        return
    if arguments.action == "smoke":
        environment = runtime_environment(env_path)
        environment["API_BASE_URL"] = "http://localhost:8080"
        environment["INTEGRATION_ADMIN_EMAIL"] = environment["ADMIN_BOOTSTRAP_EMAIL"]
        environment["INTEGRATION_ADMIN_PASSWORD"] = environment["ADMIN_BOOTSTRAP_PASSWORD"]
        subprocess.run([arguments.node, str(root / "scripts" / "integration-smoke.mjs")],
                       cwd=root, env=environment, check=True)
        return
    subprocess.run(compose_command(root, env_path, arguments.action), cwd=root,
                   env=runtime_environment(env_path), check=True)


if __name__ == "__main__":
    main()
