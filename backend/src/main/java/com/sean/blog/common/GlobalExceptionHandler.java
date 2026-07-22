package com.sean.blog.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.util.stream.Collectors;

/**
 * 全局异常处理器，拦截 Controller 层抛出的异常并统一转换为 {@link Result} 响应。
 *
 * <p>按异常类型分层处理：</p>
 * <ol>
 *   <li>{@link BusinessException} — 已知业务异常，直接透传其错误码和消息。</li>
 *   <li>{@link MethodArgumentNotValidException} — Bean Validation 校验失败，汇总所有字段错误。</li>
 *   <li>{@link AccessDeniedException} — Spring Security 权限不足，返回 403。</li>
 *   <li>{@link Exception} — 兜底处理器，记录日志并返回 500，避免将堆栈信息泄露给客户端。</li>
 * </ol>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 处理已知的业务异常，将异常中的错误码和消息原样返回给前端。
     *
     * @param e 业务异常实例
     * @return 包含错误码和消息的 Result
     */
    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        return Result.error(e.getCode(), e.getMessage());
    }

    /**
     * 处理 Controller 方法参数校验失败异常（如 {@code @Valid} 校验不通过）。
     *
     * <p>将每个字段的错误信息拼接为 {@code "字段名: 错误描述; ..."} 格式。</p>
     *
     * @param e 参数校验异常实例
     * @return HTTP 400，body 包含汇总的校验错误信息
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<?> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return Result.error(400, message);
    }

    /**
     * 处理 Spring Security 权限拒绝异常（如未登录访问 Admin 接口）。
     *
     * @param e 权限拒绝异常实例
     * @return HTTP 403，提示无权限访问
     */
    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Result<?> handleAccessDeniedException(AccessDeniedException e) {
        return Result.error(403, "无权限访问");
    }

    /**
     * 处理 SSE 流式响应时客户端主动断开连接导致的异常。
     *
     * <p>客户端断开（关闭页面、终止按钮）是正常行为，不应记录为错误。
     * 此处理器必须在 {@link #handleException(Exception)} 之前被 Spring 匹配到，
     * 因为 {@code AsyncRequestNotUsableException} 继承自 {@link RuntimeException}。</p>
     *
     * @param e 异步请求不可用异常
     */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void handleAsyncRequestNotUsable(AsyncRequestNotUsableException e) {
        // 安静吞掉，客户端断开 SSE 连接是正常行为
    }

    /**
     * 兜底异常处理器，拦截所有未被前述处理器捕获的异常。
     *
     * <p>记录完整堆栈日志供排查，向前端返回通用的 500 错误，
     * 避免将内部实现细节泄露给客户端。</p>
     *
     * @param e 未预期的异常实例
     * @return HTTP 500，通用错误提示
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<?> handleException(Exception e) {
        log.error("未预期的服务器错误", e);
        return Result.error(500, "服务器内部错误，请稍后重试");
    }
}
