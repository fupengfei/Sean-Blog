package com.sean.blog.module.file.mapper;

import com.sean.blog.module.file.entity.FileNode;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

/**
 * 文件节点数据访问层，对应 file_node 相关 SQL 映射。
 *
 * @author sean
 */
@Mapper
public interface FileNodeMapper {

    /** 查询指定合集下的所有文件节点 */
    List<FileNode> findByBundleId(Long bundleId);

    /** 插入一个文件节点 */
    int insert(FileNode node);

    /** 删除指定合集下的所有文件节点 */
    int deleteByBundleId(Long bundleId);
}
