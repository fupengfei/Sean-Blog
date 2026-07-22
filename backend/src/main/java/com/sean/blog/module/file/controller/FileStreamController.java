package com.sean.blog.module.file.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;

/**
 * 文件流式传输接口控制器，无需认证，用于直接返回图片等静态文件。
 * 提供路径穿越安全校验，并根据扩展名自动识别 MIME 类型。
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1/files")
public class FileStreamController {

    @Value("${file.upload.images}")
    private String imagesPath;

    /**
     * 以流式方式返回图片文件。
     * 包含路径穿越安全防护，防止通过 ../ 访问 images 目录外的文件。
     *
     * @param filename 图片文件名
     * @return GET /api/v1/files/images/{filename}
     */
    @GetMapping("/images/{filename}")
    public ResponseEntity<Resource> serveImage(@PathVariable String filename) {
        try {
            Path filePath = Path.of(imagesPath).resolve(filename).normalize();

            // Security: prevent path traversal
            Path basePath = Path.of(imagesPath).normalize();
            if (!filePath.startsWith(basePath)) {
                return ResponseEntity.badRequest().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            // Determine content type from filename extension
            String contentType = determineContentType(filename);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /** 根据文件扩展名确定 MIME 类型 */
    private String determineContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".bmp")) return "image/bmp";
        return "application/octet-stream";
    }
}
