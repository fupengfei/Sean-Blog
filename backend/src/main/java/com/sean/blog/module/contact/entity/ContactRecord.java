package com.sean.blog.module.contact.entity;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
public class ContactRecord {
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;
    private String type;        // BUSINESS / MAIL / RESUME / SUBSCRIBE
    private String content;
    private String companyName;
    private String email;
    private String ipAddress;
    private LocalDateTime createdAt;
}
