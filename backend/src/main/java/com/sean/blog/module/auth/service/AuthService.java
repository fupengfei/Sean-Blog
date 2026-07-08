package com.sean.blog.module.auth.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.module.auth.entity.AdminUser;
import com.sean.blog.module.auth.mapper.AdminUserMapper;
import com.sean.blog.module.auth.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class AuthService {

    private final AdminUserMapper adminUserMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(AdminUserMapper adminUserMapper,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.adminUserMapper = adminUserMapper;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    public Map<String, Object> login(String username, String password) {
        AdminUser user = adminUserMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException(401, "用户名或密码错误");
        }
        String token = tokenProvider.generateToken(username);
        return Map.of("token", token, "expiresIn", 86400000L);
    }

    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword) {
        AdminUser user = adminUserMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BusinessException(400, "旧密码不正确");
        }
        String newHash = passwordEncoder.encode(newPassword);
        adminUserMapper.updatePassword(username, newHash);
    }
}
