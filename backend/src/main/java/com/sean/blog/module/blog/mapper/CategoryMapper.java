package com.sean.blog.module.blog.mapper;
import com.sean.blog.module.blog.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CategoryMapper {
    List<Category> findAll();
    Category findById(Long id);
    Category findBySlug(String slug);
    int insert(Category category);
    int update(Category category);
    int deleteById(Long id);
    boolean existsByName(String name);
}
