package com.sean.blog.module.ai.mapper;

import com.sean.blog.module.ai.entity.AiChatMessage;
import org.apache.ibatis.annotations.Mapper;

/** AI 客服消息 Mapper。 */
@Mapper
public interface AiChatMessageMapper {

    int insert(AiChatMessage message);
}
