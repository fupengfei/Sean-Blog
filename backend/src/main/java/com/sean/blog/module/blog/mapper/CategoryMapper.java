package com.sean.blog.module.blog.mapper;
import com.sean.blog.module.blog.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

/**
 * 文章分类 MyBatis Mapper 接口，提供分类的增删改查操作。
 */
@Mapper
public interface CategoryMapper {

    /** 查询所有分类 */
    List<Category> findAll();

    /** 根据 ID 查询分类 */
    Category findById(Long id);

    /** 根据 slug 查询分类 */
    Category findBySlug(String slug);

    /** 新增分类 */
    int insert(Category category);

    /** 更新分类信息 */
    int update(Category category);

    /** 根据 ID 删除分类 */
    int deleteById(Long id);

    /** 检查分类名称是否已存在，用于创建和更新时的唯一性校验 */
    boolean existsByName(String name);
}
