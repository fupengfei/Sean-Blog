package com.sean.blog.module.file.mapper;

import com.sean.blog.module.file.entity.FileBundle;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FileBundleMapper {
    List<FileBundle> findByStatus(@Param("status") String status);
    List<FileBundle> findAll();
    FileBundle findById(Long id);
    int insert(FileBundle bundle);
    int updateStatus(@Param("id") Long id, @Param("status") String status);
    int updateFileCount(@Param("id") Long id, @Param("count") int count);
    int deleteById(Long id);
}
