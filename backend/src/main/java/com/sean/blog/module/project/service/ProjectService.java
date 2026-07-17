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

    public List<Project> findPublished() {
        return projectMapper.findPublished();
    }

    public List<Project> findFeatured(int limit) {
        return projectMapper.findFeatured(limit);
    }

    public List<Project> findAll() {
        return projectMapper.findAll();
    }

    public Project findById(Long id) {
        Project project = projectMapper.findById(id);
        if (project == null) {
            throw new BusinessException(404, "项目不存在");
        }
        return project;
    }

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

    public Project update(Long id, String title, String description, String url, String githubUrl,
                          String tags, Boolean isFeatured, MultipartFile coverImage) {
        Project project = findById(id);

        project.setTitle(title);
        project.setDescription(description);
        project.setUrl(url);
        project.setGithubUrl(githubUrl);
        project.setTags(tags);
        project.setIsFeatured(isFeatured != null && isFeatured);

        if (coverImage != null && !coverImage.isEmpty()) {
            project.setCoverImage(saveImage(coverImage));
        }

        projectMapper.update(project);
        return project;
    }

    public void delete(Long id) {
        findById(id);
        projectMapper.deleteById(id);
    }

    public void toggleFeatured(Long id) {
        Project project = findById(id);
        projectMapper.updateFeatured(id, !Boolean.TRUE.equals(project.getIsFeatured()));
    }

    public void updateSortOrder(Long id, int sortOrder) {
        findById(id);
        projectMapper.updateSortOrder(id, sortOrder);
    }

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
