package com.sean.blog.module.file.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.file.dto.FileTreeResponse;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.service.FileBundleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/bundles")
@RequiredArgsConstructor
public class FileBundlePublicController {

    private final FileBundleService fileBundleService;

    @GetMapping
    public Result<List<FileBundle>> listPublished() {
        List<FileBundle> bundles = fileBundleService.listPublished();
        return Result.success(bundles);
    }

    @GetMapping("/featured")
    public Result<List<FileBundle>> listFeatured() {
        List<FileBundle> bundles = fileBundleService.getFeatured();
        return Result.success(bundles);
    }

    @GetMapping("/{id}/tree")
    public Result<FileTreeResponse> getTree(@PathVariable Long id) {
        FileTreeResponse tree = fileBundleService.getTree(id);
        return Result.success(tree);
    }

    @GetMapping("/{id}/file")
    public Result<String> getFileContent(@PathVariable Long id, @RequestParam String path) throws IOException {
        String content = fileBundleService.getFileContent(id, path);
        return Result.success(content);
    }
}
