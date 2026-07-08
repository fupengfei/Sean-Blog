package com.sean.blog.module.file.mapper;

import com.sean.blog.module.file.entity.FileNode;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface FileNodeMapper {
    List<FileNode> findByBundleId(Long bundleId);
    int insert(FileNode node);
    int deleteByBundleId(Long bundleId);
}
