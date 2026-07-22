package com.sean.blog.module.ai.service;

import com.sean.blog.module.ai.dto.ChatMessageDto;

import java.util.ArrayList;
import java.util.List;

/**
 * ChatHistorySanitizer — 聊天历史后端兜底净化（不完全信任前端）。
 *
 * <p>规则（按顺序执行）：</p>
 * <ol>
 *   <li>丢弃 null 条目、role/content 为 null 的条目、role 不是 user/assistant 的条目</li>
 *   <li>单条 content 截断至 {@value #MAX_ENTRY_LENGTH} 字符</li>
 *   <li>只保留最近 {@value #MAX_ENTRIES} 条</li>
 *   <li>总长超过 {@value #MAX_TOTAL_LENGTH} 字符时从最旧条目开始丢弃</li>
 * </ol>
 */
public final class ChatHistorySanitizer {

    static final int MAX_ENTRIES = 10;
    static final int MAX_ENTRY_LENGTH = 4000;
    static final int MAX_TOTAL_LENGTH = 8000;

    private ChatHistorySanitizer() {}

    /**
     * 净化前端传来的对话历史。
     *
     * @param history 原始历史（可为 null）
     * @return 净化后的历史列表（永不为 null）
     */
    public static List<ChatMessageDto> sanitize(List<ChatMessageDto> history) {
        if (history == null || history.isEmpty()) {
            return List.of();
        }

        List<ChatMessageDto> cleaned = new ArrayList<>();
        for (ChatMessageDto m : history) {
            if (m == null || m.role() == null || m.content() == null) {
                continue;
            }
            if (!"user".equals(m.role()) && !"assistant".equals(m.role())) {
                continue;
            }
            String content = m.content().length() > MAX_ENTRY_LENGTH
                    ? m.content().substring(0, MAX_ENTRY_LENGTH)
                    : m.content();
            cleaned.add(new ChatMessageDto(m.role(), content));
        }

        if (cleaned.size() > MAX_ENTRIES) {
            cleaned = new ArrayList<>(cleaned.subList(cleaned.size() - MAX_ENTRIES, cleaned.size()));
        }

        int total = cleaned.stream().mapToInt(m -> m.content().length()).sum();
        while (total > MAX_TOTAL_LENGTH && !cleaned.isEmpty()) {
            total -= cleaned.get(0).content().length();
            cleaned.remove(0);
        }

        return cleaned;
    }
}
