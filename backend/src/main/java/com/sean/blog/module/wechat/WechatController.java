package com.sean.blog.module.wechat;

import com.sean.blog.common.Result;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 微信公众号 JS-SDK 签名接口 + PC OpenSDK ticket 接口。
 *
 * <p>移动端：{@code GET /api/v1/wechat/jsapi-signature?url=...}</p>
 * <p>PC 端：{@code POST /api/v1/wechat/pc-ticket}</p>
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

    /**
     * 获取 PC OpenSDK 单次调用 ticket，供 {@code wxopensdk.shareLink()} 使用。
     *
     * @return ticket（5 分钟有效，一次一票）+ appId
     */
    @PostMapping("/wechat/pc-ticket")
    public Result<?> getPcTicket() {
        WechatService.PcTicketResult result = wechatService.fetchPcTicket();
        if (!result.isOk()) {
            String detail = String.format("[errcode=%d] %s", result.getErrcode(), result.getErrmsg());
            return Result.error(500, detail);
        }
        return Result.success(Map.of(
                "ticket", result.getTicket(),
                "appId", wechatService.getAppId()
        ));
    }
}
