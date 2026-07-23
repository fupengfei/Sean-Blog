package com.sean.blog.common;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver();

    @Test
    void prefersXForwardedForFirstIp() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("1.2.3.4, 5.6.7.8");
        assertEquals("1.2.3.4", resolver.resolve(req));
    }

    @Test
    void skipsUnknownHeaderValues() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("unknown");
        when(req.getHeader("Proxy-Client-IP")).thenReturn(null);
        when(req.getHeader("WL-Proxy-Client-IP")).thenReturn(null);
        when(req.getHeader("HTTP_CLIENT_IP")).thenReturn(null);
        when(req.getHeader("HTTP_X_FORWARDED_FOR")).thenReturn(null);
        when(req.getRemoteAddr()).thenReturn("9.9.9.9");
        assertEquals("9.9.9.9", resolver.resolve(req));
    }

    @Test
    void fallsBackToRemoteAddr() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn(null);
        when(req.getHeader("Proxy-Client-IP")).thenReturn(null);
        when(req.getHeader("WL-Proxy-Client-IP")).thenReturn(null);
        when(req.getHeader("HTTP_CLIENT_IP")).thenReturn(null);
        when(req.getHeader("HTTP_X_FORWARDED_FOR")).thenReturn(null);
        when(req.getRemoteAddr()).thenReturn("127.0.0.1");
        assertEquals("127.0.0.1", resolver.resolve(req));
    }
}
