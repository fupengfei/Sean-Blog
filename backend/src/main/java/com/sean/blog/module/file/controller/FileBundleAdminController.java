package com.sean.blog.module.file.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.service.FileBundleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * 文件合集管理后台接口控制器，所有接口路径均在 /api/v1/admin/bundles 下，需要 JWT 认证。
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1/admin/bundles")
@RequiredArgsConstructor
public class FileBundleAdminController {

    private final FileBundleService fileBundleService;

    /**
     * 查询所有合集（含草稿）。
     *
     * @return GET /api/v1/admin/bundles
     */
    @GetMapping
    public Result<List<FileBundle>> listAll() {
        List<FileBundle> bundles = fileBundleService.listAll();
        return Result.success(bundles);
    }

    /**
     * 上传 ZIP 文件创建新合集。
     *
     * @param file        ZIP 压缩包
     * @param name        合集名称
     * @param description 合集描述（可选）
     * @param type        合集类型
     * @return POST /api/v1/admin/bundles（multipart/form-data）
     */
    @PostMapping
    public Result<FileBundle> uploadBundle(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false, defaultValue = "") String description,
            @RequestParam("type") String type) throws IOException {
        FileBundle bundle = fileBundleService.uploadBundle(file, name, description, type);
        return Result.success(bundle);
    }

    /**
     * 更新合集基本信息。
     *
     * @return PUT /api/v1/admin/bundles/{id}（JSON body）
     */
    @PutMapping("/{id}")
    public Result<FileBundle> update(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "");
        String description = body.getOrDefault("description", "");
        String type = body.getOrDefault("type", "SKILL");
        FileBundle bundle = fileBundleService.updateBundle(id, name, description, type);
        return Result.success(bundle);
    }

    /**
     * 发布合集。
     *
     * @return PUT /api/v1/admin/bundles/{id}/publish
     */
    @PutMapping("/{id}/publish")
    public Result<Void> publish(@PathVariable Long id) {
        fileBundleService.publish(id);
        return Result.success();
    }

    /**
     * 取消发布合集。
     *
     * @return PUT /api/v1/admin/bundles/{id}/unpublish
     */
    @PutMapping("/{id}/unpublish")
    public Result<Void> unpublish(@PathVariable Long id) {
        fileBundleService.unpublish(id);
        return Result.success();
    }

    /**
     * 切换合集精选状态。
     *
     * @return PUT /api/v1/admin/bundles/{id}/feature
     */
    @PutMapping("/{id}/feature")
    public Result<Void> toggleFeature(@PathVariable Long id) {
        fileBundleService.toggleFeature(id);
        return Result.success();
    }

    /**
     * 删除合集（包括 DB 记录和磁盘文件）。
     *
     * @return DELETE /api/v1/admin/bundles/{id}
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        fileBundleService.delete(id);
        return Result.success();
    }
}
