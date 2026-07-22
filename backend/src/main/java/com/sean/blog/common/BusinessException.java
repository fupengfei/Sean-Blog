package com.sean.blog.common;

import lombok.Getter;

/**
 * 业务逻辑异常，用于在 Service 层主动抛出自定义错误。
 *
 * <p>由 {@link GlobalExceptionHandler#handleBusinessException(BusinessException)} 统一捕获
 * 并转换为 {@link Result} 错误响应返回给前端。</p>
 *
 * <p>使用示例：
 * <pre>{@code
 * throw new BusinessException(404, "文章不存在");
 * throw new BusinessException("参数非法"); // 默认 code=400
 * }</pre>
 * </p>
 */
@Getter
public class BusinessException extends RuntimeException {

    /** 业务错误码 */
    private final int code;

    /**
     * 使用自定义错误码和错误消息构造业务异常。
     *
     * @param code    业务错误码（如 400、404、409 等 HTTP 状态码风格的业务码）
     * @param message 错误描述，会作为 {@link Result#message} 返回给前端
     */
    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    /**
     * 使用默认错误码 400 构造业务异常（适用于参数校验、通用业务错误等场景）。
     *
     * @param message 错误描述，会作为 {@link Result#message} 返回给前端
     */
    public BusinessException(String message) {
        this(400, message);
    }
}
