package com.sean.blog.module.file.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.service.FileBundleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/bundles")
@RequiredArgsConstructor
public class FileBundleAdminController {

    private final FileBundleService fileBundleService;

    @GetMapping
    public Result<List<FileBundle>> listAll() {
        List<FileBundle> bundles = fileBundleService.listAll();
        return Result.success(bundles);
    }

    @PostMapping
    public Result<FileBundle> uploadBundle(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false, defaultValue = "") String description,
            @RequestParam("type") String type) throws IOException {
        FileBundle bundle = fileBundleService.uploadBundle(file, name, description, type);
        return Result.success(bundle);
    }

    @PutMapping("/{id}/publish")
    public Result<Void> publish(@PathVariable Long id) {
        fileBundleService.publish(id);
        return Result.success();
    }

    @PutMapping("/{id}/unpublish")
    public Result<Void> unpublish(@PathVariable Long id) {
        fileBundleService.unpublish(id);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        fileBundleService.delete(id);
        return Result.success();
    }
}
