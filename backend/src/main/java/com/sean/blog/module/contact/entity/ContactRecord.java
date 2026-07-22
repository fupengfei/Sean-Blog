package com.sean.blog.module.contact.entity;

import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 联系记录实体，对应 contact_records 表。
 * 记录所有前台用户提交的联系信息，包括商务合作、邮件、简历获取、订阅等。
 *
 * @author sean
 */
@Data
public class ContactRecord {

    /** 主键，雪花算法生成 */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    /** 记录类型：BUSINESS（商务合作）/ MAIL（发送邮件）/ RESUME（获取简历）/ SUBSCRIBE（订阅） */
    private String type;

    /** 用户填写的留言/需求内容 */
    private String content;

    /** 公司名称（商务合作和简历获取场景下需要） */
    private String companyName;

    /** 用户邮箱 */
    private String email;

    /** 请求来源 IP（通过 X-Forwarded-For 等头部获取） */
    private String ipAddress;

    /** 提交时间 */
    private LocalDateTime createdAt;
}
