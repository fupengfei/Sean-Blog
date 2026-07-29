package com.sean.blog.module.wechat;

import com.sean.blog.common.Result;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 微信公众号 JS-SDK 签名接口。
 *
 * <p>前端页面加载时调用此接口获取 {@code wx.config()} 所需的
 * appId、timestamp、nonceStr、signature，用于配置微信 JS-SDK。</p>
 *
 * <p>接口路径：{@code GET /api/v1/wechat/jsapi-signature?url=...}</p>
 */
@RestController
@RequestMapping("/api/v1")
public class WechatController {

    private final WechatService wechatService;

    public WechatController(WechatService wechatService) {
        this.wechatService = wechatService;
    }

    /**
     * 获取 JS-SDK 签名。
     *
     * @param url 当前页面完整 URL（不含 # 之后的部分），由前端传入
     * @return 签名结果（appId、timestamp、nonceStr、signature）
     */
    @GetMapping("/wechat/jsapi-signature")
    public Result<?> getJsapiSignature(@RequestParam String url) {
        WechatService.JsapiSignResult signResult = wechatService.sign(url);

        if (!signResult.isOk()) {
            return Result.error(500, signResult.getError());
        }

        return Result.success(Map.of(
                "appId", signResult.getAppId(),
                "timestamp", String.valueOf(signResult.getTimestamp()),
                "nonceStr", signResult.getNonceStr(),
                "signature", signResult.getSignature()
        ));
    }
}
