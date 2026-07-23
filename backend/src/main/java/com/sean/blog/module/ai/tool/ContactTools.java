package com.sean.blog.module.ai.tool;

import com.sean.blog.module.contact.service.ContactService;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * 联系方式登记工具：简历请求、邮件订阅。
 *
 * <p>写类工具——system prompt 约束模型仅在用户明确给出邮箱后调用；
 * 工具内再做一道邮箱格式校验兜底。IP 取自 ToolContext 中
 * Controller 注入的会话 IP（键 "ip"）。</p>
 */
@Component
public class ContactTools {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final ContactService contactService;

    public ContactTools(ContactService contactService) {
        this.contactService = contactService;
    }

    @Tool(name = "requestResume",
            description = "登记简历获取请求，Sean 会通过邮件发送简历。仅当用户明确提供了邮箱地址时才调用。")
    public String requestResume(
            @ToolParam(description = "用户邮箱地址") String email,
            @ToolParam(description = "公司名称，用户未提供则传 null", required = false) String companyName,
            ToolContext toolContext) {
        String emailError = validateEmail(email);
        if (emailError != null) {
            return emailError;
        }
        try {
            contactService.recordResume(ip(toolContext), companyName, email.trim());
            return "已登记简历请求，Sean 会尽快通过邮件发送简历。";
        } catch (Exception e) {
            return "登记失败，请稍后重试或直接在「关于我」页面提交。";
        }
    }

    @Tool(name = "subscribeEmail",
            description = "登记邮件订阅。仅当用户明确表示要订阅并提供了邮箱时才调用。")
    public String subscribeEmail(@ToolParam(description = "用户邮箱地址") String email,
                                 ToolContext toolContext) {
        String emailError = validateEmail(email);
        if (emailError != null) {
            return emailError;
        }
        try {
            contactService.recordSubscribe(ip(toolContext), email.trim());
            return "已登记订阅，后续有新文章会通过邮件通知您。";
        } catch (Exception e) {
            return "登记失败，请稍后重试。";
        }
    }

    private String validateEmail(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            return "邮箱格式不正确：" + email + "。请提供正确的邮箱地址。";
        }
        return null;
    }

    private String ip(ToolContext toolContext) {
        Object ip = toolContext.getContext().get("ip");
        return ip instanceof String s ? s : "";
    }
}
