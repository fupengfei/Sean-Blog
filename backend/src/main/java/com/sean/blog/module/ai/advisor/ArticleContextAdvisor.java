package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.service.ArticleContextService;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 「当前文章」上下文注入 Advisor（order 300，链最内层）。
 *
 * <p>文章详情页提问时前端传 articleId，本 advisor 把文章全文区块
 * 前置到最后一条用户消息。加载失败返回空区块（沿用 ArticleContextService 降级行为）。</p>
 */
@Component
public class ArticleContextAdvisor implements BaseAdvisor {

    /** advisor 参数键：用户正在阅读的文章 ID（前端经 ChatRequest 传入） */
    public static final String ARTICLE_ID_PARAM = "articleId";

    private final ArticleContextService articleContextService;

    public ArticleContextAdvisor(ArticleContextService articleContextService) {
        this.articleContextService = articleContextService;
    }

    @Override
    public String getName() {
        return "ArticleContextAdvisor";
    }

    @Override
    public int getOrder() {
        return 300;
    }

    @Override
    public ChatClientRequest before(ChatClientRequest request, AdvisorChain chain) {
        Long articleId = asLong(request.context().get(ARTICLE_ID_PARAM));
        if (articleId == null) {
            return request;
        }
        Optional<String> block = articleContextService.buildArticleContext(articleId);
        return block.map(b -> AdvisorMessages.prependToLastUserMessage(request, b + "\n\n"))
                .orElse(request);
    }

    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain chain) {
        return response;
    }

    private Long asLong(Object value) {
        if (value instanceof Long l) {
            return l;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        return null;
    }
}
