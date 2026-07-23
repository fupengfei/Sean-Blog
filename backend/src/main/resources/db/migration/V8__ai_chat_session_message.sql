-- AI 客服对话审计：会话表（一行一个 conversationId）
CREATE TABLE ai_chat_session (
    id               BIGINT       NOT NULL COMMENT '雪花 ID',
    conversation_id  VARCHAR(36)  NOT NULL COMMENT 'UUID，对外暴露的会话标识',
    created_at       DATETIME     NOT NULL COMMENT '首次提问时间',
    last_active_at   DATETIME     NOT NULL COMMENT '最近问答时间',
    ip               VARCHAR(64)  DEFAULT NULL COMMENT '客户端 IP',
    user_agent       VARCHAR(512) DEFAULT NULL COMMENT '设备标识（User-Agent）',
    message_count    INT          NOT NULL DEFAULT 0 COMMENT '消息数（user+assistant，奇数表示中断会话）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_conversation_id (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 客服会话';

-- AI 客服对话审计：消息流水（完整问答，永不窗口化）
CREATE TABLE ai_chat_message (
    id          BIGINT       NOT NULL COMMENT '雪花 ID',
    session_id  BIGINT       NOT NULL COMMENT '逻辑关联 ai_chat_session.id',
    role        VARCHAR(16)  NOT NULL COMMENT 'user / assistant',
    content     MEDIUMTEXT   NOT NULL COMMENT '原始问题 / 最终回答全文',
    created_at  DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_session_created (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 客服消息流水';
