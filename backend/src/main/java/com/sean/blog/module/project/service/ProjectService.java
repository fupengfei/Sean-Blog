package com.sean.blog.module.project.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.mapper.ProjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

/**
 * 项目业务服务，负责项目实体的增删改查和封面图文件管理。
 * 公开方法委托给 ProjectMapper 执行实际数据库操作，封面图上传使用本地文件系统存储。
 *
 * @author sean
 */
@Service
public class ProjectService {

    private final ProjectMapper projectMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final String imagesPath;

    public ProjectService(ProjectMapper projectMapper,
                          SnowflakeIdGenerator idGenerator,
                          @Value("${file.upload.images}") String imagesPath) {
        this.projectMapper = projectMapper;
        this.idGenerator = idGenerator;
        this.imagesPath = imagesPath;
    }

    /** 查询所有已发布项目（前台展示用） */
    public List<Project> findPublished() {
        return projectMapper.findPublished();
    }

    /** 查询指定数量的精选项目（首页特色展示） */
    public List<Project> findFeatured(int limit) {
        return projectMapper.findFeatured(limit);
    }

    /** 查询所有项目（管理端列表，包含草稿和已删除） */
    public List<Project> findAll() {
        return projectMapper.findAll();
    }

    /**
     * 根据主键查询项目。
     *
     * @throws BusinessException 当项目不存在时抛出 404 错误
     */
    public Project findById(Long id) {
        Project project = projectMapper.findById(id);
        if (project == null) {
            throw new BusinessException(404, "项目不存在");
        }
        return project;
    }

    /**
     * 创建新项目。
     * 使用雪花算法生成唯一主键，默认排序为 0，状态为 PUBLISHED。
     * 若上传了封面图，则先保存图片再将路径写入记录。
     */
    public Project create(String title, String description, String url, String githubUrl,
                          String tags, Boolean isFeatured, MultipartFile coverImage) {
        String coverImageUrl = null;
        if (coverImage != null && !coverImage.isEmpty()) {
            coverImageUrl = saveImage(coverImage);
        }

        Project project = new Project();
        project.setId(idGenerator.nextId());
        project.setTitle(title);
        project.setDescription(description);
        project.setUrl(url);
        project.setGithubUrl(githubUrl);
        project.setCoverImage(coverImageUrl);
        project.setTags(tags);
        project.setIsFeatured(isFeatured != null && isFeatured);
        project.setSortOrder(0);
        project.setStatus("PUBLISHED");

        projectMapper.insert(project);
        return project;
    }

    /**
     * 更新已有项目。
     * 先通过 findById 校验存在性，再更新字段。仅当传入封面图非空时才替换封面图。
     */
    public Project update(Long id, String title, String description, String url, String githubUrl,
                          String tags, Boolean isFeatured, MultipartFile coverImage) {
        Project project = findById(id);

        project.setTitle(title);
        project.setDescription(description);
        project.setUrl(url);
        project.setGithubUrl(githubUrl);
        project.setTags(tags);
        project.setIsFeatured(isFeatured != null && isFeatured);

        // 仅在上传新封面图时替换
        if (coverImage != null && !coverImage.isEmpty()) {
            project.setCoverImage(saveImage(coverImage));
        }

        projectMapper.update(project);
        return project;
    }

    /** 删除项目（先校验存在性） */
    public void delete(Long id) {
        findById(id);
        projectMapper.deleteById(id);
    }

    /** 切换精选状态（取反当前 isFeatured 值） */
    public void toggleFeatured(Long id) {
        Project project = findById(id);
        projectMapper.updateFeatured(id, !Boolean.TRUE.equals(project.getIsFeatured()));
    }

    /** 更新项目排序权重 */
    public void updateSortOrder(Long id, int sortOrder) {
        findById(id);
        projectMapper.updateSortOrder(id, sortOrder);
    }

    /**
     * 保存封面图到本地文件系统。
     * 文件名使用 UUID + 原始扩展名，避免冲突。
     *
     * @return 图片访问路径，如 /api/v1/files/images/{uuid}.jpg
     */
    private String saveImage(MultipartFile file) {
        try {
            Path uploadDir = Paths.get(imagesPath);
            Files.createDirectories(uploadDir);

            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + ext;

            Path targetPath = uploadDir.resolve(filename);
            file.transferTo(targetPath.toFile());

            return "/api/v1/files/images/" + filename;
        } catch (IOException e) {
            throw new BusinessException("保存封面图失败");
        }
    }
}
