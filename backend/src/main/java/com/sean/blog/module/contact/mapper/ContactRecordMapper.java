package com.sean.blog.module.contact.mapper;

import com.sean.blog.module.contact.entity.ContactRecord;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface ContactRecordMapper {
    int insert(ContactRecord record);
    List<ContactRecord> findAll(Map<String, Object> params);
    long count(Map<String, Object> params);
    List<Map<String, Object>> countByType();
}
