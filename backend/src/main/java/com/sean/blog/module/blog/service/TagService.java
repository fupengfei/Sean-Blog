package com.sean.blog.module.blog.service;
import com.sean.blog.common.BusinessException;
import com.sean.blog.module.blog.entity.Tag;
import com.sean.blog.module.blog.mapper.TagMapper;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TagService {
    private final TagMapper tagMapper;
    public TagService(TagMapper tagMapper) { this.tagMapper = tagMapper; }
    public List<Tag> findAll() { return tagMapper.findAll(); }

    public Tag create(String name, String slug) {
        if (tagMapper.existsByName(name)) throw new BusinessException("标签已存在");
        Tag tag = new Tag();
        tag.setName(name); tag.setSlug(slug);
        tagMapper.insert(tag);
        return tag;
    }

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

    public void delete(Long id) { tagMapper.deleteById(id); }
}
