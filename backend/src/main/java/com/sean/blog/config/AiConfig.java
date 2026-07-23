package com.sean.blog.config;

import com.sean.blog.module.ai.advisor.ArticleContextAdvisor;
import com.sean.blog.module.ai.advisor.ArticleRetrievalAdvisor;
import com.sean.blog.module.ai.advisor.ConversationPersistenceAdvisor;
import com.sean.blog.module.ai.config.ChatProperties;
import com.sean.blog.module.ai.memory.ResilientChatMemory;
import com.sean.blog.module.ai.memory.SpringRedisChatMemoryRepository;
import com.sean.blog.module.ai.tool.ArticleTools;
import com.sean.blog.module.ai.tool.ContactTools;
import com.sean.blog.module.ai.tool.ProjectTools;
import com.sean.blog.module.ai.tool.SkillTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;

@Configuration
@EnableConfigurationProperties(ChatProperties.class)
public class AiConfig {

    @Bean
    public EmbeddingModel embeddingModel(
            @Value("${spring.ai.openai.embedding.api-key}") String apiKey,
            @Value("${spring.ai.openai.embedding.base-url}") String baseUrl,
            @Value("${spring.ai.openai.embedding.model}") String model) {

        var options = OpenAiEmbeddingOptions.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .model(model)
                .build();

        return OpenAiEmbeddingModel.builder()
                .options(options)
                .build();
    }

    @Bean
    public ChatMemoryRepository chatMemoryRepository(StringRedisTemplate redisTemplate,
                                                     ObjectMapper objectMapper,
                                                     ChatProperties chatProperties) {
        return new SpringRedisChatMemoryRepository(
                redisTemplate, objectMapper, chatProperties.getMemoryTtl(), "chat:memory:");
    }

    @Bean
    public ChatMemory chatMemory(ChatMemoryRepository chatMemoryRepository,
                                 ChatProperties chatProperties) {
        return new ResilientChatMemory(MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(chatProperties.getMemoryWindow())
                .build());
    }

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder,
                                 ChatMemory chatMemory,
                                 ConversationPersistenceAdvisor conversationPersistenceAdvisor,
                                 ArticleRetrievalAdvisor articleRetrievalAdvisor,
                                 ArticleContextAdvisor articleContextAdvisor,
                                 ArticleTools articleTools,
                                 ProjectTools projectTools,
                                 SkillTools skillTools,
                                 ContactTools contactTools) {
        return builder
                .defaultSystem(new ClassPathResource("prompt/system-prompt.md"), StandardCharsets.UTF_8)
                .defaultAdvisors(
                        conversationPersistenceAdvisor,        // order 0
                        new SimpleLoggerAdvisor(50),           // order 50
                        MessageChatMemoryAdvisor.builder(chatMemory).order(100).build(),
                        articleRetrievalAdvisor,               // order 200
                        articleContextAdvisor)                 // order 300
                .defaultTools(articleTools, projectTools, skillTools, contactTools)
                .build();
    }
}
