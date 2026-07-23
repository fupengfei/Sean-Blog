package com.sean.blog.module.contact.service;

import com.sean.blog.common.ClientIpResolver;
import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.contact.entity.ContactRecord;
import com.sean.blog.module.contact.mapper.ContactRecordMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContactServiceTest {

    @Mock
    private ContactRecordMapper contactRecordMapper;

    private final SnowflakeIdGenerator idGenerator = new SnowflakeIdGenerator();

    private ContactService service() {
        return new ContactService(contactRecordMapper, idGenerator, new ClientIpResolver());
    }

    @Test
    void recordResumeWithIpString() {
        service().recordResume("1.2.3.4", "Acme", "a@b.com");

        ArgumentCaptor<ContactRecord> captor = ArgumentCaptor.forClass(ContactRecord.class);
        verify(contactRecordMapper).insert(captor.capture());
        ContactRecord record = captor.getValue();
        assertEquals("RESUME", record.getType());
        assertEquals("1.2.3.4", record.getIpAddress());
        assertEquals("Acme", record.getCompanyName());
        assertEquals("a@b.com", record.getEmail());
    }

    @Test
    void recordSubscribeWithIpString() {
        service().recordSubscribe("1.2.3.4", "a@b.com");

        ArgumentCaptor<ContactRecord> captor = ArgumentCaptor.forClass(ContactRecord.class);
        verify(contactRecordMapper).insert(captor.capture());
        assertEquals("SUBSCRIBE", captor.getValue().getType());
        assertEquals("1.2.3.4", captor.getValue().getIpAddress());
    }

    @Test
    void requestBasedOverloadsDelegateToResolver() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("8.8.8.8");

        service().recordResume(req, "Acme", "a@b.com");
        service().recordSubscribe(req, "a@b.com");

        ArgumentCaptor<ContactRecord> captor = ArgumentCaptor.forClass(ContactRecord.class);
        verify(contactRecordMapper, org.mockito.Mockito.times(2)).insert(captor.capture());
        captor.getAllValues().forEach(r -> assertEquals("8.8.8.8", r.getIpAddress()));
    }
}
