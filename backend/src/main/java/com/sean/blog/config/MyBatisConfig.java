package com.sean.blog.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

/**
 * MyBatis Mapper 接口扫描配置。
 *
 * <p>通过通配符模式 {@code com.sean.blog.module.*.mapper} 一次性扫描所有业务模块下的 Mapper 接口，
 * 无需为每个模块单独配置扫描路径。新增模块时只要遵循 {@code module.{模块名}.mapper} 包结构，
 * Mapper 接口即会自动注册到 Spring 容器。</p>
 *
 * <p>扫描范围示例：</p>
 * <ul>
 *   <li>{@code com.sean.blog.module.blog.mapper.ArticleMapper}</li>
 *   <li>{@code com.sean.blog.module.project.mapper.ProjectMapper}</li>
 *   <li>{@code com.sean.blog.module.file.mapper.FileMapper}</li>
 * </ul>
 */
@Configuration
@MapperScan("com.sean.blog.module.*.mapper")
public class MyBatisConfig {
}
