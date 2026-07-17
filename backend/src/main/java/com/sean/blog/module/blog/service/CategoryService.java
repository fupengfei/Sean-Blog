package com.sean.blog.module.blog.service;
import com.sean.blog.common.BusinessException;
import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.blog.entity.Category;
import com.sean.blog.module.blog.mapper.CategoryMapper;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CategoryService {
    private final CategoryMapper categoryMapper;
    private final SnowflakeIdGenerator idGenerator;
    public CategoryService(CategoryMapper categoryMapper, SnowflakeIdGenerator idGenerator) {
        this.categoryMapper = categoryMapper;
        this.idGenerator = idGenerator;
    }
    public List<Category> findAll() { return categoryMapper.findAll(); }

    public Category create(String name, String slug) {
        if (categoryMapper.existsByName(name)) throw new BusinessException("分类已存在");
        Category category = new Category();
        category.setId(idGenerator.nextId());
        category.setName(name); category.setSlug(slug);
        categoryMapper.insert(category);
        return category;
    }

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

    public void delete(Long id) { categoryMapper.deleteById(id); }
}
