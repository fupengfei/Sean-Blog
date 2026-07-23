package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.service.ArticleContextService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleContextAdvisorTest {

    @Mock
    private ArticleContextService articleContextService;

    private final AdvisorChain chain = mock(AdvisorChain.class);

    private ArticleContextAdvisor advisor() {
        return new ArticleContextAdvisor(articleContextService);
    }

    private String lastUserText(ChatClientRequest request) {
        List<Message> messages = request.prompt().getInstructions();
        return messages.get(messages.size() - 1).getText();
    }

    @Test
    void injectsArticleBlock() {
        when(articleContextService.buildArticleContext(5L))
                .thenReturn(Optional.of("---当前文章---\n《测试》\n正文\n---当前文章结束---"));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("这篇文章讲了什么？")),
                Map.of(ArticleContextAdvisor.ARTICLE_ID_PARAM, 5L));

        String text = lastUserText(advisor().before(request, chain));

        assertTrue(text.startsWith("---当前文章---"));
        assertTrue(text.endsWith("这篇文章讲了什么？"));
    }

    @Test
    void noArticleIdReturnsSameRequest() {
        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("你好")), Map.of());
        assertSame(request, advisor().before(request, chain));
    }

    @Test
    void emptyBlockReturnsSameRequest() {
        when(articleContextService.buildArticleContext(5L)).thenReturn(Optional.empty());

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("你好")),
                Map.of(ArticleContextAdvisor.ARTICLE_ID_PARAM, 5L));
        assertSame(request, advisor().before(request, chain));
    }

    @Test
    void orderIs300() {
        assertEquals(300, advisor().getOrder());
    }
}
