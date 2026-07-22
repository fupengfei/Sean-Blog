package com.sean.blog.module.ai.dto;

/**
 * 聊天历史中的单条消息（前端随请求携带）。
 *
 * @param role    消息角色：user / assistant（其他值会被后端净化丢弃）
 * @param content 消息内容
 */
public record ChatMessageDto(String role, String content) {}
