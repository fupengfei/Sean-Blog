# Sean's AI World — 实现计划

> **面向执行者：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 来按任务逐个实现。步骤使用 `- [ ]` 复选框跟踪进度。

**目标：** 构建一个个人技术博客平台，包含前台展示页面（首页、博客、项目、关于我、Skill 目录浏览）和 Admin 管理后台。

**架构概述：** Next.js 14 前端通过 REST API 与 Spring Boot 4.x 模块化单体后端通信。MySQL 8.0 存储业务数据。文件（MD 文章、Skill 目录、图片）通过 Docker Volume 存储在宿主机文件系统。JWT 认证保护 Admin 接口。

**技术栈：** Next.js 14 + TypeScript + Tailwind CSS | Spring Boot 4.x + Spring MVC + MyBatis | MySQL 8.0 | Docker Compose | JWT (jjwt)

## 全局约束

- 后端使用 Spring Boot 4.x + Spring MVC + MyBatis，预留 Spring AI 2.x 集成
- 前端使用 Next.js 14 + TypeScript + Tailwind CSS
- 数据库使用 MySQL 8.0，文件存储通过 Docker Volume 挂载宿主机目录
- Admin 接口使用 JWT 认证（24 小时有效期，BCrypt 加密密码）
- 模块化单体架构：单个 Spring Boot 应用，内部按模块分包
- 前端设计遵循 `design/intellectual_professional/DESIGN.md`（主色 Navy #002045，辅色 Green #0a6c44；字体 Inter + Source Serif 4；8px 间距）
- 小数据量处理：卡片居中排列，数据不足时不显示分页器，加入空状态占位
- v1 范围：不含评论、RSS、搜索、分析面板、多用户、暗色模式

---

## 文件结构

### 后端（Spring Boot）
```
backend/
├── pom.xml
├── Dockerfile
└── src/main/
    ├── java/com/sean/blog/
    │   ├── BlogApplication.java
    │   ├── config/
    │   │   ├── SecurityConfig.java
    │   │   ├── WebMvcConfig.java
    │   │   └── MyBatisConfig.java
    │   ├── common/
    │   │   ├── Result.java
    │   │   ├── PageResult.java
    │   │   ├── BusinessException.java
    │   │   └── GlobalExceptionHandler.java
    │   └── module/
    │       ├── auth/
    │       │   ├── controller/AuthController.java
    │       │   ├── service/AuthService.java
    │       │   ├── dto/LoginRequest.java
    │       │   ├── dto/PasswordChangeRequest.java
    │       │   ├── entity/AdminUser.java
    │       │   ├── mapper/AdminUserMapper.java
    │       │   ├── security/JwtTokenProvider.java
    │       │   └── security/JwtTokenFilter.java
    │       ├── blog/
    │       │   ├── controller/ArticlePublicController.java
    │       │   ├── controller/ArticleAdminController.java
    │       │   ├── controller/CategoryController.java
    │       │   ├── controller/TagController.java
    │       │   ├── service/ArticleService.java
    │       │   ├── service/CategoryService.java
    │       │   ├── service/TagService.java
    │       │   ├── entity/Article.java
    │       │   ├── entity/Category.java
    │       │   ├── entity/Tag.java
    │       │   ├── mapper/ArticleMapper.java
    │       │   ├── mapper/CategoryMapper.java
    │       │   ├── mapper/TagMapper.java
    │       │   └── dto/ArticleRequest.java
    │       ├── project/
    │       │   ├── controller/ProjectPublicController.java
    │       │   ├── controller/ProjectAdminController.java
    │       │   ├── service/ProjectService.java
    │       │   ├── entity/Project.java
    │       │   ├── mapper/ProjectMapper.java
    │       │   └── dto/ProjectRequest.java
    │       ├── file/
    │       │   ├── controller/FileBundlePublicController.java
    │       │   ├── controller/FileBundleAdminController.java
    │       │   ├── controller/FileStreamController.java
    │       │   ├── service/FileBundleService.java
    │       │   ├── entity/FileBundle.java
    │       │   ├── entity/FileNode.java
    │       │   ├── mapper/FileBundleMapper.java
    │       │   ├── mapper/FileNodeMapper.java
    │       │   └── dto/FileTreeResponse.java
    │       └── contact/
    │           ├── controller/ContactController.java
    │           ├── controller/ContactAdminController.java
    │           ├── service/ContactService.java
    │           ├── entity/ContactRecord.java
    │           ├── mapper/ContactRecordMapper.java
    │           └── dto/ResumeRequest.java
    └── resources/
        ├── application.yml
        ├── db/migration/V1__init_schema.sql
        └── mapper/
            ├── AdminUserMapper.xml
            ├── ArticleMapper.xml
            ├── CategoryMapper.xml
            ├── TagMapper.xml
            ├── ProjectMapper.xml
            ├── FileBundleMapper.xml
            ├── FileNodeMapper.xml
            └── ContactRecordMapper.xml
```

### 前端（Next.js）
```
frontend/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
├── Dockerfile
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── blog/
    │   │   ├── page.tsx
    │   │   ├── [slug]/page.tsx
    │   │   ├── skills/page.tsx
    │   │   └── skills/[id]/page.tsx
    │   ├── projects/page.tsx
    │   ├── about/page.tsx
    │   └── admin/
    │       ├── layout.tsx
    │       ├── login/page.tsx
    │       ├── dashboard/page.tsx
    │       ├── articles/
    │       │   ├── page.tsx
    │       │   └── new/page.tsx
    │       ├── categories/page.tsx
    │       ├── tags/page.tsx
    │       ├── projects/
    │       │   ├── page.tsx
    │       │   └── new/page.tsx
    │       ├── bundles/
    │       │   ├── page.tsx
    │       │   └── new/page.tsx
    │       ├── contacts/page.tsx
    │       └── settings/page.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── NavBar.tsx
    │   │   ├── Footer.tsx
    │   │   └── AdminLayout.tsx
    │   ├── home/
    │   │   ├── HeroSection.tsx
    │   │   ├── FeaturedProjects.tsx
    │   │   ├── FeaturedArticles.tsx
    │   │   ├── CTASection.tsx
    │   │   └── ResumeModal.tsx
    │   ├── blog/
    │   │   ├── FilterBar.tsx
    │   │   ├── ArticleCard.tsx
    │   │   ├── MarkdownRenderer.tsx
    │   │   └── Pagination.tsx
    │   ├── project/
    │   │   └── ProjectCard.tsx
    │   ├── skill/
    │   │   ├── BundleCard.tsx
    │   │   ├── FileTreeView.tsx
    │   │   └── FileContentView.tsx
    │   └── admin/
    │       ├── ArticleTable.tsx
    │       ├── ArticleEditor.tsx
    │       ├── ProjectTable.tsx
    │       ├── ProjectEditor.tsx
    │       ├── BundleList.tsx
    │       ├── BundleUploader.tsx
    │       └── ContactTable.tsx
    ├── lib/
    │   ├── api.ts
    │   └── auth.ts
    └── types/
        └── index.ts
```

---

## 第一阶段：项目脚手架与数据库

### 任务 1：搭建 Spring Boot 项目

**涉及文件：**
- 新建：`backend/pom.xml`
- 新建：`backend/src/main/java/com/sean/blog/BlogApplication.java`
- 新建：`backend/src/main/resources/application.yml`
- 新建：`backend/Dockerfile`

**产出接口：** `BlogApplication`（Spring Boot 入口）、应用配置、后端 Dockerfile

- [ ] **步骤 1：创建 pom.xml，使用 Spring Boot 4.x**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.0.0</version>
        <relativePath/>
    </parent>
    <groupId>com.sean</groupId>
    <artifactId>sean-blog</artifactId>
    <version>1.0.0</version>
    <name>Sean's AI World Blog</name>

    <properties>
        <java.version>21</java.version>
        <mybatis-spring-boot.version>4.0.0</mybatis-spring-boot.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.mybatis.spring.boot</groupId>
            <artifactId>mybatis-spring-boot-starter</artifactId>
            <version>${mybatis-spring-boot.version}</version>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.6</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
        <!-- Markdown 解析 -->
        <dependency>
            <groupId>com.vladsch.flexmark</groupId>
            <artifactId>flexmark-all</artifactId>
            <version>0.64.8</version>
        </dependency>
        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **步骤 2：创建 BlogApplication.java**

```java
package com.sean.blog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BlogApplication {
    public static void main(String[] args) {
        SpringApplication.run(BlogApplication.class, args);
    }
}
```

- [ ] **步骤 3：创建 application.yml**

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:sean_blog}?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai
    username: ${DB_USER:root}
    password: ${DB_PASSWORD:root}
    driver-class-name: com.mysql.cj.jdbc.Driver

mybatis:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.sean.blog.module
  configuration:
    map-underscore-to-camel-case: true

jwt:
  secret: ${JWT_SECRET:default-secret-change-in-production}
  expiration: 86400000

file:
  base-path: ${FILE_BASE_PATH:/data}
  upload:
    articles: ${file.base-path}/articles
    skills: ${file.base-path}/skills
    images: ${file.base-path}/images
```

- [ ] **步骤 4：创建后端 Dockerfile**

```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

- [ ] **步骤 5：验证编译**

```bash
cd backend && mvn clean compile
```
期望结果：BUILD SUCCESS

- [ ] **步骤 6：提交**

```bash
git add backend/
git commit -m "feat: 搭建 Spring Boot 4.x 项目，含 pom.xml、应用配置和 Dockerfile"
```

---

### 任务 2：数据库表结构迁移

**涉及文件：**
- 新建：`backend/src/main/resources/db/migration/V1__init_schema.sql`

**产出：** 全部 9 张表（t_admin_user, t_category, t_tag, t_article, t_article_tag, t_project, t_file_bundle, t_file_node, t_contact_record）

- [ ] **步骤 1：编写完整的建表 SQL**

```sql
-- V1: Sean's AI World Blog 初始表结构

CREATE TABLE IF NOT EXISTS t_admin_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员（密码: admin123，BCrypt 加密）
INSERT INTO t_admin_user (username, password_hash) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON DUPLICATE KEY UPDATE username = username;

CREATE TABLE IF NOT EXISTS t_category (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_article (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    content_md LONGTEXT,
    content_html LONGTEXT,
    excerpt VARCHAR(500),
    cover_image VARCHAR(500),
    category_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT / PUBLISHED / DELETED',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    view_count BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES t_category(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_article_tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    article_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    FOREIGN KEY (article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES t_tag(id) ON DELETE CASCADE,
    UNIQUE KEY uk_article_tag (article_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_project (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    url VARCHAR(500),
    github_url VARCHAR(500),
    cover_image VARCHAR(500),
    tags JSON,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT / PUBLISHED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_file_bundle (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    root_path VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'SKILL',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT / PUBLISHED',
    file_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_file_node (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bundle_id BIGINT NOT NULL,
    parent_id BIGINT,
    name VARCHAR(255) NOT NULL,
    node_type VARCHAR(10) NOT NULL COMMENT 'DIRECTORY / FILE',
    file_path VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (bundle_id) REFERENCES t_file_bundle(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES t_file_node(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_contact_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(10) NOT NULL COMMENT 'MAIL / RESUME',
    company_name VARCHAR(200),
    email VARCHAR(200),
    ip_address VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **步骤 2：对照设计文档验证表结构**

检查项：9 张表是否齐全，外键、索引、默认值是否与设计文档第 4 节一致。

- [ ] **步骤 3：提交**

```bash
git add backend/src/main/resources/db/migration/
git commit -m "feat: 添加数据库建表脚本，包含全部 9 张表"
```

---

### 任务 3：通用工具类与配置

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/common/Result.java`
- 新建：`backend/src/main/java/com/sean/blog/common/PageResult.java`
- 新建：`backend/src/main/java/com/sean/blog/common/BusinessException.java`
- 新建：`backend/src/main/java/com/sean/blog/common/GlobalExceptionHandler.java`
- 新建：`backend/src/main/java/com/sean/blog/config/MyBatisConfig.java`
- 新建：`backend/src/main/java/com/sean/blog/config/WebMvcConfig.java`

**产出接口：**
- `Result<T>` — 统一 API 响应包装 `{ code, message, data }`
- `PageResult<T>` — 分页响应 `{ list, total, page, size }`
- `BusinessException` — 带错误码的运行时异常
- `GlobalExceptionHandler` — @RestControllerAdvice 统一异常处理
- `MyBatisConfig` — @MapperScan 配置
- `WebMvcConfig` — 跨域 CORS 配置

- [ ] **步骤 1：创建 Result.java**

```java
package com.sean.blog.common;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class Result<T> {
    private int code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        return new Result<>(200, "success", data);
    }

    public static <T> Result<T> success() {
        return new Result<>(200, "success", null);
    }

    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }
}
```

- [ ] **步骤 2：创建 PageResult.java**

```java
package com.sean.blog.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class PageResult<T> {
    private List<T> list;
    private long total;
    private int page;
    private int size;
}
```

- [ ] **步骤 3：创建 BusinessException.java**

```java
package com.sean.blog.common;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public BusinessException(String message) {
        this(400, message);
    }
}
```

- [ ] **步骤 4：创建 GlobalExceptionHandler.java**

```java
package com.sean.blog.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        return Result.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<?> handleException(Exception e) {
        return Result.error(500, "服务器内部错误: " + e.getMessage());
    }
}
```

- [ ] **步骤 5：创建 MyBatisConfig.java**

```java
package com.sean.blog.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.sean.blog.module.*.mapper")
public class MyBatisConfig {
}
```

- [ ] **步骤 6：创建 WebMvcConfig.java（CORS 配置）**

```java
package com.sean.blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

- [ ] **步骤 7：验证编译**

```bash
cd backend && mvn clean compile
```
期望结果：BUILD SUCCESS

- [ ] **步骤 8：提交**

```bash
git add backend/src/main/java/com/sean/blog/common/ backend/src/main/java/com/sean/blog/config/
git commit -m "feat: 添加通用工具类（Result/PageResult/异常处理）和配置（MyBatis/CORS）"
```

---

## 第二阶段：认证模块

### 任务 4：JWT Token 工具与安全过滤器

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/module/auth/entity/AdminUser.java`
- 新建：`backend/src/main/java/com/sean/blog/module/auth/mapper/AdminUserMapper.java`
- 新建：`backend/src/main/resources/mapper/AdminUserMapper.xml`
- 新建：`backend/src/main/java/com/sean/blog/module/auth/security/JwtTokenProvider.java`
- 新建：`backend/src/main/java/com/sean/blog/module/auth/security/JwtTokenFilter.java`
- 新建：`backend/src/main/java/com/sean/blog/config/SecurityConfig.java`

**产出接口：**
- `JwtTokenProvider.generateToken(username)` → 返回 JWT 字符串
- `JwtTokenProvider.validateToken(token)` → 返回是否有效
- `JwtTokenProvider.getUsername(token)` → 从 token 中提取用户名
- `AdminUserMapper.findByUsername(username)` → 返回 AdminUser 或 null

- [ ] **步骤 1：创建 AdminUser 实体**

```java
package com.sean.blog.module.auth.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AdminUser {
    private Long id;
    private String username;
    private String passwordHash;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

- [ ] **步骤 2：创建 AdminUserMapper 及其 XML**

```java
package com.sean.blog.module.auth.mapper;

import com.sean.blog.module.auth.entity.AdminUser;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AdminUserMapper {
    AdminUser findByUsername(String username);
}
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.sean.blog.module.auth.mapper.AdminUserMapper">
    <select id="findByUsername" resultType="com.sean.blog.module.auth.entity.AdminUser">
        SELECT id, username, password_hash, created_at, updated_at
        FROM t_admin_user
        WHERE username = #{username}
    </select>
</mapper>
```

- [ ] **步骤 3：创建 JwtTokenProvider**

```java
package com.sean.blog.module.auth.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expiration;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    public String generateToken(String username) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiration);
        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public String getUsername(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

- [ ] **步骤 4：创建 JwtTokenFilter**

```java
package com.sean.blog.module.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtTokenFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    public JwtTokenFilter(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);
        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            String username = tokenProvider.getUsername(token);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
```

- [ ] **步骤 5：创建 SecurityConfig**

```java
package com.sean.blog.config;

import com.sean.blog.module.auth.security.JwtTokenFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtTokenFilter jwtTokenFilter;

    public SecurityConfig(JwtTokenFilter jwtTokenFilter) {
        this.jwtTokenFilter = jwtTokenFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/admin/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtTokenFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

- [ ] **步骤 6：验证编译**

```bash
cd backend && mvn clean compile
```
期望结果：BUILD SUCCESS

- [ ] **步骤 7：提交**

```bash
git add backend/src/main/java/com/sean/blog/module/auth/ backend/src/main/java/com/sean/blog/config/SecurityConfig.java backend/src/main/resources/mapper/AdminUserMapper.xml
git commit -m "feat: 添加 JWT 认证模块（TokenProvider/Filter/SecurityConfig）"
```

---

### 任务 5：登录与修改密码接口

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/module/auth/dto/LoginRequest.java`
- 新建：`backend/src/main/java/com/sean/blog/module/auth/dto/PasswordChangeRequest.java`
- 新建：`backend/src/main/java/com/sean/blog/module/auth/service/AuthService.java`
- 新建：`backend/src/main/java/com/sean/blog/module/auth/controller/AuthController.java`

**接口：**
- `POST /api/v1/admin/login` → `{ token, expiresIn }`
- `PUT /api/v1/admin/password` → Result

- [ ] **步骤 1：创建 DTO 类**

```java
package com.sean.blog.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "用户名不能为空")
    private String username;
    @NotBlank(message = "密码不能为空")
    private String password;
}
```

```java
package com.sean.blog.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PasswordChangeRequest {
    @NotBlank(message = "旧密码不能为空")
    private String oldPassword;
    @NotBlank(message = "新密码不能为空")
    private String newPassword;
}
```

- [ ] **步骤 2：创建 AuthService**

```java
package com.sean.blog.module.auth.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.module.auth.entity.AdminUser;
import com.sean.blog.module.auth.mapper.AdminUserMapper;
import com.sean.blog.module.auth.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class AuthService {

    private final AdminUserMapper adminUserMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(AdminUserMapper adminUserMapper,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.adminUserMapper = adminUserMapper;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    public Map<String, Object> login(String username, String password) {
        AdminUser user = adminUserMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException(401, "用户名或密码错误");
        }
        String token = tokenProvider.generateToken(username);
        return Map.of("token", token, "expiresIn", 86400000L);
    }

    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword) {
        AdminUser user = adminUserMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BusinessException(400, "旧密码不正确");
        }
        // 更新密码哈希值
        String newHash = passwordEncoder.encode(newPassword);
        adminUserMapper.updatePassword(username, newHash);
    }
}
```

- [ ] **步骤 3：创建 AuthController**

```java
package com.sean.blog.module.auth.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.auth.dto.LoginRequest;
import com.sean.blog.module.auth.dto.PasswordChangeRequest;
import com.sean.blog.module.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/admin")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public Result<?> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(authService.login(request.getUsername(), request.getPassword()));
    }

    @PutMapping("/password")
    public Result<?> changePassword(@Valid @RequestBody PasswordChangeRequest request,
                                     Principal principal) {
        authService.changePassword(principal.getName(),
                request.getOldPassword(), request.getNewPassword());
        return Result.success();
    }
}
```

- [ ] **步骤 4：补充 AdminUserMapper 的 updatePassword 方法**

在 AdminUserMapper.java 中添加：
```java
@Update("UPDATE t_admin_user SET password_hash = #{newPassword} WHERE username = #{username}")
int updatePassword(@Param("username") String username, @Param("newPassword") String newPassword);
```

- [ ] **步骤 5：验证编译**

```bash
cd backend && mvn clean compile
```
期望结果：BUILD SUCCESS

- [ ] **步骤 6：提交**

```bash
git add backend/src/main/java/com/sean/blog/module/auth/
git commit -m "feat: 添加登录和修改密码接口"
```

---

## 第三阶段：博客模块

### 任务 6：分类和标签 CRUD

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/module/blog/entity/Category.java`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/entity/Tag.java`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/mapper/CategoryMapper.java`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/mapper/TagMapper.java`
- 新建：`backend/src/main/resources/mapper/CategoryMapper.xml`
- 新建：`backend/src/main/resources/mapper/TagMapper.xml`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/service/CategoryService.java`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/service/TagService.java`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/controller/CategoryController.java`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/controller/TagController.java`

**接口：**
- 公开接口：`GET /api/v1/categories` 返回分类列表，`GET /api/v1/tags` 返回标签列表
- Admin 接口：分类和标签的 CRUD 操作（/api/v1/admin/categories, /api/v1/admin/tags）

- [ ] **步骤 1：创建 Category 实体和 Mapper**

```java
package com.sean.blog.module.blog.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Category {
    private Long id;
    private String name;
    private String slug;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

```java
package com.sean.blog.module.blog.mapper;

import com.sean.blog.module.blog.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CategoryMapper {
    List<Category> findAll();
    Category findById(Long id);
    Category findBySlug(String slug);
    int insert(Category category);
    int update(Category category);
    int deleteById(Long id);
    boolean existsByName(String name);
}
```

- [ ] **步骤 2：创建 CategoryMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.sean.blog.module.blog.mapper.CategoryMapper">
    <select id="findAll" resultType="com.sean.blog.module.blog.entity.Category">
        SELECT id, name, slug, created_at, updated_at FROM t_category ORDER BY id
    </select>
    <select id="findById" resultType="com.sean.blog.module.blog.entity.Category">
        SELECT id, name, slug, created_at, updated_at FROM t_category WHERE id = #{id}
    </select>
    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO t_category (name, slug) VALUES (#{name}, #{slug})
    </insert>
    <update id="update">
        UPDATE t_category SET name = #{name}, slug = #{slug} WHERE id = #{id}
    </update>
    <delete id="deleteById">
        DELETE FROM t_category WHERE id = #{id}
    </delete>
    <select id="existsByName" resultType="boolean">
        SELECT COUNT(*) > 0 FROM t_category WHERE name = #{name}
    </select>
</mapper>
```

- [ ] **步骤 3：按相同模式创建 Tag 实体、TagMapper 和 TagMapper.xml**

- [ ] **步骤 4：创建 CategoryService**

```java
package com.sean.blog.module.blog.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.module.blog.entity.Category;
import com.sean.blog.module.blog.mapper.CategoryMapper;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CategoryService {

    private final CategoryMapper categoryMapper;

    public CategoryService(CategoryMapper categoryMapper) {
        this.categoryMapper = categoryMapper;
    }

    public List<Category> findAll() {
        return categoryMapper.findAll();
    }

    public Category create(String name, String slug) {
        if (categoryMapper.existsByName(name)) {
            throw new BusinessException("分类已存在");
        }
        Category category = new Category();
        category.setName(name);
        category.setSlug(slug);
        categoryMapper.insert(category);
        return category;
    }

    public Category update(Long id, String name, String slug) {
        Category category = categoryMapper.findById(id);
        if (category == null) {
            throw new BusinessException(404, "分类不存在");
        }
        category.setName(name);
        category.setSlug(slug);
        categoryMapper.update(category);
        return category;
    }

    public void delete(Long id) {
        categoryMapper.deleteById(id);
    }
}
```

- [ ] **步骤 5：按相同模式创建 TagService**

- [ ] **步骤 6：创建 CategoryController（含公开和 Admin 两个内部类）**

```java
package com.sean.blog.module.blog.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Category;
import com.sean.blog.module.blog.service.CategoryService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/categories")
    public Result<List<Category>> list() {
        return Result.success(categoryService.findAll());
    }
}

// 以下为 Admin 控制器，放在单独类中
@RestController
@RequestMapping("/api/v1/admin")
class CategoryAdminController {

    private final CategoryService categoryService;

    public CategoryAdminController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/categories")
    public Result<List<Category>> list() {
        return Result.success(categoryService.findAll());
    }

    @PostMapping("/categories")
    public Result<Category> create(@RequestBody Map<String, String> body) {
        return Result.success(categoryService.create(body.get("name"), body.get("slug")));
    }

    @PutMapping("/categories/{id}")
    public Result<Category> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return Result.success(categoryService.update(id, body.get("name"), body.get("slug")));
    }

    @DeleteMapping("/categories/{id}")
    public Result<?> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return Result.success();
    }
}
```

- [ ] **步骤 7：按相同模式创建 TagController**

- [ ] **步骤 8：验证编译**

```bash
cd backend && mvn clean compile
```
期望结果：BUILD SUCCESS

- [ ] **步骤 9：提交**

```bash
git add backend/src/main/java/com/sean/blog/module/blog/
git commit -m "feat: 添加分类和标签的 CRUD 功能（公开和 Admin 接口）"
```

---

### 任务 7：文章实体、Mapper 和 Service

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/module/blog/entity/Article.java`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/mapper/ArticleMapper.java`
- 新建：`backend/src/main/resources/mapper/ArticleMapper.xml`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/service/ArticleService.java`

**产出接口：**
- `ArticleService.createFromMd(file, categoryId, tagIds, isFeatured)` → Article
- `ArticleService.getBySlug(slug)` → Article（阅读数 +1）
- `ArticleService.listPublished(page, size, categoryId, tagId, keyword)` → PageResult
- `ArticleService.getFeatured(limit)` → 精选文章列表

- [ ] **步骤 1：创建 Article 实体**

```java
package com.sean.blog.module.blog.entity;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class Article {
    private Long id;
    private String title;
    private String slug;
    private String contentMd;
    private String contentHtml;
    private String excerpt;
    private String coverImage;
    private Long categoryId;
    private String status;        // DRAFT / PUBLISHED / DELETED
    private Boolean isFeatured;
    private Long viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // 关联查询字段
    private Category category;
    private List<Tag> tags;
}
```

- [ ] **步骤 2：创建 ArticleMapper 接口**

```java
package com.sean.blog.module.blog.mapper;

import com.sean.blog.module.blog.entity.Article;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface ArticleMapper {
    int insert(Article article);
    int update(Article article);
    int updateStatus(@Param("id") Long id, @Param("status") String status);
    int updateFeatured(@Param("id") Long id, @Param("featured") boolean featured);
    int incrementViewCount(Long id);
    Article findById(Long id);
    Article findBySlug(String slug);
    List<Article> findPublished(Map<String, Object> params);
    long countPublished(Map<String, Object> params);
    List<Article> findFeatured(int limit);
    List<Article> findAll(Map<String, Object> params);
    long countAll(Map<String, Object> params);
    int insertArticleTag(@Param("articleId") Long articleId, @Param("tagId") Long tagId);
    int deleteArticleTags(Long articleId);
}
```

- [ ] **步骤 3：创建 ArticleMapper.xml（含分页、分类/标签筛选、关键词搜索）**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.sean.blog.module.blog.mapper.ArticleMapper">

    <resultMap id="articleDetail" type="com.sean.blog.module.blog.entity.Article">
        <id property="id" column="id"/>
        <result property="title" column="title"/>
        <result property="slug" column="slug"/>
        <result property="contentMd" column="content_md"/>
        <result property="contentHtml" column="content_html"/>
        <result property="excerpt" column="excerpt"/>
        <result property="coverImage" column="cover_image"/>
        <result property="categoryId" column="category_id"/>
        <result property="status" column="status"/>
        <result property="isFeatured" column="is_featured"/>
        <result property="viewCount" column="view_count"/>
        <result property="createdAt" column="created_at"/>
        <result property="updatedAt" column="updated_at"/>
        <association property="category" javaType="com.sean.blog.module.blog.entity.Category">
            <result property="id" column="cat_id"/>
            <result property="name" column="cat_name"/>
            <result property="slug" column="cat_slug"/>
        </association>
        <collection property="tags" ofType="com.sean.blog.module.blog.entity.Tag">
            <result property="id" column="tag_id"/>
            <result property="name" column="tag_name"/>
            <result property="slug" column="tag_slug"/>
        </collection>
    </resultMap>

    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO t_article (title, slug, content_md, content_html, excerpt, cover_image, category_id, status, is_featured)
        VALUES (#{title}, #{slug}, #{contentMd}, #{contentHtml}, #{excerpt}, #{coverImage}, #{categoryId}, #{status}, #{isFeatured})
    </insert>

    <update id="update">
        UPDATE t_article SET title = #{title}, slug = #{slug}, content_md = #{contentMd},
            content_html = #{contentHtml}, excerpt = #{excerpt}, cover_image = #{coverImage},
            category_id = #{categoryId}, is_featured = #{isFeatured}
        WHERE id = #{id}
    </update>

    <update id="updateStatus">
        UPDATE t_article SET status = #{status} WHERE id = #{id}
    </update>

    <update id="updateFeatured">
        UPDATE t_article SET is_featured = #{featured} WHERE id = #{id}
    </update>

    <update id="incrementViewCount">
        UPDATE t_article SET view_count = view_count + 1 WHERE id = #{id}
    </update>

    <select id="findBySlug" resultMap="articleDetail">
        SELECT a.*, c.id as cat_id, c.name as cat_name, c.slug as cat_slug,
               t.id as tag_id, t.name as tag_name, t.slug as tag_slug
        FROM t_article a
        LEFT JOIN t_category c ON a.category_id = c.id
        LEFT JOIN t_article_tag at ON a.id = at.article_id
        LEFT JOIN t_tag t ON at.tag_id = t.id
        WHERE a.slug = #{slug} AND a.status = 'PUBLISHED'
    </select>

    <select id="findPublished" resultMap="articleDetail">
        SELECT DISTINCT a.*, c.id as cat_id, c.name as cat_name, c.slug as cat_slug
        FROM t_article a
        LEFT JOIN t_category c ON a.category_id = c.id
        <where>
            a.status = 'PUBLISHED'
            <if test="categoryId != null">AND a.category_id = #{categoryId}</if>
            <if test="tagId != null">
                AND a.id IN (SELECT article_id FROM t_article_tag WHERE tag_id = #{tagId})
            </if>
            <if test="keyword != null and keyword != ''">
                AND (a.title LIKE CONCAT('%', #{keyword}, '%') OR a.excerpt LIKE CONCAT('%', #{keyword}, '%'))
            </if>
        </where>
        ORDER BY a.created_at DESC
        LIMIT #{offset}, #{size}
    </select>

    <select id="countPublished" resultType="long">
        SELECT COUNT(DISTINCT a.id) FROM t_article a
        <where>
            a.status = 'PUBLISHED'
            <if test="categoryId != null">AND a.category_id = #{categoryId}</if>
            <if test="tagId != null">
                AND a.id IN (SELECT article_id FROM t_article_tag WHERE tag_id = #{tagId})
            </if>
        </where>
    </select>

    <select id="findFeatured" resultMap="articleDetail">
        SELECT DISTINCT a.*, c.id as cat_id, c.name as cat_name, c.slug as cat_slug
        FROM t_article a
        LEFT JOIN t_category c ON a.category_id = c.id
        WHERE a.status = 'PUBLISHED' AND a.is_featured = 1
        ORDER BY a.created_at DESC LIMIT #{limit}
    </select>
</mapper>
```

- [ ] **步骤 4：创建 ArticleService（含 MD 解析和文件存储）**

```java
package com.sean.blog.module.blog.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.common.PageResult;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.data.MutableDataSet;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ArticleService {

    private final ArticleMapper articleMapper;
    private final String articlesPath;
    private final Parser mdParser;
    private final HtmlRenderer htmlRenderer;

    public ArticleService(ArticleMapper articleMapper,
                          @Value("${file.upload.articles}") String articlesPath) {
        this.articleMapper = articleMapper;
        this.articlesPath = articlesPath;
        MutableDataSet options = new MutableDataSet();
        this.mdParser = Parser.builder(options).build();
        this.htmlRenderer = HtmlRenderer.builder(options).build();
    }

    @Transactional
    public Article createFromMd(MultipartFile file, String categoryId, List<Long> tagIds, boolean isFeatured) {
        try {
            String mdContent = new String(file.getBytes());
            String html = htmlRenderer.render(mdParser.parse(mdContent));

            Article article = new Article();
            article.setTitle(extractTitle(mdContent));
            article.setSlug(generateSlug(article.getTitle()));
            article.setContentMd(mdContent);
            article.setContentHtml(html);
            article.setExcerpt(extractExcerpt(mdContent));
            article.setCategoryId(categoryId != null ? Long.parseLong(categoryId) : null);
            article.setStatus("DRAFT");
            article.setIsFeatured(isFeatured);
            article.setViewCount(0L);

            articleMapper.insert(article);

            if (tagIds != null) {
                for (Long tagId : tagIds) {
                    articleMapper.insertArticleTag(article.getId(), tagId);
                }
            }

            // 将 MD 文件保存到宿主机磁盘
            Path articleDir = Path.of(articlesPath, article.getId().toString());
            Files.createDirectories(articleDir);
            Files.writeString(articleDir.resolve("article.md"), mdContent);

            return article;
        } catch (IOException e) {
            throw new BusinessException(500, "MD 文件处理失败: " + e.getMessage());
        }
    }

    public Article getBySlug(String slug) {
        Article article = articleMapper.findBySlug(slug);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.incrementViewCount(article.getId());
        return article;
    }

    public PageResult<Article> listPublished(Integer page, Integer size, Long categoryId, Long tagId, String keyword) {
        page = page == null || page < 1 ? 1 : page;
        size = size == null || size < 1 ? 10 : size;
        Map<String, Object> params = new HashMap<>();
        params.put("offset", (page - 1) * size);
        params.put("size", size);
        params.put("categoryId", categoryId);
        params.put("tagId", tagId);
        params.put("keyword", keyword);
        List<Article> list = articleMapper.findPublished(params);
        long total = articleMapper.countPublished(params);
        return new PageResult<>(list, total, page, size);
    }

    public List<Article> getFeatured(int limit) {
        return articleMapper.findFeatured(limit);
    }

    // 从 Markdown 中提取标题（第一个 # 开头的行）
    private String extractTitle(String md) {
        Matcher m = Pattern.compile("^#\\s+(.+)$", Pattern.MULTILINE).matcher(md);
        return m.find() ? m.group(1).trim() : "无标题";
    }

    // 提取摘要（前 200 个字符）
    private String extractExcerpt(String md) {
        String plain = md.replaceAll("#+\\s+", "").replaceAll("[*_`~>\\[\\]()!]", "").trim();
        return plain.length() > 200 ? plain.substring(0, 197) + "..." : plain;
    }

    // 生成 URL 友好的 slug
    private String generateSlug(String title) {
        return title.toLowerCase().replaceAll("[^a-z0-9\\u4e00-\\u9fa5]+", "-")
                .replaceAll("^-|-$", "") + "-" + System.currentTimeMillis();
    }
}
```

- [ ] **步骤 5：验证编译**

```bash
cd backend && mvn clean compile
```
期望结果：BUILD SUCCESS

- [ ] **步骤 6：提交**

```bash
git add backend/src/main/java/com/sean/blog/module/blog/entity/Article.java backend/src/main/java/com/sean/blog/module/blog/mapper/ArticleMapper.java backend/src/main/resources/mapper/ArticleMapper.xml backend/src/main/java/com/sean/blog/module/blog/service/ArticleService.java
git commit -m "feat: 添加文章实体、Mapper（含分页查询）和 Service（含 MD 解析）"
```

---

### 任务 8：文章控制器（公开 + Admin）

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/module/blog/controller/ArticlePublicController.java`
- 新建：`backend/src/main/java/com/sean/blog/module/blog/controller/ArticleAdminController.java`

**接口：**
- 公开接口：`GET /api/v1/articles`, `GET /api/v1/articles/featured`, `GET /api/v1/articles/{slug}`
- Admin 接口：`GET/POST/PUT/DELETE /api/v1/admin/articles`, `PUT /api/v1/admin/articles/{id}/feature`

- [ ] **步骤 1：创建 ArticlePublicController**

```java
package com.sean.blog.module.blog.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ArticlePublicController {

    private final ArticleService articleService;

    public ArticlePublicController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping("/articles")
    public Result<PageResult<Article>> list(
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) Long tag,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword) {
        return Result.success(articleService.listPublished(page, size, category, tag, keyword));
    }

    @GetMapping("/articles/featured")
    public Result<List<Article>> featured(@RequestParam(defaultValue = "6") int limit) {
        return Result.success(articleService.getFeatured(limit));
    }

    @GetMapping("/articles/{slug}")
    public Result<Article> getBySlug(@PathVariable String slug) {
        return Result.success(articleService.getBySlug(slug));
    }
}
```

- [ ] **步骤 2：创建 ArticleAdminController**

```java
package com.sean.blog.module.blog.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/articles")
public class ArticleAdminController {

    private final ArticleService articleService;

    public ArticleAdminController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping
    public Result<PageResult<Article>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword) {
        return Result.success(articleService.listAll(page, size, keyword));
    }

    @PostMapping
    public Result<Article> create(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(defaultValue = "false") boolean isFeatured) {
        return Result.success(articleService.createFromMd(file, categoryId, tagIds, isFeatured));
    }

    @PutMapping("/{id}")
    public Result<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        articleService.updateStatus(id, status);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        articleService.updateStatus(id, "DELETED");
        return Result.success();
    }

    @PutMapping("/{id}/feature")
    public Result<?> toggleFeature(@PathVariable Long id) {
        articleService.toggleFeatured(id);
        return Result.success();
    }
}
```

- [ ] **步骤 3：补充 ArticleService 中 Admin 需要的方法**

在 ArticleService.java 中添加：
```java
public PageResult<Article> listAll(Integer page, Integer size, String keyword) {
    page = page == null || page < 1 ? 1 : page;
    size = size == null || size < 1 ? 10 : size;
    Map<String, Object> params = new HashMap<>();
    params.put("offset", (page - 1) * size);
    params.put("size", size);
    params.put("keyword", keyword);
    List<Article> list = articleMapper.findAll(params);
    long total = articleMapper.countAll(params);
    return new PageResult<>(list, total, page, size);
}

public void updateStatus(Long id, String status) {
    articleMapper.updateStatus(id, status);
}

public void toggleFeatured(Long id) {
    Article article = articleMapper.findById(id);
    if (article != null) {
        articleMapper.updateFeatured(id, !article.getIsFeatured());
    }
}
```

在 ArticleMapper.java 中添加：
```java
List<Article> findAll(Map<String, Object> params);
long countAll(Map<String, Object> params);
```

- [ ] **步骤 4：验证编译并提交**

```bash
cd backend && mvn clean compile
git add backend/src/main/java/com/sean/blog/module/blog/
git commit -m "feat: 添加文章公开和 Admin 控制器"
```

---

## 第四阶段：项目模块

### 任务 9：项目 CRUD（实体、Mapper、Service、控制器）

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/module/project/entity/Project.java`
- 新建：`backend/src/main/java/com/sean/blog/module/project/mapper/ProjectMapper.java`
- 新建：`backend/src/main/resources/mapper/ProjectMapper.xml`
- 新建：`backend/src/main/java/com/sean/blog/module/project/service/ProjectService.java`
- 新建：`backend/src/main/java/com/sean/blog/module/project/controller/ProjectPublicController.java`
- 新建：`backend/src/main/java/com/sean/blog/module/project/controller/ProjectAdminController.java`

**接口：**
- 公开接口：`GET /api/v1/projects`, `GET /api/v1/projects/featured`
- Admin 接口：项目 CRUD + 精选切换 + 排序调整

- [ ] **步骤 1：创建 Project 实体**

```java
package com.sean.blog.module.project.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Project {
    private Long id;
    private String title;
    private String description;
    private String url;
    private String githubUrl;
    private String coverImage;
    private String tags;       // JSON 字符串
    private Boolean isFeatured;
    private Integer sortOrder;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

- [ ] **步骤 2：创建 ProjectMapper 和 ProjectMapper.xml**

```java
package com.sean.blog.module.project.mapper;

import com.sean.blog.module.project.entity.Project;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ProjectMapper {
    List<Project> findPublished();
    List<Project> findFeatured(int limit);
    List<Project> findAll();
    Project findById(Long id);
    int insert(Project project);
    int update(Project project);
    int deleteById(Long id);
    int updateFeatured(@Param("id") Long id, @Param("featured") boolean featured);
    int updateSortOrder(@Param("id") Long id, @Param("sortOrder") int sortOrder);
}
```

- [ ] **步骤 3：创建 ProjectService（含封面图上传）**

```java
package com.sean.blog.module.project.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.mapper.ProjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectMapper projectMapper;
    private final String imagesPath;

    public ProjectService(ProjectMapper projectMapper,
                          @Value("${file.upload.images}") String imagesPath) {
        this.projectMapper = projectMapper;
        this.imagesPath = imagesPath;
    }

    public List<Project> findPublished() {
        return projectMapper.findPublished();
    }

    public List<Project> findFeatured(int limit) {
        return projectMapper.findFeatured(limit);
    }

    @Transactional
    public Project create(String title, String description, String url, String githubUrl,
                          String tags, boolean isFeatured, MultipartFile coverImage) {
        Project project = new Project();
        project.setTitle(title);
        project.setDescription(description);
        project.setUrl(url);
        project.setGithubUrl(githubUrl);
        project.setTags(tags != null ? tags : "[]");
        project.setIsFeatured(isFeatured);
        project.setSortOrder(projectMapper.findAll().size());
        project.setStatus("DRAFT");

        if (coverImage != null && !coverImage.isEmpty()) {
            project.setCoverImage(saveImage(coverImage));
        }

        projectMapper.insert(project);
        return project;
    }

    @Transactional
    public void delete(Long id) {
        projectMapper.deleteById(id);
    }

    @Transactional
    public void toggleFeatured(Long id) {
        Project project = projectMapper.findById(id);
        if (project != null) {
            projectMapper.updateFeatured(id, !project.getIsFeatured());
        }
    }

    @Transactional
    public void updateSortOrder(Long id, int sortOrder) {
        projectMapper.updateSortOrder(id, sortOrder);
    }

    private String saveImage(MultipartFile file) {
        try {
            Path dir = Path.of(imagesPath);
            Files.createDirectories(dir);
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            file.transferTo(dir.resolve(filename).toFile());
            return "/api/v1/files/images/" + filename;
        } catch (IOException e) {
            throw new BusinessException(500, "图片保存失败");
        }
    }
}
```

- [ ] **步骤 4：创建 ProjectPublicController 和 ProjectAdminController**

公开控制器映射 `GET /api/v1/projects` 和 `GET /api/v1/projects/featured`。
Admin 控制器映射 `GET/POST/DELETE /api/v1/admin/projects`、`PUT /api/v1/admin/projects/{id}/feature`、`PUT /api/v1/admin/projects/{id}/sort`。

- [ ] **步骤 5：验证编译并提交**

---

## 第五阶段：文件模块与联系模块

### 任务 10：文件目录模块（zip 上传、目录树、文件读取）

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/module/file/entity/FileBundle.java`
- 新建：`backend/src/main/java/com/sean/blog/module/file/entity/FileNode.java`
- 新建：`backend/src/main/java/com/sean/blog/module/file/mapper/FileBundleMapper.java`
- 新建：`backend/src/main/java/com/sean/blog/module/file/mapper/FileNodeMapper.java`
- 新建：`backend/src/main/resources/mapper/FileBundleMapper.xml`
- 新建：`backend/src/main/resources/mapper/FileNodeMapper.xml`
- 新建：`backend/src/main/java/com/sean/blog/module/file/dto/FileTreeResponse.java`
- 新建：`backend/src/main/java/com/sean/blog/module/file/service/FileBundleService.java`
- 新建：`backend/src/main/java/com/sean/blog/module/file/controller/FileBundlePublicController.java`
- 新建：`backend/src/main/java/com/sean/blog/module/file/controller/FileBundleAdminController.java`
- 新建：`backend/src/main/java/com/sean/blog/module/file/controller/FileStreamController.java`

**接口：**
- 公开接口：`GET /api/v1/bundles`, `GET /api/v1/bundles/{id}/tree`, `GET /api/v1/bundles/{id}/file?path=xxx`
- Admin 接口：Bundle CRUD + 发布/取消发布

- [ ] **步骤 1：创建 FileBundle 和 FileNode 实体**

```java
package com.sean.blog.module.file.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FileBundle {
    private Long id;
    private String name;
    private String description;
    private String rootPath;
    private String type;
    private String status;
    private Integer fileCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

```java
package com.sean.blog.module.file.entity;

import lombok.Data;
import java.util.List;

@Data
public class FileNode {
    private Long id;
    private Long bundleId;
    private Long parentId;
    private String name;
    private String nodeType;    // DIRECTORY / FILE
    private String filePath;
    private Long fileSize;
    private Integer sortOrder;
    // 不存数据库，用于树结构组装
    private List<FileNode> children;
}
```

- [ ] **步骤 2：创建 Mapper 接口和 XML**

FileNodeMapper 的核心查询：
```xml
<select id="findByBundleId" resultType="com.sean.blog.module.file.entity.FileNode">
    SELECT * FROM t_file_node WHERE bundle_id = #{bundleId} ORDER BY node_type ASC, sort_order ASC, name ASC
</select>
```

BundleMapper 的核心查询：
```xml
<select id="findByStatus" resultType="com.sean.blog.module.file.entity.FileBundle">
    SELECT * FROM t_file_bundle WHERE status = #{status} ORDER BY created_at DESC
</select>
```

- [ ] **步骤 3：创建 FileBundleService（核心逻辑：zip 解压 + 递归建树）**

关键实现：
1. `uploadBundle(zipFile, name, description)` — 接收 zip 文件，解压到 `/data/skills/{bundle_id}/`，递归遍历目录创建 FileNode 记录
2. `getTree(bundleId)` — 查询所有节点，前端/内存组装树结构（根据 parentId 递归）
3. `getFileContent(bundleId, path)` — 从宿主机磁盘读取文件内容
4. `delete(bundleId)` — 删除宿主机目录 + 数据库记录

- [ ] **步骤 4：创建控制器**

FileBundlePublicController — 3 个公开 GET 接口（bundles 列表、tree、文件内容）
FileBundleAdminController — 完整 CRUD + publish 切换接口
FileStreamController — 静态图片文件服务（`GET /api/v1/files/images/{filename}`）

- [ ] **步骤 5：验证编译并提交**

---

### 任务 11：联系记录模块

**涉及文件：**
- 新建：`backend/src/main/java/com/sean/blog/module/contact/` 下全部文件

**接口：**
- 公开接口：`POST /api/v1/contact/mail`（记录邮件点击）、`POST /api/v1/contact/resume`（记录简历请求）
- Admin 接口：`GET /api/v1/admin/contacts`（分页列表）

**实现要点：**
- ContactRecord 实体包含 type/companyName/email/ipAddress 字段
- 邮件记录接口只记录时间 + IP，无需请求体
- 简历记录接口记录公司名 + 邮箱 + IP
- IP 通过 HttpServletRequest.getRemoteAddr() 获取
- Admin 列表支持按类型（MAIL/RESUME）筛选和分页

- [ ] **步骤 1：创建所有文件（实体 → Mapper → Service → Controllers）**

- [ ] **步骤 2：验证编译并提交**

---

## 第六阶段：前端脚手架与公开页面

### 任务 12：Next.js 项目脚手架（Tailwind 设计系统 + API 客户端）

**涉及文件：**
- 新建：`frontend/package.json`, `tsconfig.json`, `next.config.js`, `postcss.config.js`
- 新建：`frontend/tailwind.config.ts`（从 DESIGN.md 提取设计令牌）
- 新建：`frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`
- 新建：`frontend/src/types/index.ts`
- 新建：`frontend/src/lib/api.ts`, `frontend/src/lib/auth.ts`
- 新建：`frontend/Dockerfile`

- [ ] **步骤 1：创建 package.json**

```json
{
  "name": "sean-blog-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "react-syntax-highlighter": "^15.5.0",
    "@headlessui/react": "^2.0.0",
    "highlight.js": "^11.9.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/react-syntax-highlighter": "^15.5.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **步骤 2：创建 tailwind.config.ts（使用 DESIGN.md 中的设计令牌）**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#002045',
          container: '#1a365d',
          fixed: '#d6e3ff',
        },
        secondary: {
          DEFAULT: '#0a6c44',
          container: '#9ff5c1',
        },
        surface: {
          DEFAULT: '#f9f9ff',
          'container-lowest': '#ffffff',
          'container-low': '#f1f3ff',
          container: '#e8eeff',
          'container-high': '#e3e8f9',
        },
        'on-surface': '#161c27',
        'on-surface-variant': '#43474e',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'outline-variant': '#c4c6cf',
        outline: '#74777f',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['"Source Serif 4"', 'serif'],
        ui: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **步骤 3：创建 globals.css（导入字体和基础样式）**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #f9f9ff;
  color: #161c27;
  -webkit-font-smoothing: antialiased;
}

.article-card {
  transition: transform 0.3s, box-shadow 0.3s;
}
.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -12px rgba(0, 32, 69, 0.15);
}
```

- [ ] **步骤 4：创建 types/index.ts（TypeScript 类型定义，对应所有后端实体）**

- [ ] **步骤 5：创建 lib/api.ts（完整的前后端 API 通信层）**

- [ ] **步骤 6：安装依赖并验证构建**

```bash
cd frontend && npm install && npm run build
```

- [ ] **步骤 7：提交**

---

### 任务 13：公开页面 — 布局、导航栏、页脚、首页

**涉及文件：**
- 新建：`frontend/src/components/layout/NavBar.tsx`
- 新建：`frontend/src/components/layout/Footer.tsx`
- 新建：`frontend/src/components/home/HeroSection.tsx`
- 新建：`frontend/src/components/home/FeaturedProjects.tsx`
- 新建：`frontend/src/components/home/FeaturedArticles.tsx`
- 新建：`frontend/src/components/home/CTASection.tsx`
- 新建：`frontend/src/components/home/ResumeModal.tsx`
- 新建：`frontend/src/app/page.tsx`
- 修改：`frontend/src/app/layout.tsx`

**关键实现要点：**

1. **NavBar** — 固定顶部，毛玻璃效果（backdrop-blur-md），当前页高亮（border-bottom），导航项：首页/博客/项目/关于

2. **Footer** — 三栏布局：站点说明 + 快速链接 + 联系方式

3. **HeroSection** — 左文右图布局，个人介绍 + 两个 CTA 按钮（查看作品 / 阅读博客）

4. **FeaturedProjects** — 获取精选项目（最多 3 个），居中网格排列，数量不足时显示虚线占位卡片（"更多项目即将上线"）

5. **FeaturedArticles** — 同 FeaturedProjects 模式，使用 ArticleCard 组件

6. **CTASection** — 深色背景区块：
   - 标题：「让我们在AI领域越陷越深」
   - 描述文案
   - 「发送邮件」按钮 → 调用 `api.postMailContact()` 然后 `window.location.href = 'mailto:...'`
   - 「获取简历」按钮 → 打开 ResumeModal（Headless UI Dialog，包含公司名称 + 邮箱两个输入框）

7. **小数据量处理** — 所有精选区域使用 `justify-center`，卡片不拉伸，数据不足一页时不显示分页器

- [ ] **步骤 1-8：逐个创建组件文件并验证构建**

```bash
git add frontend/src/components/layout/ frontend/src/components/home/ frontend/src/app/
git commit -m "feat: 添加公开布局（导航栏/页脚）和首页所有区块"
```

---

### 任务 14：博客列表页和文章详情页

**涉及文件：**
- 新建：`frontend/src/components/blog/FilterBar.tsx`
- 新建：`frontend/src/components/blog/ArticleCard.tsx`
- 新建：`frontend/src/components/blog/MarkdownRenderer.tsx`
- 新建：`frontend/src/components/blog/Pagination.tsx`
- 新建：`frontend/src/app/blog/page.tsx`
- 新建：`frontend/src/app/blog/[slug]/page.tsx`

**关键实现要点：**

1. **ArticleCard** — 基于 v2_1 设计稿：
   - 可选封面图
   - 分类标签（绿色）+ 日期
   - 标题（hover 时颜色变化）
   - 摘要文字
   - 「阅读全文」链接

2. **FilterBar** — 分类标签切换按钮组，从 API 获取分类列表

3. **MarkdownRenderer** — 使用 react-markdown + remark-gfm + rehype-highlight

4. **文章列表页** — 状态：`{ articles, categories, loading, selectedCategory }`，点击分类触发重新请求

5. **文章详情页** — `useParams` 获取 slug，调用 `api.getArticleBySlug(slug)`，渲染 MarkdownRenderer

6. **阅读计数** — 后端在 `getBySlug` 时自动 +1

---

### 任务 15：Skill 目录浏览页

**涉及文件：**
- 新建：`frontend/src/components/skill/BundleCard.tsx`
- 新建：`frontend/src/components/skill/FileTreeView.tsx`
- 新建：`frontend/src/components/skill/FileContentView.tsx`
- 新建：`frontend/src/app/blog/skills/page.tsx`
- 新建：`frontend/src/app/blog/skills/[id]/page.tsx`

**关键实现要点：**

1. **BundleCard** — 文件夹图标 + 名称 + 描述 + 文件数量

2. **FileTreeView** — 递归组件：
   - 目录节点：folder 图标，点击展开/收起子节点
   - 文件节点：file 图标，点击调用 `onSelectFile`
   - 展开状态用 `useState<Set<number>>` 管理

3. **FileContentView** — 根据文件扩展名选择渲染方式：
   - `.md` → MarkdownRenderer
   - 代码文件 → react-syntax-highlighter
   - 图片 → `<img>` 标签
   - 其他 / 超 200KB → 提示不支持预览

4. **Skill 详情页** — 左右分栏：左侧 FileTreeView（固定宽度），右侧 FileContentView

5. **空状态** — 无已发布 Bundle 时 /blog/skills 页为空；只有一个 Bundle 时可跳过列表直接进目录树

---

### 任务 16：项目列表页和关于我页

**涉及文件：**
- 新建：`frontend/src/components/project/ProjectCard.tsx`
- 新建：`frontend/src/app/projects/page.tsx`
- 新建：`frontend/src/app/about/page.tsx`

**关键实现要点：**

1. **ProjectCard** — 基于 v2_3 设计：
   - 封面图 + hover 放大效果
   - 标签（JSON 解析为数组，渲染为 tag pill）
   - 标题 + 描述
   - 双按钮：访问网站（primary）+ GitHub（outline）
   - 空状态：「更多项目正在开发中」虚线占位卡片

2. **AboutPage** — 基于 v2_4 设计，v1 硬编码：
   - ProfileSection：照片占位 + 个人介绍文字
   - SkillsSection：技术栈卡片（React/Spring Boot/AI 等）
   - ContactSection：邮箱 + 位置信息

---

## 第七阶段：Admin 前端

### 任务 17：Admin 布局、登录和仪表盘

**涉及文件：**
- 新建：`frontend/src/components/layout/AdminLayout.tsx`
- 新建：`frontend/src/lib/auth.ts`
- 新建：`frontend/src/app/admin/layout.tsx`
- 新建：`frontend/src/app/admin/login/page.tsx`
- 新建：`frontend/src/app/admin/dashboard/page.tsx`

**关键实现要点：**

1. **auth.ts** — `isAuthenticated()` 检查 localStorage token，`login(token)` 存储，`logout()` 清除并跳转

2. **AdminLayout** — 左侧固定侧边栏 + 右侧内容区：
   - Sidebar：仪表盘/文章管理/分类管理/标签管理/项目管理/文件目录/联系记录/修改密码
   - 当前页高亮（bg-primary）
   - 退出按钮调用 `logout()`
   - `/admin/login` 路由跳过布局

3. **LoginPage** — 用户名 + 密码表单，提交到 `adminApi.login()`，成功后 `login(token)` 并跳转

4. **Dashboard** — 三个统计卡片（文章总数 / 项目总数 / Bundle 总数），调用各 Admin API 获取

---

### 任务 18：Admin 文章管理页面

**涉及文件：**
- 新建：`frontend/src/components/admin/ArticleTable.tsx`
- 新建：`frontend/src/components/admin/ArticleEditor.tsx`
- 新建：`frontend/src/app/admin/articles/page.tsx`
- 新建：`frontend/src/app/admin/articles/new/page.tsx`
- 新建：`frontend/src/app/admin/categories/page.tsx`
- 新建：`frontend/src/app/admin/tags/page.tsx`
- 新建：`frontend/src/app/admin/settings/page.tsx`

**关键实现要点：**

1. **ArticleTable** — 表格列：标题、分类、状态（DRAFT/PUBLISHED/DELETED）、创建时间、操作按钮（发布/取消发布、精选切换、删除）

2. **ArticleEditor** — 拖拽文件上传区（.md 文件）+ 分类下拉 + 标签多选 + 精选勾选 + 提交按钮，使用 FormData

3. **Categories 管理** — 简单表格 + 新增/编辑弹窗（Modal）

4. **Tags 管理** — 同 Categories 模式

5. **修改密码页** — 旧密码/新密码/确认新密码 三个字段

---

### 任务 19：Admin 项目、Bundle 和联系记录页面

**涉及文件：**
- 新建：`frontend/src/components/admin/ProjectTable.tsx`
- 新建：`frontend/src/components/admin/ProjectEditor.tsx`
- 新建：`frontend/src/components/admin/BundleList.tsx`
- 新建：`frontend/src/components/admin/BundleUploader.tsx`
- 新建：`frontend/src/components/admin/ContactTable.tsx`
- 新建：前端各 Admin 子页面

**关键实现要点：**

1. **ProjectTable** — 表格 + 排序按钮（上下箭头）+ 操作按钮
2. **ProjectEditor** — 标题/描述/URL/GitHub URL/封面图上传/标签输入/精选勾选
3. **BundleList** — 卡片列表，每张卡片：名称/描述/文件数/状态/发布切换/删除按钮
4. **BundleUploader** — 拖拽上传 .zip + 名称/描述表单
5. **ContactTable** — 只读分页表格，列：类型/公司名/邮箱/IP/时间，支持按类型筛选

---

## 第八阶段：部署

### 任务 20：Docker Compose 和 Nginx 配置

**涉及文件：**
- 新建：`docker-compose.yml`
- 新建：`nginx.conf`
- 新建：`.env.example`

- [ ] **步骤 1：创建 docker-compose.yml**

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: sean-blog-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: sean-blog-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080/api/v1
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: sean-blog-backend
    ports:
      - "8080:8080"
    volumes:
      - /host/data/articles:/data/articles
      - /host/data/skills:/data/skills
      - /host/data/images:/data/images
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=sean_blog
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD:-root}
      - JWT_SECRET=${JWT_SECRET:-your-jwt-secret-change-me}
      - FILE_BASE_PATH=/data
    depends_on:
      mysql:
        condition: service_healthy
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    container_name: sean-blog-mysql
    ports:
      - "3306:3306"
    volumes:
      - /host/data/mysql:/var/lib/mysql
      - ./backend/src/main/resources/db/migration:/docker-entrypoint-initdb.d:ro
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD:-root}
      - MYSQL_DATABASE=sean_blog
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    restart: unless-stopped
```

- [ ] **步骤 2：创建 nginx.conf**

```nginx
upstream frontend { server frontend:3000; }
upstream backend { server backend:8080; }

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 50m;
    }
}
```

- [ ] **步骤 3：创建 .env.example**

```bash
DB_PASSWORD=your-db-password
JWT_SECRET=your-jwt-secret-at-least-32-chars
```

- [ ] **步骤 4：验证 Docker 构建**

```bash
docker compose build
```
期望结果：全部镜像构建成功

- [ ] **步骤 5：提交**

```bash
git add docker-compose.yml nginx.conf .env.example
git commit -m "feat: 添加 Docker Compose 部署配置和 Nginx 反向代理"
```

---

## 需求覆盖检查清单

| 设计文档章节 | 对应任务 |
|-------------|---------|
| 概述 / 架构 | 任务 1, 3 |
| 数据库设计（全部 9 张表） | 任务 2 |
| API — 公开博客/项目/Bundle/联系接口 | 任务 6, 7, 8, 9, 10, 11 |
| API — Admin 认证/文章/项目/Bundle/联系接口 | 任务 4, 5, 8, 9, 10, 11 |
| 前端 — 公开页面（首页/博客/Skill/项目/关于我） | 任务 12, 13, 14, 15, 16 |
| 前端 — Admin 页面 | 任务 17, 18, 19 |
| 文件目录系统（zip 上传/目录树/文件预览） | 任务 10, 15 |
| 认证与安全（JWT/BCrypt/SecurityConfig） | 任务 4, 5 |
| 部署（Docker Compose/Nginx） | 任务 20 |
| 功能清单 1.1-5.5.3（全部 30+ 项） | 全部覆盖 |

---

## 执行建议

1. **按顺序执行**：每个任务依赖于前面任务的接口（Interface），必须按任务编号顺序推进
2. **验证点**：每个任务末尾有编译验证或构建验证步骤，确保不积累错误
3. **提交粒度**：每个任务一次 commit，方便回溯
4. **并行机会**：任务 12（前端脚手架）可以与任务 2-5（后端）并行执行，因为前端只依赖 API 接口名而不是实现
