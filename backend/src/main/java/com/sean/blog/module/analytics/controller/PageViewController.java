package com.sean.blog.module.analytics.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.analytics.dto.PageViewRequest;
import com.sean.blog.module.analytics.service.PageViewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 页面访问统计公开接口，无需认证，供前端 JS 埋点脚本 POST 提交 PV 数据。
 * 内置基于 Redis 的 IP 级别限流（每分钟 30 次）。
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1")
public class PageViewController {

    private final PageViewService pageViewService;

    public PageViewController(PageViewService pageViewService) {
        this.pageViewService = pageViewService;
    }

    /**
     * 记录一次页面访问。
     * 流程：提取 IP → 限流检查 → 参数校验 → Redis 计数 → 异步写日志 + 地理位置解析。
     *
     * @param req     页面访问请求（pageType + pageKey）
     * @param request HTTP 请求，用于提取真实 IP
     * @return POST /api/v1/page-views
     */
    @PostMapping("/page-views")
    public Result<?> record(@Valid @RequestBody PageViewRequest req, HttpServletRequest request) {
        String ip = extractIp(request);

        // 限流检查
        if (!pageViewService.checkRateLimit(ip)) {
            Map<String, Object> error = new HashMap<>();
            error.put("code", 429);
            error.put("message", "请求过于频繁，请稍后再试");
            return Result.error(429, "请求过于频繁，请稍后再试");
        }

        pageViewService.record(req.getPageType(), req.getPageKey(), ip);
        return Result.success();
    }

    /**
     * 从 HttpServletRequest 中提取真实客户端 IP。
     * 依次检查 X-Forwarded-For → X-Real-IP → RemoteAddr。
     */
    private String extractIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) {
            return xri.trim();
        }
        return request.getRemoteAddr();
    }
}
