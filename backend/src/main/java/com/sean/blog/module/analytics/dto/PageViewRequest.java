package com.sean.blog.module.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 页面访问记录请求 DTO，由前端 JS 埋点脚本 POST 提交。
 *
 * @author sean
 */
@Data
public class PageViewRequest {

    /** 页面类型，必填，如 home / blog_detail */
    @NotBlank(message = "pageType 不能为空")
    @Size(max = 32, message = "pageType 长度不能超过 32")
    private String pageType;

    /** 页面唯一标识，如文章 slug，可选 */
    @Size(max = 128, message = "pageKey 长度不能超过 128")
    private String pageKey = "";
}
