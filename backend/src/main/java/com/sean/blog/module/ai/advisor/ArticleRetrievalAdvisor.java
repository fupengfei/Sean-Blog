package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.config.ChatProperties;
import com.sean.blog.module.ai.service.ArticleVectorService;
import com.sean.blog.module.ai.service.LuceneVectorService;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 全站 RAG 注入 Advisor（order 200）。
 *
 * <p>每轮提问向量检索相关文章，剔除当前文章后取前 N 条，
 * 按 ID 批量查库补齐 slug（供模型调用 getArticleBySlug 取全文），
 * 格式化为「---相关文章---」区块前置到用户消息。</p>
 *
 * <p>检索失败或无结果时返回未修改的请求（降级为纯聊天）。</p>
 */
@Component
public class ArticleRetrievalAdvisor implements BaseAdvisor {

    private static final Logger log = LoggerFactory.getLogger(ArticleRetrievalAdvisor.class);

    private final ArticleVectorService articleVectorService;
    private final ArticleMapper articleMapper;
    private final ChatProperties chatProperties;

    public ArticleRetrievalAdvisor(ArticleVectorService articleVectorService,
                                   ArticleMapper articleMapper,
                                   ChatProperties chatProperties) {
        this.articleVectorService = articleVectorService;
        this.articleMapper = articleMapper;
        this.chatProperties = chatProperties;
    }

    @Override
    public String getName() {
        return "ArticleRetrievalAdvisor";
    }

    @Override
    public int getOrder() {
        return 200;
    }

    @Override
    public ChatClientRequest before(ChatClientRequest request, AdvisorChain chain) {
        String query = lastUserText(request);
        if (query == null || query.isBlank()) {
            return request;
        }
        try {
            Long excludeId = asLong(request.context().get(ArticleContextAdvisor.ARTICLE_ID_PARAM));

            List<LuceneVectorService.SearchResult> results =
                    articleVectorService.search(query, chatProperties.getRag().getFetchSize());

            if (excludeId != null) {
                String exclude = String.valueOf(excludeId);
                results = results.stream()
                        .filter(r -> !exclude.equals(r.id()))
                        .collect(Collectors.toList());
            }
            results = results.stream()
                    .limit(chatProperties.getRag().getKeepSize())
                    .collect(Collectors.toList());

            if (results.isEmpty()) {
                return request;
            }

            Map<Long, String> slugById = loadSlugs(results);

            String context = results.stream()
                    .map(r -> formatEntry(r, slugById.get(parseId(r.id()))))
                    .collect(Collectors.joining("\n\n"));

            String block = "以下是全站检索到的与问题相关的博客文章，请参考这些内容回答。" +
                    "如果内容不相关，请忽略并正常回答。\n\n---相关文章---\n" + context + "\n---文章结束---";

            return AdvisorMessages.prependToLastUserMessage(request, block + "\n\n");
        } catch (Exception e) {
            log.warn("RAG retrieval failed, falling back to direct chat: {}", e.getMessage());
            return request;
        }
    }

    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain chain) {
        return response;
    }

    private Map<Long, String> loadSlugs(List<LuceneVectorService.SearchResult> results) {
        List<Long> ids = results.stream()
                .map(r -> parseId(r.id()))
                .filter(id -> id != null)
                .collect(Collectors.toList());
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> slugById = new HashMap<>();
        for (Article a : articleMapper.findSummaryByIds(ids)) {
            slugById.put(a.getId(), a.getSlug());
        }
        return slugById;
    }

    private String formatEntry(LuceneVectorService.SearchResult r, String slug) {
        String content = r.content() != null && !r.content().isEmpty() ? r.content() : "(无摘要)";
        String slugLine = slug != null ? "\nslug: " + slug : "";
        return String.format("### 《%s》%s\n%s", r.title(), slugLine, content);
    }

    private Long parseId(String id) {
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException e) {
            return null;
        }
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

    private String lastUserText(ChatClientRequest request) {
        var messages = request.prompt().getInstructions();
        for (int i = messages.size() - 1; i >= 0; i--) {
            if (messages.get(i).getMessageType() == MessageType.USER) {
                return messages.get(i).getText();
            }
        }
        return null;
    }
}
