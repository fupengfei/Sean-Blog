package com.sean.blog.module.contact.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.contact.entity.ContactRecord;
import com.sean.blog.module.contact.service.ContactService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 联系记录管理后台接口控制器，所有接口路径在 /api/v1/admin 下，需要 JWT 认证。
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1/admin")
public class ContactAdminController {

    private final ContactService contactService;

    public ContactAdminController(ContactService contactService) {
        this.contactService = contactService;
    }

    /**
     * 分页查询联系记录，支持按类型筛选。
     *
     * @param page 页码，默认 1
     * @param size 每页数量，默认 20
     * @param type 可选类型筛选：BUSINESS / MAIL / RESUME / SUBSCRIBE
     * @return GET /api/v1/admin/contacts
     */
    @GetMapping("/contacts")
    public Result<PageResult<ContactRecord>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type) {
        return Result.success(contactService.listAll(page, size, type));
    }

    /**
     * 获取各类型联系记录的数量统计。
     *
     * @return GET /api/v1/admin/contacts/stats
     */
    @GetMapping("/contacts/stats")
    public Result<Map<String, Long>> stats() {
        return Result.success(contactService.getTypeCounts());
    }
}
