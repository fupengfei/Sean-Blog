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

/**
 * 联系记录业务服务，处理四种联系类型的记录入库和管理端查询。
 * 每个记录方法从 HttpServletRequest 中提取真实客户端 IP。
 *
 * @author sean
 */
@Service
public class ContactService {

    private final ContactRecordMapper contactRecordMapper;
    private final SnowflakeIdGenerator idGenerator;

    public ContactService(ContactRecordMapper contactRecordMapper, SnowflakeIdGenerator idGenerator) {
        this.contactRecordMapper = contactRecordMapper;
        this.idGenerator = idGenerator;
    }

    /**
     * 记录首页商务合作请求。
     *
     * @param request     HTTP 请求，用于提取客户端 IP
     * @param companyName 公司名称
     * @param email       联系邮箱
     * @param content     合作需求内容
     */
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

    /**
     * 记录"关于我"页面发送邮件请求。
     *
     * @param request HTTP 请求，用于提取客户端 IP
     * @param email   发送目标邮箱
     * @param content 邮件内容
     */
    public void recordMail(HttpServletRequest request, String email, String content) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("MAIL");
        record.setContent(content);
        record.setEmail(email);
        record.setIpAddress(getIpAddress(request));
        contactRecordMapper.insert(record);
    }

    /**
     * 记录用户获取简历请求。
     *
     * @param request     HTTP 请求，用于提取客户端 IP
     * @param companyName 公司名称
     * @param email       邮箱
     */
    public void recordResume(HttpServletRequest request, String companyName, String email) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("RESUME");
        record.setCompanyName(companyName);
        record.setEmail(email);
        record.setIpAddress(getIpAddress(request));
        contactRecordMapper.insert(record);
    }

    /**
     * 记录用户订阅请求。
     *
     * @param request HTTP 请求，用于提取客户端 IP
     * @param email   订阅邮箱
     */
    public void recordSubscribe(HttpServletRequest request, String email) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("SUBSCRIBE");
        record.setEmail(email);
        record.setIpAddress(getIpAddress(request));
        contactRecordMapper.insert(record);
    }

    /**
     * 分页查询联系记录（管理端），支持按类型筛选。
     *
     * @param page 页码，从 1 开始
     * @param size 每页条数（1-100），超出则使用默认 20
     * @param type 可选类型筛选，null 表示全部
     * @return 分页结果
     */
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

    /**
     * 获取各类型的联系记录数量统计。
     *
     * @return Map，key 为类型（BUSINESS/MAIL/RESUME/SUBSCRIBE），value 为数量
     */
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

    /**
     * 从请求中提取真实客户端 IP 地址。
     * 依次检查 X-Forwarded-For、Proxy-Client-IP 等代理头部，最后回退到 RemoteAddr。
     * 若有多个 IP（逗号分隔），取第一个。
     */
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
