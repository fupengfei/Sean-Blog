package com.sean.blog.module.blog.service;
import com.sean.blog.common.BusinessException;
import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.blog.entity.Tag;
import com.sean.blog.module.blog.mapper.TagMapper;
import org.springframework.stereotype.Service;
import java.util.List;

/**
 * 文章标签业务服务，提供标签的增删改查操作。
 *
 * <p>创建和更新时会进行名称唯一性校验，防止重复标签。</p>
 */
@Service
public class TagService {
    private final TagMapper tagMapper;
    private final SnowflakeIdGenerator idGenerator;

    public TagService(TagMapper tagMapper, SnowflakeIdGenerator idGenerator) {
        this.tagMapper = tagMapper;
        this.idGenerator = idGenerator;
    }

    /** 查询所有标签 */
    public List<Tag> findAll() { return tagMapper.findAll(); }

    /**
     * 创建新标签。
     *
     * @param name 标签名称
     * @param slug URL 友好的唯一标识
     * @return 创建后的标签对象
     * @throws BusinessException 标签名称已存在时抛出
     */
    public Tag create(String name, String slug) {
        if (tagMapper.existsByName(name)) throw new BusinessException("标签已存在");
        Tag tag = new Tag();
        tag.setId(idGenerator.nextId());
        tag.setName(name); tag.setSlug(slug);
        tagMapper.insert(tag);
        return tag;
    }

    /**
     * 更新标签信息。
     *
     * @param id   标签 ID
     * @param name 新标签名称
     * @param slug 新 slug
     * @return 更新后的标签对象
     * @throws BusinessException 标签不存在或名称冲突时抛出
     */
    public Tag update(Long id, String name, String slug) {
        Tag tag = tagMapper.findById(id);
        if (tag == null) throw new BusinessException(404, "标签不存在");
        if (!tag.getName().equals(name) && tagMapper.existsByName(name)) {
            throw new BusinessException("标签已存在");
        }
        tag.setName(name); tag.setSlug(slug);
        tagMapper.update(tag);
        return tag;
    }

    /** 删除标签 */
    public void delete(Long id) { tagMapper.deleteById(id); }
}
