package com.sean.blog.module.auth.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.auth.dto.LoginRequest;
import com.sean.blog.module.auth.dto.PasswordChangeRequest;
import com.sean.blog.module.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/admin")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public Result<?> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(authService.login(request.getUsername(), request.getPassword()));
    }

    @PutMapping("/password")
    public Result<?> changePassword(@Valid @RequestBody PasswordChangeRequest request,
                                     Principal principal) {
        authService.changePassword(principal.getName(),
                request.getOldPassword(), request.getNewPassword());
        return Result.success();
    }
}
