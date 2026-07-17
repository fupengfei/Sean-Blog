package com.sean.blog.module.contact.service;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.contact.entity.ContactRecord;
import com.sean.blog.module.contact.mapper.ContactRecordMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ContactService {

    private final ContactRecordMapper contactRecordMapper;
    private final SnowflakeIdGenerator idGenerator;

    public ContactService(ContactRecordMapper contactRecordMapper, SnowflakeIdGenerator idGenerator) {
        this.contactRecordMapper = contactRecordMapper;
        this.idGenerator = idGenerator;
    }

    /** 首页商务合作 */
    public void recordBusiness(HttpServletRequest request, String companyName, String email, String content) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("BUSINESS");
        record.setContent(content);
        record.setCompanyName(companyName);
        record.setEmail(email);
        record.setIpAddress(getIpAddress(request));
        contactRecordMapper.insert(record);
    }

    /** 关于我 - 发送邮件 */
    public void recordMail(HttpServletRequest request, String email, String content) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("MAIL");
        record.setContent(content);
        record.setEmail(email);
        record.setIpAddress(getIpAddress(request));
        contactRecordMapper.insert(record);
    }

    /** 获取简历 */
    public void recordResume(HttpServletRequest request, String companyName, String email) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("RESUME");
        record.setCompanyName(companyName);
        record.setEmail(email);
        record.setIpAddress(getIpAddress(request));
        contactRecordMapper.insert(record);
    }

    /** 订阅 */
    public void recordSubscribe(HttpServletRequest request, String email) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("SUBSCRIBE");
        record.setEmail(email);
        record.setIpAddress(getIpAddress(request));
        contactRecordMapper.insert(record);
    }

    public PageResult<ContactRecord> listAll(int page, int size, String type) {
        if (page < 1) page = 1;
        if (size < 1 || size > 100) size = 20;

        Map<String, Object> params = new HashMap<>();
        params.put("offset", (page - 1) * size);
        params.put("size", size);
        if (type != null && !type.trim().isEmpty()) {
            params.put("type", type.trim());
        }

        List<ContactRecord> list = contactRecordMapper.findAll(params);
        long total = contactRecordMapper.count(params);
        return new PageResult<>(list, total, page, size);
    }

    public Map<String, Long> getTypeCounts() {
        List<Map<String, Object>> rows = contactRecordMapper.countByType();
        Map<String, Long> result = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String type = (String) row.get("type");
            Object cnt = row.get("cnt");
            if (type != null && cnt != null) {
                result.put(type, ((Number) cnt).longValue());
            }
        }
        return result;
    }

    private String getIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
