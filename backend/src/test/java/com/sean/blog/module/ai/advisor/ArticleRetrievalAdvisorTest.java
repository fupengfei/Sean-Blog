package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.config.ChatProperties;
import com.sean.blog.module.ai.service.ArticleVectorService;
import com.sean.blog.module.ai.service.LuceneVectorService;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleRetrievalAdvisorTest {

    @Mock
    private ArticleVectorService vectorService;
    @Mock
    private ArticleMapper articleMapper;

    private final AdvisorChain chain = mock(AdvisorChain.class);

    private ArticleRetrievalAdvisor advisor() {
        return new ArticleRetrievalAdvisor(vectorService, articleMapper, new ChatProperties());
    }

    private String lastUserText(ChatClientRequest request) {
        List<Message> messages = request.prompt().getInstructions();
        return messages.get(messages.size() - 1).getText();
    }

    private Article summary(long id, String slug) {
        Article a = new Article();
        a.setId(id);
        a.setSlug(slug);
        return a;
    }

    @Test
    void injectsRagBlockWithSlug() {
        when(vectorService.search("java", 4)).thenReturn(List.of(
                new LuceneVectorService.SearchResult("1", "Java 入门", "摘要一", 0.9f)));
        when(articleMapper.findSummaryByIds(List.of(1L))).thenReturn(List.of(summary(1L, "java-intro-123")));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")), Map.of());
        ChatClientRequest out = advisor().before(request, chain);

        String text = lastUserText(out);
        assertTrue(text.startsWith("以下是全站检索到的"));
        assertTrue(text.contains("---相关文章---"));
        assertTrue(text.contains("《Java 入门》"));
        assertTrue(text.contains("java-intro-123"));
        assertTrue(text.endsWith("java"));
    }

    @Test
    void excludesCurrentArticle() {
        when(vectorService.search("java", 4)).thenReturn(List.of(
                new LuceneVectorService.SearchResult("1", "当前", "x", 0.9f),
                new LuceneVectorService.SearchResult("2", "其他", "y", 0.8f)));
        when(articleMapper.findSummaryByIds(List.of(2L))).thenReturn(List.of(summary(2L, "other-1")));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")),
                Map.of(ArticleContextAdvisor.ARTICLE_ID_PARAM, 1L));
        String text = lastUserText(advisor().before(request, chain));

        assertFalse(text.contains("《当前》"));
        assertTrue(text.contains("《其他》"));
    }

    @Test
    void noResultsReturnsSameRequest() {
        when(vectorService.search(anyString(), anyInt())).thenReturn(List.of());

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")), Map.of());
        assertSame(request, advisor().before(request, chain));
    }

    @Test
    void searchFailureDegradesToSameRequest() {
        when(vectorService.search(anyString(), anyInt())).thenThrow(new RuntimeException("embedding down"));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")), Map.of());
        assertSame(request, advisor().before(request, chain));
    }

    @Test
    void limitsToKeepSize() {
        when(vectorService.search("java", 4)).thenReturn(List.of(
                new LuceneVectorService.SearchResult("1", "A", "a", 0.9f),
                new LuceneVectorService.SearchResult("2", "B", "b", 0.8f),
                new LuceneVectorService.SearchResult("3", "C", "c", 0.7f),
                new LuceneVectorService.SearchResult("4", "D", "d", 0.6f)));
        when(articleMapper.findSummaryByIds(anyList())).thenReturn(List.of(
                summary(1L, "a"), summary(2L, "b"), summary(3L, "c")));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")), Map.of());
        String text = lastUserText(advisor().before(request, chain));

        assertTrue(text.contains("《A》") && text.contains("《C》"));
        assertFalse(text.contains("《D》"));
    }
}
