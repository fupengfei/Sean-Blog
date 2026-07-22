package com.sean.blog.module.blog.service;
import com.sean.blog.common.BusinessException;
import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.blog.entity.Category;
import com.sean.blog.module.blog.mapper.CategoryMapper;
import org.springframework.stereotype.Service;
import java.util.List;

/**
 * 文章分类业务服务，提供分类的增删改查操作。
 *
 * <p>创建和更新时会进行名称唯一性校验，防止重复分类。</p>
 */
@Service
public class CategoryService {
    private final CategoryMapper categoryMapper;
    private final SnowflakeIdGenerator idGenerator;

    public CategoryService(CategoryMapper categoryMapper, SnowflakeIdGenerator idGenerator) {
        this.categoryMapper = categoryMapper;
        this.idGenerator = idGenerator;
    }

    /** 查询所有分类 */
    public List<Category> findAll() { return categoryMapper.findAll(); }

    /**
     * 创建新分类。
     *
     * @param name 分类名称
     * @param slug URL 友好的唯一标识
     * @return 创建后的分类对象
     * @throws BusinessException 分类名称已存在时抛出
     */
    public Category create(String name, String slug) {
        if (categoryMapper.existsByName(name)) throw new BusinessException("分类已存在");
        Category category = new Category();
        category.setId(idGenerator.nextId());
        category.setName(name); category.setSlug(slug);
        categoryMapper.insert(category);
        return category;
    }

    /**
     * 更新分类信息。
     *
     * @param id   分类 ID
     * @param name 新分类名称
     * @param slug 新 slug
     * @return 更新后的分类对象
     * @throws BusinessException 分类不存在或名称冲突时抛出
     */
    public Category update(Long id, String name, String slug) {
        Category category = categoryMapper.findById(id);
        if (category == null) throw new BusinessException(404, "分类不存在");
        if (!category.getName().equals(name) && categoryMapper.existsByName(name)) {
            throw new BusinessException("分类已存在");
        }
        category.setName(name); category.setSlug(slug);
        categoryMapper.update(category);
        return category;
    }

    /** 删除分类 */
    public void delete(Long id) { categoryMapper.deleteById(id); }
}
