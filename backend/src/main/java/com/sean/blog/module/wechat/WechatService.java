package com.sean.blog.module.wechat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Formatter;
import java.util.UUID;

/**
 * 微信公众号 JS-SDK 签名服务。
 *
 * <p>负责调用微信开放平台 API 获取 access_token 和 jsapi_ticket，
 * 并生成 JS-SDK 初始化所需的签名（signature）、随机字符串（noncestr）
 * 和时间戳（timestamp）。</p>
 *
 * <p>access_token 和 jsapi_ticket 均缓存在内存中，每次请求校验是否过期
 * （默认 7200s），过期后自动刷新。当前为单机部署，使用 volatile + 时间戳
 * 的简单缓存策略。</p>
 */
@Service
public class WechatService {

    private static final Logger log = LoggerFactory.getLogger(WechatService.class);

    /** 微信 API 主机 */
    private static final String API_BASE = "https://api.weixin.qq.com";

    /** access_token / jsapi_ticket 有效期（秒），微信默认 7200，留 300s 安全余量 */
    private static final long CACHE_TTL_SECONDS = 6900;

    @Value("${wechat.app-id:}")
    private String appId;

    @Value("${wechat.app-secret:}")
    private String appSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    // ---- 缓存字段 ----
    private volatile String cachedAccessToken;
    private volatile long accessTokenExpireAt;

    private volatile String cachedJsapiTicket;
    private volatile long jsapiTicketExpireAt;

    // =========================================================================
    // 公开接口
    // =========================================================================

    /**
     * 返回 JS-SDK 签名结果，供前端 {@code wx.config()} 使用。
     *
     * @param url 当前页面完整 URL（不含 hash 部分）
     * @return 签名结果（appId、timestamp、nonceStr、signature）
     */
    public JsapiSignResult sign(String url) {
        if (appId == null || appId.isBlank()) {
            return JsapiSignResult.error("WeChat AppID not configured");
        }
        if (appSecret == null || appSecret.isBlank()) {
            return JsapiSignResult.error("WeChat AppSecret not configured");
        }

        String ticket = getJsapiTicket();
        if (ticket == null) {
            return JsapiSignResult.error("Failed to obtain jsapi_ticket");
        }

        String nonceStr = UUID.randomUUID().toString().replace("-", "");
        long timestamp = System.currentTimeMillis() / 1000;
        String signature = sha1(
                "jsapi_ticket=" + ticket +
                "&noncestr=" + nonceStr +
                "&timestamp=" + timestamp +
                "&url=" + url
        );

        return new JsapiSignResult(appId, timestamp, nonceStr, signature, null);
    }

    // =========================================================================
    // 内部：access_token
    // =========================================================================

    private synchronized String getAccessToken() {
        if (cachedAccessToken != null && System.currentTimeMillis() < accessTokenExpireAt) {
            return cachedAccessToken;
        }
        return refreshAccessToken();
    }

    private String refreshAccessToken() {
        String url = API_BASE + "/cgi-bin/token?grant_type=client_credential"
                + "&appid=" + appId + "&secret=" + appSecret;
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                log.error("Failed to get access_token: HTTP {}", resp.statusCode());
                return cachedAccessToken;
            }
            JsonNode json = objectMapper.readTree(resp.body());
            if (json.has("errcode") && json.get("errcode").asInt() != 0) {
                log.error("Failed to get access_token: errcode={} errmsg={}",
                        json.get("errcode").asInt(), json.has("errmsg") ? json.get("errmsg").asText() : "");
                return cachedAccessToken;
            }
            String token = json.get("access_token").asText();
            cachedAccessToken = token;
            accessTokenExpireAt = System.currentTimeMillis() + CACHE_TTL_SECONDS * 1000;
            log.info("access_token refreshed, expires in {}s", CACHE_TTL_SECONDS);
            return token;
        } catch (Exception e) {
            log.error("Failed to refresh access_token: {}", e.getMessage());
            return cachedAccessToken;
        }
    }

    // =========================================================================
    // 内部：jsapi_ticket
    // =========================================================================

    private synchronized String getJsapiTicket() {
        if (cachedJsapiTicket != null && System.currentTimeMillis() < jsapiTicketExpireAt) {
            return cachedJsapiTicket;
        }
        return refreshJsapiTicket();
    }

    private String refreshJsapiTicket() {
        String token = getAccessToken();
        if (token == null) {
            return null;
        }
        String url = API_BASE + "/cgi-bin/ticket/getticket?access_token=" + token + "&type=jsapi";
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                log.error("Failed to get jsapi_ticket: HTTP {}", resp.statusCode());
                return cachedJsapiTicket;
            }
            JsonNode json = objectMapper.readTree(resp.body());
            if (json.get("errcode").asInt() != 0) {
                log.error("Failed to get jsapi_ticket: errcode={} errmsg={}",
                        json.get("errcode").asInt(), json.has("errmsg") ? json.get("errmsg").asText() : "");
                return cachedJsapiTicket;
            }
            String ticket = json.get("ticket").asText();
            cachedJsapiTicket = ticket;
            jsapiTicketExpireAt = System.currentTimeMillis() + CACHE_TTL_SECONDS * 1000;
            log.info("jsapi_ticket refreshed, expires in {}s", CACHE_TTL_SECONDS);
            return ticket;
        } catch (Exception e) {
            log.error("Failed to refresh jsapi_ticket: {}", e.getMessage());
            return cachedJsapiTicket;
        }
    }

    // =========================================================================
    // 工具方法
    // =========================================================================

    /**
     * SHA1 哈希（hex 编码）。
     */
    private static String sha1(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            Formatter formatter = new Formatter();
            for (byte b : digest) {
                formatter.format("%02x", b);
            }
            String result = formatter.toString();
            formatter.close();
            return result;
        } catch (Exception e) {
            throw new RuntimeException("SHA-1 failed", e);
        }
    }

    // =========================================================================
    // 内部 DTO
    // =========================================================================

    /**
     * JS-SDK 签名结果。
     */
    public static class JsapiSignResult {
        private final String appId;
        private final long timestamp;
        private final String nonceStr;
        private final String signature;
        private final String error;

        JsapiSignResult(String appId, long timestamp, String nonceStr, String signature, String error) {
            this.appId = appId;
            this.timestamp = timestamp;
            this.nonceStr = nonceStr;
            this.signature = signature;
            this.error = error;
        }

        static JsapiSignResult error(String message) {
            return new JsapiSignResult(null, 0, null, null, message);
        }

        public String getAppId() { return appId; }
        public long getTimestamp() { return timestamp; }
        public String getNonceStr() { return nonceStr; }
        public String getSignature() { return signature; }
        public String getError() { return error; }
        public boolean isOk() { return error == null; }
    }
}
