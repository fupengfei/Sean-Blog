package com.sean.blog.module.ai.mapper;

import com.sean.blog.module.ai.entity.AiChatSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

/** AI 客服会话 Mapper。 */
@Mapper
public interface AiChatSessionMapper {

    int insert(AiChatSession session);

    int updateLastActive(@Param("id") Long id, @Param("lastActiveAt") LocalDateTime lastActiveAt);

    int incrementMessageCount(@Param("id") Long id, @Param("delta") int delta);

    AiChatSession findByConversationId(@Param("conversationId") String conversationId);
}
