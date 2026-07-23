package com.sean.blog.module.ai.tool;

import com.sean.blog.module.contact.service.ContactService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.model.ToolContext;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ContactToolsTest {

    @Mock
    private ContactService contactService;

    @InjectMocks
    private ContactTools tools;

    private ToolContext contextWithIp(String ip) {
        return new ToolContext(Map.of("ip", ip));
    }

    @Test
    void requestResumeRecordsWithSessionIp() {
        String result = tools.requestResume("a@b.com", "Acme", contextWithIp("1.2.3.4"));

        assertTrue(result.contains("已登记"));
        verify(contactService).recordResume("1.2.3.4", "Acme", "a@b.com");
    }

    @Test
    void requestResumeRejectsBadEmail() {
        String result = tools.requestResume("not-an-email", null, contextWithIp("1.2.3.4"));

        assertTrue(result.contains("邮箱格式不正确"));
        verify(contactService, never()).recordResume(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void subscribeRecords() {
        String result = tools.subscribeEmail("a@b.com", contextWithIp("1.2.3.4"));

        assertTrue(result.contains("已登记"));
        verify(contactService).recordSubscribe("1.2.3.4", "a@b.com");
    }

    @Test
    void subscribeRejectsBadEmail() {
        assertTrue(tools.subscribeEmail("bad", contextWithIp("1.2.3.4")).contains("邮箱格式不正确"));
    }
}
