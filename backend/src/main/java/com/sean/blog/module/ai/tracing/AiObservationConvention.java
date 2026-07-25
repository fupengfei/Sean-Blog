package com.sean.blog.module.ai.tracing;

/**
 * AI 链路追踪常量：统一管理 span 名称和 tag key，
 * 避免字符串散落在各组件中。
 *
 * <p>本类不实现 {@link io.micrometer.observation.ObservationConvention}，
 * tag 由各组件在创建 Observation 时直接设置。</p>
 */
public final class AiObservationConvention {

    private AiObservationConvention() {
        // 工具类，禁止实例化
    }

    // ---- Span 名称 ----

    /** 根 span：一次完整的聊天请求（AiTracingAdvisor 创建） */
    public static final String SPAN_CHAT_REQUEST = "chat-request";

    /** ChatClient 主 LLM 调用 span */
    public static final String SPAN_CHAT_LLM = "chat:llm";

    /** 查询重写 LLM 调用 span */
    public static final String SPAN_QUERY_REWRITE = "query-rewrite:llm";

    /** Embedding API 调用 span */
    public static final String SPAN_EMBEDDING_SEARCH = "embedding:search";

    /** Lucene 本地向量检索 span */
    public static final String SPAN_LUCENE_SEARCH = "lucene:search";

    /** 文件内容加载 span */
    public static final String SPAN_ARTICLE_CONTEXT = "article-context:load";

    // ---- 低基数 tag（用于分组过滤） ----

    public static final String TAG_CONVERSATION_ID = "conversation.id";
    public static final String TAG_AI_MODEL = "ai.model";
    public static final String TAG_EMBEDDING_MODEL = "embedding.model";
    public static final String TAG_TOOL_NAME = "tool.name";
    public static final String TAG_LUCENE_TOP_K = "lucene.top_k";

    // ---- 高基数 tag（用于单次排查） ----

    public static final String TAG_MESSAGE_LENGTH = "user.message_length";
    public static final String TAG_QUERY_ORIGINAL_LEN = "query.original_length";
    public static final String TAG_QUERY_REWRITTEN_LEN = "query.rewritten_length";
    public static final String TAG_TOOL_RESULT_LEN = "tool.result_length";
    public static final String TAG_TOTAL_DURATION_MS = "total.duration_ms";
    public static final String TAG_FINISH_REASON = "finish.reason";
}
