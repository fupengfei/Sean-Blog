package com.sean.blog.module.analytics.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.analytics.dto.PageViewRequest;
import com.sean.blog.module.analytics.service.PageViewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class PageViewController {

    private final PageViewService pageViewService;

    public PageViewController(PageViewService pageViewService) {
        this.pageViewService = pageViewService;
    }

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
