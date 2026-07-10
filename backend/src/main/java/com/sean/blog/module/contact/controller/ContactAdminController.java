package com.sean.blog.module.contact.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.contact.entity.ContactRecord;
import com.sean.blog.module.contact.service.ContactService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class ContactAdminController {

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

    @GetMapping("/contacts/stats")
    public Result<Map<String, Long>> stats() {
        return Result.success(contactService.getTypeCounts());
    }
}
