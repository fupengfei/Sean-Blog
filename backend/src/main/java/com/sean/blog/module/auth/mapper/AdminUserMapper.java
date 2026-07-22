package com.sean.blog.module.auth.mapper;
import com.sean.blog.module.auth.entity.AdminUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 管理员用户 MyBatis Mapper 接口，提供对 t_admin_user 表的数据库操作。
 * <p>
 * 包含按用户名查询、插入新用户、统计用户数量以及更新密码等操作。
 * 使用 @Mapper 注解由 MyBatis 自动生成实现类。
 */
@Mapper
public interface AdminUserMapper {

    /**
     * 根据用户名查询管理员用户。
     *
     * @param username 用户名
     * @return 匹配的 AdminUser 对象，未找到时返回 null
     */
    AdminUser findByUsername(String username);

    /**
     * 插入一条新的管理员用户记录。
     *
     * @param user 管理员用户实体
     * @return 受影响的行数
     */
    int insert(AdminUser user);

    /**
     * 统计管理员用户总数。
     *
     * @return 用户数量
     */
    int count();

    /**
     * 更新指定用户名的密码哈希。
     * <p>
     * 使用 @Update 注解直接执行 SQL，适用于简单更新场景。
     *
     * @param username    用户名
     * @param newPassword 新的 BCrypt 密码哈希
     * @return 受影响的行数
     */
    @Update("UPDATE t_admin_user SET password_hash = #{newPassword} WHERE username = #{username}")
    int updatePassword(@Param("username") String username, @Param("newPassword") String newPassword);
}
