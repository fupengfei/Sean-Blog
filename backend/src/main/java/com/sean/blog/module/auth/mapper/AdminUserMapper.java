package com.sean.blog.module.auth.mapper;
import com.sean.blog.module.auth.entity.AdminUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface AdminUserMapper {
    AdminUser findByUsername(String username);

    @Update("UPDATE t_admin_user SET password_hash = #{newPassword} WHERE username = #{username}")
    int updatePassword(@Param("username") String username, @Param("newPassword") String newPassword);
}
