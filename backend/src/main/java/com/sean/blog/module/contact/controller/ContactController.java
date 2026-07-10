package com.sean.blog.module.contact.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.contact.service.ContactService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    /** 首页商务合作 */
    @PostMapping("/api/v1/contact/business")
    public Result<?> business(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordBusiness(
                request,
                body.get("companyName"),
                body.get("email"),
                body.get("content"));
        return Result.success();
    }

    /** 关于我 - 发送邮件 */
    @PostMapping("/api/v1/contact/mail")
    public Result<?> mail(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordMail(
                request,
                body.get("email"),
                body.get("content"));
        return Result.success();
    }

    /** 获取简历 */
    @PostMapping("/api/v1/contact/resume")
    public Result<?> resume(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordResume(request, body.get("companyName"), body.get("email"));
        return Result.success();
    }

    /** 订阅 */
    @PostMapping("/api/v1/contact/subscribe")
    public Result<?> subscribe(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordSubscribe(request, body.get("email"));
        return Result.success();
    }
}
