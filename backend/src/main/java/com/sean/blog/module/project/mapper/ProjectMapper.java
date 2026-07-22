package com.sean.blog.module.project.mapper;

import com.sean.blog.module.project.entity.Project;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

/**
 * 项目数据访问层，对应 project 相关 SQL 映射。
 * 方法按角色分为：公开查询（published / featured）、管理端全量查询（all）、CRUD 以及单字段更新。
 *
 * @author sean
 */
@Mapper
public interface ProjectMapper {

    /** 查询所有已发布（status = 'PUBLISHED'）的项目，按 sort_order 降序 */
    List<Project> findPublished();

    /** 查询指定数量的精选项目（is_featured = true），按 sort_order 降序 */
    List<Project> findFeatured(int limit);

    /** 查询所有项目（含草稿/已删除），按创建时间降序，供管理端列表使用 */
    List<Project> findAll();

    /** 根据主键查询单个项目 */
    Project findById(Long id);

    /** 插入新项目 */
    int insert(Project project);

    /** 全量更新项目信息 */
    int update(Project project);

    /** 根据主键删除项目 */
    int deleteById(Long id);

    /** 切换项目的精选（is_featured）状态 */
    int updateFeatured(@Param("id") Long id, @Param("featured") boolean featured);

    /** 更新项目的排序权重 */
    int updateSortOrder(@Param("id") Long id, @Param("sortOrder") int sortOrder);
}
