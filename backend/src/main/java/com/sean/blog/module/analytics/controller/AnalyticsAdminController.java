package com.sean.blog.module.analytics.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.analytics.dto.*;
import com.sean.blog.module.analytics.service.PageViewService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 数据分析后台接口控制器，所有接口路径均在 /api/v1/admin/stats 下，需要 JWT 认证。
 * 提供 PV 排行、趋势、汇总和访客国家分布等 Dashboard 数据。
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1/admin/stats")
public class AnalyticsAdminController {

    private final PageViewService pageViewService;

    public AnalyticsAdminController(PageViewService pageViewService) {
        this.pageViewService = pageViewService;
    }

    /**
     * 获取页面 PV 排行。
     *
     * @param window   时间窗口：7d / 30d / 90d，默认 7d
     * @param pageType 可选，按页面类型筛选
     * @return GET /api/v1/admin/stats/page-views
     */
    @GetMapping("/page-views")
    public Result<List<PageViewStatVO>> pageViewRanking(
            @RequestParam(defaultValue = "7d") String window,
            @RequestParam(required = false) String pageType) {
        return Result.success(pageViewService.getRanking(window, pageType));
    }

    /**
     * 获取 PV 趋势数据（按天、按页面类型分组）。
     *
     * @param days 返回最近 N 天的数据，默认 7
     * @return GET /api/v1/admin/stats/page-views/trend
     */
    @GetMapping("/page-views/trend")
    public Result<List<PageViewTrendVO>> pageViewTrend(
            @RequestParam(defaultValue = "7") int days) {
        return Result.success(pageViewService.getTrend(days));
    }

    /**
     * 获取 PV 汇总数据（总 PV、今日 PV、环比变化）。
     *
     * @return GET /api/v1/admin/stats/page-views/summary
     */
    @GetMapping("/page-views/summary")
    public Result<PageViewSummaryVO> pageViewSummary() {
        return Result.success(pageViewService.getSummary());
    }

    /**
     * 获取访客国家/地区分布排名。
     *
     * @param window 时间窗口：7d / 30d / 90d，默认 7d
     * @return GET /api/v1/admin/stats/visitors/countries
     */
    @GetMapping("/visitors/countries")
    public Result<List<CountryStatVO>> visitorCountries(
            @RequestParam(defaultValue = "7d") String window) {
        return Result.success(pageViewService.getVisitorCountries(window));
    }

    /**
     * 获取访客汇总数据（总 UV、今日 UV、近 7 天 UV）。
     *
     * @return GET /api/v1/admin/stats/visitors/summary
     */
    @GetMapping("/visitors/summary")
    public Result<VisitorSummaryVO> visitorSummary() {
        return Result.success(pageViewService.getVisitorSummary());
    }
}
