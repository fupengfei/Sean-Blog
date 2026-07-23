package com.sean.blog.module.ai.dto;

/**
 * AI 聊天请求体（POST /api/v1/ai/chat）。
 *
 * @param message        用户当前输入（必填，非空）
 * @param conversationId 会话 ID（可选；首次不传由后端生成并经响应头返回，后续请求携带）
 * @param articleId      用户正在阅读的文章 ID（可选，来自文章详情页）
 */
public record ChatRequest(String message, String conversationId, Long articleId) {}
