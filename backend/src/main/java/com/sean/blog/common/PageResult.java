package com.sean.blog.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

/**
 * 分页查询统一响应包装类，用于博客列表、项目列表等需要分页展示的接口。
 *
 * <p>前端根据 {@code total} 计算总页数并渲染分页器，{@code list} 存放当前页数据。</p>
 *
 * @param <T> 列表项的数据类型
 */
@Data
@AllArgsConstructor
public class PageResult<T> {

    /** 当前页的数据列表 */
    private List<T> list;

    /** 符合查询条件的总记录数 */
    private long total;

    /** 当前页码（从 1 开始） */
    private int page;

    /** 每页记录数 */
    private int size;
}
