package com.sean.blog.module.analytics.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.analytics.dto.*;
import com.sean.blog.module.analytics.service.PageViewService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/stats")
public class AnalyticsAdminController {

    private final PageViewService pageViewService;

    public AnalyticsAdminController(PageViewService pageViewService) {
        this.pageViewService = pageViewService;
    }

    @GetMapping("/page-views")
    public Result<List<PageViewStatVO>> pageViewRanking(
            @RequestParam(defaultValue = "7d") String window,
            @RequestParam(required = false) String pageType) {
        return Result.success(pageViewService.getRanking(window, pageType));
    }

    @GetMapping("/page-views/trend")
    public Result<List<PageViewTrendVO>> pageViewTrend(
            @RequestParam(defaultValue = "7") int days) {
        return Result.success(pageViewService.getTrend(days));
    }

    @GetMapping("/page-views/summary")
    public Result<PageViewSummaryVO> pageViewSummary() {
        return Result.success(pageViewService.getSummary());
    }

    @GetMapping("/visitors/countries")
    public Result<List<CountryStatVO>> visitorCountries(
            @RequestParam(defaultValue = "7d") String window) {
        return Result.success(pageViewService.getVisitorCountries(window));
    }

    @GetMapping("/visitors/summary")
    public Result<VisitorSummaryVO> visitorSummary() {
        return Result.success(pageViewService.getVisitorSummary());
    }
}
