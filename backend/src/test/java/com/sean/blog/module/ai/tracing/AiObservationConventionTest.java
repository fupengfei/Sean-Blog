package com.sean.blog.module.ai.tracing;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AiObservationConvention 常量完整性测试。
 */
class AiObservationConventionTest {

    @Test
    void spanNamesShouldFollowNamingConvention() {
        // span 名称应为小写字母 + 数字 + 冒号/连字符，不含空格
        assertThat(AiObservationConvention.SPAN_CHAT_REQUEST).matches("[a-z][a-z0-9:-]*");
        assertThat(AiObservationConvention.SPAN_CHAT_LLM).matches("[a-z][a-z0-9:-]*");
        assertThat(AiObservationConvention.SPAN_QUERY_REWRITE).matches("[a-z][a-z0-9:-]*");
        assertThat(AiObservationConvention.SPAN_EMBEDDING_SEARCH).matches("[a-z][a-z0-9:-]*");
        assertThat(AiObservationConvention.SPAN_LUCENE_SEARCH).matches("[a-z][a-z0-9:-]*");
        assertThat(AiObservationConvention.SPAN_ARTICLE_CONTEXT).matches("[a-z][a-z0-9:-]*");
    }

    @Test
    void tagKeysShouldFollowNamingConvention() {
        // tag key 应为小写字母 + 数字 + 点号/下划线分隔符，不含空格
        assertThat(AiObservationConvention.TAG_CONVERSATION_ID).matches("[a-z][a-z0-9._]*");
        assertThat(AiObservationConvention.TAG_AI_MODEL).matches("[a-z][a-z0-9._]*");
        assertThat(AiObservationConvention.TAG_MESSAGE_LENGTH).matches("[a-z][a-z0-9._]*");
    }

    @Test
    void spanNamesShouldBeUnique() {
        String[] names = {
                AiObservationConvention.SPAN_CHAT_REQUEST,
                AiObservationConvention.SPAN_CHAT_LLM,
                AiObservationConvention.SPAN_QUERY_REWRITE,
                AiObservationConvention.SPAN_EMBEDDING_SEARCH,
                AiObservationConvention.SPAN_LUCENE_SEARCH,
                AiObservationConvention.SPAN_ARTICLE_CONTEXT
        };
        assertThat(names).doesNotHaveDuplicates();
    }

    @Test
    void tagKeysShouldBeUnique() {
        String[] keys = {
                AiObservationConvention.TAG_CONVERSATION_ID,
                AiObservationConvention.TAG_AI_MODEL,
                AiObservationConvention.TAG_EMBEDDING_MODEL,
                AiObservationConvention.TAG_TOOL_NAME,
                AiObservationConvention.TAG_LUCENE_TOP_K,
                AiObservationConvention.TAG_MESSAGE_LENGTH,
                AiObservationConvention.TAG_QUERY_ORIGINAL_LEN,
                AiObservationConvention.TAG_QUERY_REWRITTEN_LEN,
                AiObservationConvention.TAG_TOOL_RESULT_LEN,
                AiObservationConvention.TAG_TOTAL_DURATION_MS,
                AiObservationConvention.TAG_FINISH_REASON
        };
        assertThat(keys).doesNotHaveDuplicates();
    }
}
