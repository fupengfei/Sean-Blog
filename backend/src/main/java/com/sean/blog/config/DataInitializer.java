package com.sean.blog.config;

import com.sean.blog.module.auth.entity.AdminUser;
import com.sean.blog.module.auth.mapper.AdminUserMapper;
import com.sean.blog.common.SnowflakeIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 应用启动时初始化默认管理员账号。
 * 通过环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 配置，不再硬编码在 SQL 脚本中。
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final AdminUserMapper adminUserMapper;
    private final PasswordEncoder passwordEncoder;
    private final SnowflakeIdGenerator idGenerator;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:}")
    private String adminPassword;

    public DataInitializer(AdminUserMapper adminUserMapper, PasswordEncoder passwordEncoder,
                           SnowflakeIdGenerator idGenerator) {
        this.adminUserMapper = adminUserMapper;
        this.passwordEncoder = passwordEncoder;
        this.idGenerator = idGenerator;
    }

    @Override
    public void run(String... args) {
        int count = adminUserMapper.count();
        if (count > 0) {
            log.info("管理员账号已存在，跳过初始化（共 {} 个账号）", count);
            return;
        }

        if (!StringUtils.hasText(adminPassword)) {
            log.warn("============================================");
            log.warn("  ⚠️  未检测到 admin.password 配置！");
            log.warn("  请通过环境变量 ADMIN_PASSWORD 设置管理员密码");
            log.warn("  示例: ADMIN_PASSWORD=your-strong-password");
            log.warn("============================================");
            return;
        }

        AdminUser admin = new AdminUser();
        admin.setId(idGenerator.nextId());
        admin.setUsername(adminUsername);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        adminUserMapper.insert(admin);

        log.info("============================================");
        log.info("  ✅  默认管理员账号已创建");
        log.info("  用户名: {}", adminUsername);
        log.info("  请登录后立即修改密码！");
        log.info("============================================");
    }
}
