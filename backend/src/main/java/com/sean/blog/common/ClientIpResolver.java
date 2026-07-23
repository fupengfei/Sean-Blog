package com.sean.blog.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * 客户端真实 IP 提取器。
 *
 * <p>依次检查 X-Forwarded-For、Proxy-Client-IP 等代理头部，最后回退到 RemoteAddr。
 * 多级代理时 X-Forwarded-For 为逗号分隔列表，取第一个（最接近客户端的 IP）。</p>
 */
@Component
public class ClientIpResolver {

    public String resolve(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (isEmptyOrUnknown(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (isEmptyOrUnknown(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (isEmptyOrUnknown(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (isEmptyOrUnknown(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (isEmptyOrUnknown(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private boolean isEmptyOrUnknown(String ip) {
        return ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip);
    }
}
