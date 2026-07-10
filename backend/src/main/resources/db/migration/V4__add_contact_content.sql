-- V2: 联系记录表添加 content 字段 & 更新 type 注释
ALTER TABLE t_contact_record
    ADD COLUMN content TEXT COMMENT '消息内容' AFTER type;

ALTER TABLE t_contact_record
    MODIFY COLUMN type VARCHAR(10) NOT NULL COMMENT 'BUSINESS / MAIL / RESUME / SUBSCRIBE';
