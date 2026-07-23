package com.sean.blog.module.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * AI 聊天配置（sean.ai.chat.*）：记忆窗口、Redis 记忆 TTL、RAG 检索参数。
 */
@ConfigurationProperties(prefix = "sean.ai.chat")
public class ChatProperties {

    /** 模型上下文记忆窗口（条数） */
    private int memoryWindow = 40;

    /** Redis 会话记忆 TTL */
    private Duration memoryTtl = Duration.ofDays(7);

    private Rag rag = new Rag();

    public int getMemoryWindow() { return memoryWindow; }
    public void setMemoryWindow(int memoryWindow) { this.memoryWindow = memoryWindow; }
    public Duration getMemoryTtl() { return memoryTtl; }
    public void setMemoryTtl(Duration memoryTtl) { this.memoryTtl = memoryTtl; }
    public Rag getRag() { return rag; }
    public void setRag(Rag rag) { this.rag = rag; }

    /** RAG 向量检索参数 */
    public static class Rag {
        /** 向量检索取数 */
        private int fetchSize = 4;
        /** 剔除当前文章后注入上限 */
        private int keepSize = 3;

        public int getFetchSize() { return fetchSize; }
        public void setFetchSize(int fetchSize) { this.fetchSize = fetchSize; }
        public int getKeepSize() { return keepSize; }
        public void setKeepSize(int keepSize) { this.keepSize = keepSize; }
    }
}
