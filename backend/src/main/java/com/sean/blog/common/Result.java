package com.sean.blog.common;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 统一 API 响应包装类，所有对外接口的返回值都使用此结构。
 *
 * <p>前端根据 {@code code} 字段判断请求是否成功（200 表示成功），
 * {@code message} 提供可读的提示信息，{@code data} 携带具体业务数据。</p>
 *
 * @param <T> 业务数据的类型（可为任意 POJO、集合、基本类型或 {@code null}）
 */
@Data
@AllArgsConstructor
public class Result<T> {

    /** HTTP 风格的状态码（200 表示成功，其他表示异常） */
    private int code;

    /** 提示消息，成功时为 "success"，异常时为具体错误描述 */
    private String message;

    /** 业务数据载荷，无数据时为 {@code null} */
    private T data;

    /**
     * 创建带数据的成功响应。
     *
     * @param data 业务数据
     * @param <T>  数据类型
     * @return code=200、message="success" 的成功响应
     */
    public static <T> Result<T> success(T data) {
        return new Result<>(200, "success", data);
    }

    /**
     * 创建无数据的成功响应（适用于更新、删除等只需确认成功的操作）。
     *
     * @param <T> 数据类型（此处 {@code data} 为 {@code null}）
     * @return code=200、message="success"、data=null 的成功响应
     */
    public static <T> Result<T> success() {
        return new Result<>(200, "success", null);
    }

    /**
     * 创建错误响应。
     *
     * @param code    业务错误码（如 400、403、500 等）
     * @param message 错误描述信息
     * @param <T>     数据类型（此处 {@code data} 为 {@code null}）
     * @return 携带错误码和错误消息的响应，data 为 null
     */
    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }
}
