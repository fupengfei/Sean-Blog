package com.sean.blog.module.contact.mapper;

import com.sean.blog.module.contact.entity.ContactRecord;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

/**
 * 联系记录数据访问层，对应 contact_record 相关 SQL 映射。
 *
 * @author sean
 */
@Mapper
public interface ContactRecordMapper {

    /** 插入一条联系记录 */
    int insert(ContactRecord record);

    /** 分页查询联系记录，支持按 type 筛选 */
    List<ContactRecord> findAll(Map<String, Object> params);

    /** 统计符合条件的记录总数 */
    long count(Map<String, Object> params);

    /** 按类型（type）分组统计记录数，返回 [{type, cnt}] 列表 */
    List<Map<String, Object>> countByType();
}
