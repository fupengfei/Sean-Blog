package com.sean.blog.module.contact.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.contact.entity.ContactRecord;
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

@RestController
@RequestMapping("/api/v1/admin")
class ContactAdminController {

    private final ContactService contactService;

    public ContactAdminController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping("/contacts")
    public Result<PageResult<ContactRecord>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type) {
        return Result.success(contactService.listAll(page, size, type));
    }
}
