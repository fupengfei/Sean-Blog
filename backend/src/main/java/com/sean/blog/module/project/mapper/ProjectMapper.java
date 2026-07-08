package com.sean.blog.module.project.mapper;
import com.sean.blog.module.project.entity.Project;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ProjectMapper {
    List<Project> findPublished();
    List<Project> findFeatured(int limit);
    List<Project> findAll();
    Project findById(Long id);
    int insert(Project project);
    int update(Project project);
    int deleteById(Long id);
    int updateFeatured(@Param("id") Long id, @Param("featured") boolean featured);
    int updateSortOrder(@Param("id") Long id, @Param("sortOrder") int sortOrder);
}
