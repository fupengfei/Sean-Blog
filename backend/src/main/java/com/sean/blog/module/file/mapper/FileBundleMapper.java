package com.sean.blog.module.file.mapper;

import com.sean.blog.module.file.entity.FileBundle;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 文件合集数据访问层，对应 file_bundle 相关 SQL 映射。
 *
 * @author sean
 */
@Mapper
public interface FileBundleMapper {

    /** 按状态查询合集列表（如 PUBLISHED / DRAFT） */
    List<FileBundle> findByStatus(@Param("status") String status);

    /** 查询所有精选合集 */
    List<FileBundle> findFeatured();

    /** 查询所有合集（管理端用） */
    List<FileBundle> findAll();

    /** 根据主键查询合集 */
    FileBundle findById(Long id);

    /** 插入新合集 */
    int insert(FileBundle bundle);

    /** 更新合集发布状态 */
    int updateStatus(@Param("id") Long id, @Param("status") String status);

    /** 更新合集文件数量统计 */
    int updateFileCount(@Param("id") Long id, @Param("count") int count);

    /** 更新合集文件系统根路径 */
    int updateRootPath(@Param("id") Long id, @Param("rootPath") String rootPath);

    /** 切换合集的精选状态 */
    int toggleFeature(@Param("id") Long id);

    /** 更新合集基本信息（名称、描述、类型） */
    int update(FileBundle bundle);

    /** 根据主键删除合集 */
    int deleteById(Long id);
}
