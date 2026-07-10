package com.sean.blog.module.contact.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ContactRecord {
    private Long id;
    private String type;        // BUSINESS / MAIL / RESUME / SUBSCRIBE
    private String content;
    private String companyName;
    private String email;
    private String ipAddress;
    private LocalDateTime createdAt;
}
