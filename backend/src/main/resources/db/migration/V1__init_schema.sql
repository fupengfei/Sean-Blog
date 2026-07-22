-- =============================================================================
-- V1: Sean's AI World Blog 初始表结构
-- =============================================================================
-- 创建博客系统的全部基础表：
--   用户、分类、标签、文章、文章-标签关联、项目、文件包、文件节点、联系记录
-- 所有表使用 InnoDB 引擎 + utf8mb4 字符集（支持 emoji）
-- 所有表使用 BIGINT 主键（雪花算法生成），配合 Flyway 自动迁移
-- =============================================================================

-- -----------------------------------------------------------------------------
-- t_admin_user: 管理员用户表
-- 存储后台管理系统的登录账号，密码使用 BCrypt 加密存储
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_admin_user (
    id BIGINT PRIMARY KEY,                              -- 主键：雪花算法生成
    username VARCHAR(50) NOT NULL UNIQUE,               -- 用户名，唯一索引
    password_hash VARCHAR(255) NOT NULL,                -- BCrypt 加密后的密码哈希
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_category: 文章分类表
-- 示例分类：前端、后端、AI、DevOps 等
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_category (
    id BIGINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                          -- 分类名称（中文）
    slug VARCHAR(50) NOT NULL UNIQUE,                   -- 分类标识（URL 友好，英文）
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_tag: 文章标签表
-- 文章可以有多个标签，通过 t_article_tag 多对多关联
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_tag (
    id BIGINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                          -- 标签名称
    slug VARCHAR(50) NOT NULL UNIQUE,                   -- 标签标识（URL 友好）
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_article: 文章表（核心表）
-- 存储 Markdown 原文、渲染后的 HTML、摘要、封面图等
-- Slug 格式：{title-slug}-{timestamp}，用于前端 SEO 友好 URL
-- 状态：DRAFT（草稿）/ PUBLISHED（已发布）/ DELETED（软删除）
-- 软删除策略：删除时设置 status = 'DELETED'，不物理删除
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_article (
    id BIGINT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,                        -- 文章标题
    slug VARCHAR(200) NOT NULL UNIQUE,                   -- URL 友好标识，唯一
    content_md LONGTEXT,                                -- Markdown 原文
    content_html LONGTEXT,                              -- Markdown 渲染后的 HTML
    excerpt VARCHAR(500),                               -- 文章摘要（列表展示用）
    cover_image VARCHAR(500),                           -- 封面图片 URL
    category_id BIGINT,                                 -- 所属分类 ID
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',        -- 文章状态：DRAFT / PUBLISHED / DELETED
    is_featured TINYINT(1) NOT NULL DEFAULT 0,          -- 是否精选（首页展示）
    view_count BIGINT NOT NULL DEFAULT 0,               -- 文章浏览量
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES t_category(id) ON DELETE SET NULL  -- 分类删除时文章保留
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_article_tag: 文章-标签关联表（多对多）
-- 唯一约束 (article_id, tag_id) 防止重复关联
-- 级联删除：文章/标签删除时自动清理关联
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_article_tag (
    id BIGINT PRIMARY KEY,
    article_id BIGINT NOT NULL,                         -- 文章 ID
    tag_id BIGINT NOT NULL,                             -- 标签 ID
    FOREIGN KEY (article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES t_tag(id) ON DELETE CASCADE,
    UNIQUE KEY uk_article_tag (article_id, tag_id)      -- 文章-标签 唯一约束
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_project: 项目表
-- 展示个人作品 / 开源项目，tags 字段使用 JSON 类型灵活存储
-- sort_order 控制展示顺序（数值越小越靠前）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_project (
    id BIGINT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,                        -- 项目名称
    description TEXT,                                   -- 项目描述
    url VARCHAR(500),                                   -- 项目线上地址
    github_url VARCHAR(500),                            -- GitHub 仓库地址
    cover_image VARCHAR(500),                           -- 项目封面图
    tags JSON,                                          -- 标签（JSON 数组，如 ["React","Spring Boot"]）
    is_featured TINYINT(1) NOT NULL DEFAULT 0,          -- 是否精选（首页展示）
    sort_order INT NOT NULL DEFAULT 0,                  -- 排序序号（越小越靠前）
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',        -- 状态：DRAFT / PUBLISHED
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_file_bundle: 文件包表（Skill Bundle）
-- 对应一个 Skill 文件目录（zip 包上传后解压挂载到 root_path）
-- type: SKILL 类型，后续可扩展
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_file_bundle (
    id BIGINT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,                         -- Skill 名称
    description VARCHAR(500),                           -- Skill 描述
    root_path VARCHAR(500) NOT NULL,                    -- 文件根路径（容器内绝对路径）
    type VARCHAR(20) NOT NULL DEFAULT 'SKILL',          -- 类型（预留扩展）
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',        -- 状态：DRAFT / PUBLISHED
    file_count INT NOT NULL DEFAULT 0,                  -- 包含的文件数
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_file_node: 文件节点表（树形结构）
-- 通过 parent_id 自引用实现目录树，支持无限层级
-- node_type: DIRECTORY（目录）/ FILE（文件）
-- 级联删除：bundle 删除时自动清理所有节点
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_file_node (
    id BIGINT PRIMARY KEY,
    bundle_id BIGINT NOT NULL,                          -- 所属文件包 ID
    parent_id BIGINT,                                   -- 父节点 ID（NULL 表示根节点）
    name VARCHAR(255) NOT NULL,                         -- 文件/目录名称
    node_type VARCHAR(10) NOT NULL,                     -- 节点类型：DIRECTORY / FILE
    file_path VARCHAR(500),                             -- 文件完整路径
    file_size BIGINT DEFAULT 0,                         -- 文件大小（字节）
    sort_order INT NOT NULL DEFAULT 0,                  -- 排序序号
    FOREIGN KEY (bundle_id) REFERENCES t_file_bundle(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES t_file_node(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_contact_record: 联系记录表
-- 记录用户通过网站提交的联系信息、简历请求等
-- type: MAIL（邮件）/ RESUME（简历请求）— V4 迁移中扩展了更多类型
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_contact_record (
    id BIGINT PRIMARY KEY,
    type VARCHAR(10) NOT NULL,                          -- 联系类型：MAIL / RESUME（V4 扩展：BUSINESS / SUBSCRIBE）
    company_name VARCHAR(200),                          -- 公司名称
    email VARCHAR(200),                                 -- 联系邮箱
    ip_address VARCHAR(50),                             -- 请求者 IP 地址
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
