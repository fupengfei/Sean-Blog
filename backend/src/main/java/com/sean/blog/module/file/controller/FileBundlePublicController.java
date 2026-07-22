package com.sean.blog.module.file.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.file.dto.FileTreeResponse;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.service.FileBundleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/**
 * 文件合集公开接口控制器，无需认证，供前台页面浏览合集及文件内容。
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1/bundles")
@RequiredArgsConstructor
public class FileBundlePublicController {

    private final FileBundleService fileBundleService;

    /**
     * 获取所有已发布合集列表。
     *
     * @return GET /api/v1/bundles
     */
    @GetMapping
    public Result<List<FileBundle>> listPublished() {
        List<FileBundle> bundles = fileBundleService.listPublished();
        return Result.success(bundles);
    }

    /**
     * 获取精选合集列表（首页展示用）。
     *
     * @return GET /api/v1/bundles/featured
     */
    @GetMapping("/featured")
    public Result<List<FileBundle>> listFeatured() {
        List<FileBundle> bundles = fileBundleService.getFeatured();
        return Result.success(bundles);
    }

    /**
     * 获取合集的完整文件树结构。
     *
     * @param id 合集 ID
     * @return GET /api/v1/bundles/{id}/tree
     */
    @GetMapping("/{id}/tree")
    public Result<FileTreeResponse> getTree(@PathVariable Long id) {
        FileTreeResponse tree = fileBundleService.getTree(id);
        return Result.success(tree);
    }

    /**
     * 获取合集中指定文件的内容（文本）。
     *
     * @param id   合集 ID
     * @param path 文件相对路径
     * @return GET /api/v1/bundles/{id}/file?path=xxx
     */
    @GetMapping("/{id}/file")
    public Result<String> getFileContent(@PathVariable Long id, @RequestParam String path) throws IOException {
        String content = fileBundleService.getFileContent(id, path);
        return Result.success(content);
    }
}
