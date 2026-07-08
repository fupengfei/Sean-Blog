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

    @PostMapping("/api/v1/contact/mail")
    public Result<?> mail(HttpServletRequest request) {
        contactService.recordMail(request);
        return Result.success();
    }

    @PostMapping("/api/v1/contact/resume")
    public Result<?> resume(@RequestBody Map<String, String> body, HttpServletRequest request) {
        contactService.recordResume(request, body.get("companyName"), body.get("email"));
        return Result.success();
    }
}
