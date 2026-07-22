package com.sean.blog.module.file.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.common.SnowflakeIdGenerator;
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

/**
 * 文件合集业务服务，负责 Skill Bundle 的完整生命周期管理。
 * 核心流程：上传 ZIP → 解压 → 构建文件树 → 发布/查询/删除。
 * 包含 Zip Slip 安全防护和 macOS 元数据文件过滤。
 *
 * @author sean
 */
@Service
@RequiredArgsConstructor
public class FileBundleService {

    private final FileBundleMapper bundleMapper;
    private final FileNodeMapper nodeMapper;
    private final SnowflakeIdGenerator idGenerator;

    /** 文件上传基础目录（skills 目录） */
    @Value("${file.upload.skills}")
    private String skillsPath;

    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_DRAFT = "DRAFT";

    // ==================== Upload ====================

    /**
     * 上传并创建文件合集。
     * 流程：预生成 ID → 创建 DB 记录 → 解压 ZIP 到磁盘 → 递归构建文件节点树 → 更新文件计数。
     * 整个流程在一个事务中，保证 DB 和文件系统的一致性。
     */
    @Transactional
    public FileBundle uploadBundle(MultipartFile zipFile, String name, String description, String type) throws IOException {
        // 1. Create bundle record (rootPath depends on ID, pre-generate via Snowflake)
        FileBundle bundle = new FileBundle();
        Long bundleId = idGenerator.nextId();
        bundle.setId(bundleId);
        bundle.setName(name);
        bundle.setDescription(description);
        bundle.setRootPath("");
        bundle.setType(type);
        bundle.setStatus(STATUS_DRAFT);
        bundle.setIsFeatured(false);
        bundle.setFileCount(0);
        bundleMapper.insert(bundle);
        String bundleDir = skillsPath + "/" + bundleId;
        bundle.setRootPath(bundleDir);
        bundleMapper.updateRootPath(bundleId, bundleDir);

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

    /**
     * 解压 ZIP 文件到目标目录。
     * 包含安全防护：Zip Slip 路径穿越检测、macOS 元数据文件（__MACOSX、.DS_Store、._*）过滤。
     */
    private void extractZip(InputStream inputStream, String destDir) throws IOException {
        try (ZipInputStream zis = new ZipInputStream(inputStream)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                Path filePath = Path.of(destDir, entry.getName());

                // Security: prevent zip slip
                if (!filePath.normalize().startsWith(Path.of(destDir).normalize())) {
                    throw new IOException("Bad zip entry: " + entry.getName());
                }

                // Skip macOS metadata (resource forks, DS_Store, AppleDouble)
                String entryName = entry.getName();
                if (entryName.contains("__MACOSX") || entryName.contains(".DS_Store")) {
                    zis.closeEntry();
                    continue;
                }
                // Also skip AppleDouble files (._ prefix) at any level
                String fileName = Path.of(entryName).getFileName().toString();
                if (fileName.startsWith("._")) {
                    zis.closeEntry();
                    continue;
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

    /**
     * 递归遍历目录，为每个文件和子目录创建 FileNode 记录。
     * 排序规则：目录优先，然后按名称字母序。
     *
     * @return 该目录及其子目录下的文件总数
     */
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
            // Skip macOS metadata files and directories
            String fileName = file.getName();
            if (fileName.equals("__MACOSX") || fileName.equals(".DS_Store") || fileName.startsWith("._")) {
                continue;
            }

            FileNode node = new FileNode();
            node.setId(idGenerator.nextId());
            node.setBundleId(bundleId);
            node.setParentId(parentId);
            node.setName(fileName);
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
                // Store relative path from bundle root for file content retrieval
                Path bundleDir = Path.of(skillsPath, bundleId.toString());
                Path relativePath = bundleDir.relativize(file.toPath().normalize());
                node.setFilePath(relativePath.toString());
                nodeMapper.insert(node);
                fileCount++;
            }
        }

        return fileCount;
    }

    // ==================== Tree ====================

    /**
     * 获取合集的完整文件树结构。
     * 查询所有节点后在内存中递归构建树形层级。
     */
    public FileTreeResponse getTree(Long bundleId) {
        FileBundle bundle = bundleMapper.findById(bundleId);
        if (bundle == null) {
            throw new BusinessException(404, "Bundle not found: " + bundleId);
        }

        List<FileNode> allNodes = nodeMapper.findByBundleId(bundleId);
        List<FileTreeResponse.FileTreeNode> tree = buildTree(allNodes, null);

        return new FileTreeResponse(bundleId, bundle.getName(), tree);
    }

    /**
     * 递归构建文件树节点列表，将平铺的节点列表组装为层级结构。
     *
     * @param allNodes 合集下所有文件节点
     * @param parentId 当前层级的父节点 ID，null 表示根层级
     */
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

    /**
     * 读取合集中指定文件的内容。
     * 包含路径穿越安全校验；对已知二进制格式返回友好提示信息。
     */
    public String getFileContent(Long bundleId, String filePath) throws IOException {
        FileBundle bundle = bundleMapper.findById(bundleId);
        if (bundle == null) {
            throw new BusinessException(404, "Bundle not found: " + bundleId);
        }

        // Resolve the actual file path
        Path resolvedPath = Path.of(skillsPath, bundleId.toString(), filePath).normalize();
        Path basePath = Path.of(skillsPath, bundleId.toString()).normalize();

        // Security: prevent path traversal
        if (!resolvedPath.startsWith(basePath)) {
            throw new BusinessException(400, "Invalid file path");
        }

        File file = resolvedPath.toFile();
        if (!file.exists() || !file.isFile()) {
            throw new BusinessException(404, "File not found: " + filePath);
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

    /** 根据文件扩展名判断是否可能为二进制文件 */
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

    /** 查询所有已发布的合集（前台展示用） */
    public List<FileBundle> listPublished() {
        return bundleMapper.findByStatus(STATUS_PUBLISHED);
    }

    /** 查询所有合集（管理端用，含草稿） */
    public List<FileBundle> listAll() {
        return bundleMapper.findAll();
    }

    // ==================== Feature / Unfeature ====================

    /** 切换合集精选状态，仅已发布合集可设为精选 */
    public void toggleFeature(Long id) {
        FileBundle bundle = bundleMapper.findById(id);
        if (bundle == null) {
            throw new BusinessException(404, "Bundle not found: " + id);
        }
        if (!STATUS_PUBLISHED.equals(bundle.getStatus())) {
            throw new BusinessException(400, "Only published bundles can be featured");
        }
        bundleMapper.toggleFeature(id);
    }

    /** 查询所有精选合集（首页展示用） */
    public List<FileBundle> getFeatured() {
        return bundleMapper.findFeatured();
    }

    // ==================== Publish / Unpublish ====================

    /** 发布合集（状态改为 PUBLISHED） */
    public void publish(Long id) {
        bundleMapper.updateStatus(id, STATUS_PUBLISHED);
    }

    /** 取消发布合集（状态改为 DRAFT） */
    public void unpublish(Long id) {
        bundleMapper.updateStatus(id, STATUS_DRAFT);
    }

    // ==================== Update ====================

    /** 更新合集基本信息（名称、描述、类型），先校验存在性 */
    public FileBundle updateBundle(Long id, String name, String description, String type) {
        FileBundle bundle = bundleMapper.findById(id);
        if (bundle == null) {
            throw new BusinessException(404, "Bundle not found: " + id);
        }
        bundle.setName(name);
        bundle.setDescription(description);
        bundle.setType(type);
        bundleMapper.update(bundle);
        return bundle;
    }

    // ==================== Delete ====================

    /**
     * 删除合集及其关联数据。
     * 流程：校验存在性 → 删除 FileNode 记录 → 删除 Bundle 记录 → 删除磁盘目录。
     * 整个流程在一个事务中，保证 DB 和文件系统的一致性。
     */
    @Transactional
    public void delete(Long bundleId) {
        FileBundle bundle = bundleMapper.findById(bundleId);
        if (bundle == null) {
            throw new BusinessException(404, "Bundle not found: " + bundleId);
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
            throw new BusinessException(500, "Failed to delete bundle directory: " + e.getMessage());
        }
    }

    /** 递归删除目录及其所有子文件和子目录 */
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
