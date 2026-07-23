package com.sean.blog.module.ai.advisor;

import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.ArrayList;
import java.util.List;

/** Advisor 共用的消息增强工具。 */
final class AdvisorMessages {

    private AdvisorMessages() {}

    /**
     * 把区块前置到请求中最后一条用户消息的文本前，返回新请求（原请求不可变）。
     */
    static ChatClientRequest prependToLastUserMessage(ChatClientRequest request, String block) {
        List<Message> messages = new ArrayList<>(request.prompt().getInstructions());
        for (int i = messages.size() - 1; i >= 0; i--) {
            if (messages.get(i).getMessageType() == MessageType.USER) {
                messages.set(i, new UserMessage(block + messages.get(i).getText()));
                break;
            }
        }
        Prompt prompt = request.prompt().mutate().messages(messages).build();
        return new ChatClientRequest(prompt, request.context());
    }
}
