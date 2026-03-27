package edu.cit.binagatan.pirmaph.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class SchemaCompatibilityMigration {

    private static final Logger logger = LoggerFactory.getLogger(SchemaCompatibilityMigration.class);

    @Bean
    public ApplicationRunner ensureRbacColumns(DataSource dataSource, JdbcTemplate jdbcTemplate) {
        return args -> {
            String dbProduct = "unknown";
            try (Connection connection = dataSource.getConnection()) {
                dbProduct = connection.getMetaData().getDatabaseProductName().toLowerCase();
            } catch (Exception e) {
                logger.warn("Could not detect database product for compatibility migration: {}", e.getMessage());
            }

            List<String> statements = new ArrayList<>();

            if (dbProduct.contains("postgres")) {
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30)");
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255)");
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP");
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER");
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP");
                statements.add("CREATE TABLE IF NOT EXISTS resident_files ("
                        + "id UUID PRIMARY KEY,"
                        + "user_id UUID NOT NULL,"
                        + "barangay_code VARCHAR(20) NOT NULL,"
                        + "category VARCHAR(40) NOT NULL,"
                        + "bucket VARCHAR(40) NOT NULL,"
                        + "object_path VARCHAR(300) NOT NULL,"
                        + "original_file_name VARCHAR(255) NOT NULL,"
                        + "content_type VARCHAR(120) NOT NULL,"
                        + "file_size BIGINT NOT NULL,"
                        + "uploaded_at TIMESTAMP NOT NULL"
                        + ")");
                statements.add("UPDATE users SET status = 'APPROVED' WHERE status IS NULL");
                statements.add("UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL");
            } else {
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30)");
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255)");
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at DATETIME(6)");
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT");
                statements.add("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login_at DATETIME(6)");
                statements.add("CREATE TABLE IF NOT EXISTS resident_files ("
                        + "id CHAR(36) PRIMARY KEY,"
                        + "user_id CHAR(36) NOT NULL,"
                        + "barangay_code VARCHAR(20) NOT NULL,"
                        + "category VARCHAR(40) NOT NULL,"
                        + "bucket VARCHAR(40) NOT NULL,"
                        + "object_path VARCHAR(300) NOT NULL,"
                        + "original_file_name VARCHAR(255) NOT NULL,"
                        + "content_type VARCHAR(120) NOT NULL,"
                        + "file_size BIGINT NOT NULL,"
                        + "uploaded_at DATETIME(6) NOT NULL"
                        + ")");
                statements.add("UPDATE users SET status = 'APPROVED' WHERE status IS NULL");
                statements.add("UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL");
            }

            for (String sql : statements) {
                try {
                    jdbcTemplate.execute(sql);
                } catch (Exception ex) {
                    logger.warn("Compatibility migration statement skipped/failed: [{}] reason={}", sql, ex.getMessage());
                }
            }

            logger.info("RBAC/auth schema compatibility migration completed for database product: {}", dbProduct);
        };
    }
}