package com.sean.blog.module.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PageViewRequest {

    @NotBlank(message = "pageType 不能为空")
    @Size(max = 32, message = "pageType 长度不能超过 32")
    private String pageType;

    @Size(max = 128, message = "pageKey 长度不能超过 128")
    private String pageKey = "";
}
