package com.sean.blog.module.ai.mapper;

import com.sean.blog.module.ai.entity.AiChatSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

/** AI 客服会话 Mapper。 */
@Mapper
public interface AiChatSessionMapper {

    int insert(AiChatSession session);

    /** 原子 upsert：插入或仅更新 last_active_at / ip / user_agent（ip/ua 传 null 时保留旧值）。 */
    int upsert(AiChatSession session);

    int updateLastActive(@Param("id") Long id, @Param("lastActiveAt") LocalDateTime lastActiveAt);

    int incrementMessageCount(@Param("id") Long id, @Param("delta") int delta);

    AiChatSession findByConversationId(@Param("conversationId") String conversationId);
}
