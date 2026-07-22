package com.sean.blog.module.ai.dto;

import java.util.List;

/**
 * AI 聊天请求体（POST /api/v1/ai/chat）。
 *
 * @param message   用户当前输入（必填，非空）
 * @param articleId 用户正在阅读的文章 ID（可选，来自文章详情页；
 *                  前端传 JSON 数字字符串时 Jackson 自动绑定为 Long）
 * @param history   最近对话历史（可选，前端携带，后端会再次净化校验）
 */
public record ChatRequest(String message, Long articleId, List<ChatMessageDto> history) {}
