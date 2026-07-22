-- =============================================================================
-- V4: 联系记录表扩展
-- =============================================================================
-- 变更内容：
--   1. 新增 content 字段，存储联系消息的正文内容
--   2. 扩展 type 枚举值，增加 BUSINESS（商务合作）和 SUBSCRIBE（订阅）
-- =============================================================================

-- 增加消息内容字段（存储用户提交的联系表单内容）
ALTER TABLE t_contact_record
    ADD COLUMN content TEXT COMMENT '消息内容' AFTER type;

-- 扩展开 type 字段：新增 BUSINESS（商务合作）和 SUBSCRIBE（邮件订阅）
ALTER TABLE t_contact_record
    MODIFY COLUMN type VARCHAR(10) NOT NULL COMMENT 'BUSINESS / MAIL / RESUME / SUBSCRIBE';
