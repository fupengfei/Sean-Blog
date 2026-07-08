package com.sean.blog.module.blog.mapper;
import com.sean.blog.module.blog.entity.Tag;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface TagMapper {
    List<Tag> findAll();
    Tag findById(Long id);
    Tag findBySlug(String slug);
    int insert(Tag tag);
    int update(Tag tag);
    int deleteById(Long id);
    boolean existsByName(String name);
}
