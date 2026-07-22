package com.sean.blog.module.contact.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.contact.service.ContactService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 联系记录公开接口控制器，无需认证，供前台页面提交联系信息。
 * 提供四种联系类型的提交入口：商务合作、邮件、简历获取、订阅。
 *
 * @author sean
 */
@RestController
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    /**
     * 提交首页商务合作请求。
     *
     * @param body 请求体，包含 companyName、email、content
     * @return POST /api/v1/contact/business
     */
    @PostMapping("/api/v1/contact/business")
    public Result<?> business(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordBusiness(
                request,
                body.get("companyName"),
                body.get("email"),
                body.get("content"));
        return Result.success();
    }

    /**
     * 提交"关于我"页面发送邮件请求。
     *
     * @param body 请求体，包含 email、content
     * @return POST /api/v1/contact/mail
     */
    @PostMapping("/api/v1/contact/mail")
    public Result<?> mail(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordMail(
                request,
                body.get("email"),
                body.get("content"));
        return Result.success();
    }

    /**
     * 提交简历获取请求。
     *
     * @param body 请求体，包含 companyName、email
     * @return POST /api/v1/contact/resume
     */
    @PostMapping("/api/v1/contact/resume")
    public Result<?> resume(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordResume(request, body.get("companyName"), body.get("email"));
        return Result.success();
    }

    /**
     * 提交订阅请求。
     *
     * @param body 请求体，包含 email
     * @return POST /api/v1/contact/subscribe
     */
    @PostMapping("/api/v1/contact/subscribe")
    public Result<?> subscribe(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordSubscribe(request, body.get("email"));
        return Result.success();
    }
}
