package com.w16a.danish.user.bootstrap;

import cn.hutool.crypto.digest.BCrypt;
import java.sql.DriverManager;
import java.util.UUID;

/** Explicit one-time CLI; no default administrator is shipped or created during application boot. */
public final class AdminBootstrap {
    private AdminBootstrap() {}
    public static void main(String[] ignored) throws Exception {
        String email = required("ADMIN_BOOTSTRAP_EMAIL");
        String password = required("ADMIN_BOOTSTRAP_PASSWORD");
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || email.length() > 100 || password.length() < 16 ||
                password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Provide a valid email and a 16+ character password of at most 72 UTF-8 bytes");
        }
        try (var database = DriverManager.getConnection(required("MIGRATION_DATABASE_URL"), required("MYSQL_USER"), required("MYSQL_PASSWORD"))) {
            database.setAutoCommit(false);
            try {
                String role;
                try (var statement = database.prepareStatement("SELECT id FROM roles WHERE name='Admin' FOR UPDATE"); var result = statement.executeQuery()) {
                    if (!result.next()) throw new IllegalStateException("Migrate the schema before creating an administrator");
                    role = result.getString(1);
                }
                try (var statement = database.prepareStatement("SELECT COUNT(*) FROM user_roles WHERE role_id=?")) {
                    statement.setString(1, role);
                    try (var result = statement.executeQuery()) {
                        result.next();
                        if (result.getLong(1) != 0) throw new IllegalStateException("An administrator already exists; use authenticated account management");
                    }
                }
                String id = UUID.randomUUID().toString();
                try (var statement = database.prepareStatement("INSERT INTO users (id,name,email,password) VALUES (?,?,?,?)")) {
                    statement.setString(1, id); statement.setString(2, "Administrator");
                    statement.setString(3, email); statement.setString(4, BCrypt.hashpw(password)); statement.executeUpdate();
                }
                try (var statement = database.prepareStatement("INSERT INTO user_roles (user_id,role_id) VALUES (?,?)")) {
                    statement.setString(1, id); statement.setString(2, role); statement.executeUpdate();
                }
                database.commit();
                System.out.println("Administrator created. Remove bootstrap credentials from the environment.");
            } catch (Exception failure) { database.rollback(); throw failure; }
        }
    }
    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing " + name);
        return value;
    }
}
