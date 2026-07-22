package com.sean.blog.module.blog.mapper;
import com.sean.blog.module.blog.entity.Tag;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

/**
 * 文章标签 MyBatis Mapper 接口，提供标签的增删改查操作。
 */
@Mapper
public interface TagMapper {

    /** 查询所有标签 */
    List<Tag> findAll();

    /** 根据 ID 查询标签 */
    Tag findById(Long id);

    /** 根据 slug 查询标签 */
    Tag findBySlug(String slug);

    /** 新增标签 */
    int insert(Tag tag);

    /** 更新标签信息 */
    int update(Tag tag);

    /** 根据 ID 删除标签 */
    int deleteById(Long id);

    /** 检查标签名称是否已存在，用于创建和更新时的唯一性校验 */
    boolean existsByName(String name);
}
