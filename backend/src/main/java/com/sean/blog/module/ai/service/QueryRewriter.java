package com.sean.blog.module.ai.service;

import com.sean.blog.module.ai.config.ChatProperties;
import com.sean.blog.module.ai.tracing.AiObservationConvention;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 查询重写服务 — 将多轮对话中依赖上下文、含有代词/省略的简短提问，
 * 改写为独立、关键词丰富的检索友好查询，提升 RAG 向量检索质量。
 *
 * <p>调用 LLM 完成改写；若失败则降级返回原始查询，不阻塞主流程。</p>
 */
@Service
public class QueryRewriter {

    private static final Logger log = LoggerFactory.getLogger(QueryRewriter.class);

    private final ChatClient chatClient;
    private final ChatProperties chatProperties;
    private final ObservationRegistry observationRegistry;
    private final String systemPrompt;

    /** 注入对话历史的上下文轮数（用户 + 助手为一轮，即最多 10 条消息） */
    private static final int HISTORY_WINDOW_MESSAGES = 10;

    @Autowired
    public QueryRewriter(ChatClient.Builder builder, ChatProperties chatProperties,
                         ObservationRegistry observationRegistry) {
        this(builder, chatProperties, observationRegistry,
                loadSystemPrompt());
    }

    private static String loadSystemPrompt() {
        try {
            return new ClassPathResource("prompt/query-rewrite-system.md")
                    .getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load query-rewrite-system.md", e);
        }
    }

    /** 测试用构造器，直接注入 system prompt。 */
    QueryRewriter(ChatClient.Builder builder, ChatProperties chatProperties,
                  ObservationRegistry observationRegistry, String systemPrompt) {
        this.chatClient = builder.build();
        this.chatProperties = chatProperties;
        this.observationRegistry = observationRegistry;
        this.systemPrompt = systemPrompt;
    }

    /**
     * 是否启用查询重写。
     */
    public boolean isEnabled() {
        return chatProperties.getRag().getQueryRewrite().isEnabled();
    }

    /**
     * 改写查询：结合对话历史将用户查询改写为独立、检索友好的查询。
     *
     * @param query   用户最后一条消息文本
     * @param history 完整对话消息列表
     * @return 改写后的查询；异常时返回原始 query
     */
    public String rewrite(String query, List<Message> history) {
        if (!isEnabled()) {
            return query;
        }
        Observation observation = null;
        try {
            observation = Observation.createNotStarted(
                            AiObservationConvention.SPAN_QUERY_REWRITE, observationRegistry)
                    .highCardinalityKeyValue(AiObservationConvention.TAG_QUERY_ORIGINAL_LEN,
                            String.valueOf(query.length()))
                    .start();
            String context = buildHistoryContext(history);
            String rewritten = chatClient.prompt()
                    .system(systemPrompt)
                    .user(context + "\n\nLatest query: " + query + "\n\nRewritten query:")
                    .call()
                    .content();
            if (rewritten == null || rewritten.isBlank()) {
                log.debug("Query rewrite returned empty result, using original query");
                return query;
            }
            String cleaned = rewritten.trim();
            observation.highCardinalityKeyValue(AiObservationConvention.TAG_QUERY_REWRITTEN_LEN,
                    String.valueOf(cleaned.length()));
            log.debug("Query rewritten: \"{}\" → \"{}\"", query, cleaned);
            return cleaned;
        } catch (Exception e) {
            if (observation != null) {
                try { observation.error(e); } catch (Exception ex) { /* ignore */ }
            }
            log.warn("Query rewrite failed, falling back to original query: {}", e.getMessage());
            return query;
        } finally {
            if (observation != null) {
                try { observation.stop(); } catch (Exception ex) { /* ignore */ }
            }
        }
    }

    /**
     * 将最近 N 条消息格式化为对话历史文本。
     */
    private String buildHistoryContext(List<Message> history) {
        if (history == null || history.isEmpty()) {
            return "Conversation history: (none)";
        }

        // 取最近 N 条，且至少包含最后一条（即当前 query）
        List<Message> recent = history.size() > HISTORY_WINDOW_MESSAGES
                ? history.subList(history.size() - HISTORY_WINDOW_MESSAGES, history.size())
                : history;

        return recent.stream()
                .map(m -> formatRole(m.getMessageType()) + ": " + truncate(m.getText(), 500))
                .collect(Collectors.joining("\n", "Conversation history:\n", ""));
    }

    private static String formatRole(MessageType type) {
        return switch (type) {
            case USER -> "User";
            case ASSISTANT -> "Assistant";
            case SYSTEM -> "System";
            default -> "Tool";
        };
    }

    private static String truncate(String text, int maxLen) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        if (text.length() <= maxLen) {
            return text;
        }
        return text.substring(0, maxLen) + "...";
    }
}
