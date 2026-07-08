package com.sean.blog.module.file.service;

import com.sean.blog.module.file.dto.FileTreeResponse;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.entity.FileNode;
import com.sean.blog.module.file.mapper.FileBundleMapper;
import com.sean.blog.module.file.mapper.FileNodeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class FileBundleService {

    private final FileBundleMapper bundleMapper;
    private final FileNodeMapper nodeMapper;

    @Value("${file.upload.skills}")
    private String skillsPath;

    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_DRAFT = "DRAFT";

    // ==================== Upload ====================

    @Transactional
    public FileBundle uploadBundle(MultipartFile zipFile, String name, String description, String type) throws IOException {
        // 1. Create bundle record
        FileBundle bundle = new FileBundle();
        bundle.setName(name);
        bundle.setDescription(description);
        bundle.setType(type);
        bundle.setStatus(STATUS_DRAFT);
        bundle.setFileCount(0);
        bundleMapper.insert(bundle);

        Long bundleId = bundle.getId();
        String bundleDir = skillsPath + "/" + bundleId;
        bundle.setRootPath(bundleDir);

        // 2. Extract zip to skills/{bundleId}/
        Files.createDirectories(Path.of(bundleDir));
        extractZip(zipFile.getInputStream(), bundleDir);

        // 3. Recursively walk directory and create FileNode records
        int fileCount = buildFileTree(bundleId, bundleDir, null);

        // 4. Update file count
        bundleMapper.updateFileCount(bundleId, fileCount);
        bundle.setFileCount(fileCount);

        return bundle;
    }

    private void extractZip(InputStream inputStream, String destDir) throws IOException {
        try (ZipInputStream zis = new ZipInputStream(inputStream)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                Path filePath = Path.of(destDir, entry.getName());

                // Security: prevent zip slip
                if (!filePath.normalize().startsWith(Path.of(destDir).normalize())) {
                    throw new IOException("Bad zip entry: " + entry.getName());
                }

                if (entry.isDirectory()) {
                    Files.createDirectories(filePath);
                } else {
                    Files.createDirectories(filePath.getParent());
                    try (OutputStream os = Files.newOutputStream(filePath)) {
                        zis.transferTo(os);
                    }
                }
                zis.closeEntry();
            }
        }
    }

    private int buildFileTree(Long bundleId, String dirPath, Long parentId) {
        File dir = new File(dirPath);
        File[] files = dir.listFiles();
        if (files == null) return 0;

        // Sort: directories first, then files; alphabetically by name
        Arrays.sort(files, (a, b) -> {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.getName().compareToIgnoreCase(b.getName());
        });

        int fileCount = 0;
        int sortOrder = 0;

        for (File file : files) {
            FileNode node = new FileNode();
            node.setBundleId(bundleId);
            node.setParentId(parentId);
            node.setName(file.getName());
            node.setSortOrder(sortOrder++);

            if (file.isDirectory()) {
                node.setNodeType("DIRECTORY");
                node.setFileSize(0L);
                nodeMapper.insert(node);
                // Recurse into subdirectory
                int subCount = buildFileTree(bundleId, file.getAbsolutePath(), node.getId());
                fileCount += subCount;
            } else {
                node.setNodeType("FILE");
                node.setFileSize(file.length());
                // filePath relative to bundle root, for file content retrieval
                node.setFilePath(file.getAbsolutePath());
                nodeMapper.insert(node);
                fileCount++;
            }
        }

        return fileCount;
    }

    // ==================== Tree ====================

    public FileTreeResponse getTree(Long bundleId) {
        FileBundle bundle = bundleMapper.findById(bundleId);
        if (bundle == null) {
            throw new RuntimeException("Bundle not found: " + bundleId);
        }

        List<FileNode> allNodes = nodeMapper.findByBundleId(bundleId);
        List<FileTreeResponse.FileTreeNode> tree = buildTree(allNodes, null);

        return new FileTreeResponse(bundleId, bundle.getName(), tree);
    }

    private List<FileTreeResponse.FileTreeNode> buildTree(List<FileNode> allNodes, Long parentId) {
        List<FileTreeResponse.FileTreeNode> result = new ArrayList<>();
        for (FileNode node : allNodes) {
            boolean parentMatch = (parentId == null && node.getParentId() == null)
                    || (parentId != null && parentId.equals(node.getParentId()));
            if (!parentMatch) continue;

            List<FileTreeResponse.FileTreeNode> children = buildTree(allNodes, node.getId());
            result.add(new FileTreeResponse.FileTreeNode(
                    node.getId(),
                    node.getName(),
                    node.getNodeType(),
                    node.getFilePath(),
                    node.getFileSize(),
                    children.isEmpty() ? null : children
            ));
        }
        return result;
    }

    // ==================== File Content ====================

    public String getFileContent(Long bundleId, String filePath) throws IOException {
        FileBundle bundle = bundleMapper.findById(bundleId);
        if (bundle == null) {
            throw new RuntimeException("Bundle not found: " + bundleId);
        }

        // Resolve the actual file path
        Path resolvedPath = Path.of(skillsPath, bundleId.toString(), filePath).normalize();
        Path basePath = Path.of(skillsPath, bundleId.toString()).normalize();

        // Security: prevent path traversal
        if (!resolvedPath.startsWith(basePath)) {
            throw new RuntimeException("Invalid file path");
        }

        File file = resolvedPath.toFile();
        if (!file.exists() || !file.isFile()) {
            throw new RuntimeException("File not found: " + filePath);
        }

        // Read as text (UTF-8); for binary files, return an error message
        try {
            return Files.readString(resolvedPath);
        } catch (IOException e) {
            // If it's likely a binary file, return a friendly message
            String fileName = file.getName().toLowerCase();
            if (isLikelyBinary(fileName)) {
                return "[Binary file - preview not available]";
            }
            throw e;
        }
    }

    private boolean isLikelyBinary(String fileName) {
        String[] binaryExtensions = {
                ".zip", ".jar", ".war", ".tar", ".gz", ".bz2", ".7z", ".rar",
                ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp",
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
                ".exe", ".dll", ".so", ".dylib", ".bin",
                ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".flv",
                ".class", ".o", ".obj", ".pyc"
        };
        for (String ext : binaryExtensions) {
            if (fileName.endsWith(ext)) return true;
        }
        return false;
    }

    // ==================== List ====================

    public List<FileBundle> listPublished() {
        return bundleMapper.findByStatus(STATUS_PUBLISHED);
    }

    public List<FileBundle> listAll() {
        return bundleMapper.findAll();
    }

    // ==================== Publish / Unpublish ====================

    public void publish(Long id) {
        bundleMapper.updateStatus(id, STATUS_PUBLISHED);
    }

    public void unpublish(Long id) {
        bundleMapper.updateStatus(id, STATUS_DRAFT);
    }

    // ==================== Delete ====================

    @Transactional
    public void delete(Long bundleId) {
        FileBundle bundle = bundleMapper.findById(bundleId);
        if (bundle == null) {
            throw new RuntimeException("Bundle not found: " + bundleId);
        }

        // 1. Delete FileNode records
        nodeMapper.deleteByBundleId(bundleId);

        // 2. Delete Bundle record
        bundleMapper.deleteById(bundleId);

        // 3. Delete disk directory
        try {
            Path bundleDir = Path.of(skillsPath, bundleId.toString());
            if (Files.exists(bundleDir)) {
                deleteDirectory(bundleDir);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete bundle directory: " + e.getMessage(), e);
        }
    }

    private void deleteDirectory(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            try (var entries = Files.newDirectoryStream(path)) {
                for (Path entry : entries) {
                    deleteDirectory(entry);
                }
            }
        }
        Files.deleteIfExists(path);
    }
}
