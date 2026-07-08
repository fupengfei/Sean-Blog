package com.sean.blog.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.sean.blog.module.*.mapper")
public class MyBatisConfig {
}
