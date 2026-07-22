# =============================================================================
# Sean's AI World Blog — Backend Docker 镜像
# 使用多阶段构建（Multi-stage Build）减小最终镜像体积
# =============================================================================

# =============================================================================
# Stage 1: 构建阶段 — 使用 Maven + JDK 21 编译项目
# 策略：先单独复制 pom.xml 并下载依赖（利用 Docker 层缓存），再复制源码编译
# =============================================================================
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
# 第一步：仅复制 pom.xml，下载所有 Maven 依赖（此层可被缓存，源码修改时无需重复下载）
COPY pom.xml .
# -B: 非交互模式，避免输出阻塞
RUN mvn dependency:go-offline -B
# 第二步：复制源码并执行打包（-DskipTests 跳过测试，加快构建）
COPY src ./src
RUN mvn clean package -DskipTests -B

# =============================================================================
# Stage 2: 运行阶段 — 仅使用 JRE 21 运行环境，不包含 JDK
# 优点：镜像更小、攻击面更少、启动更快
# 基础镜像：Eclipse Temurin JRE 21（兼容性好于 Alpine 版本）
# =============================================================================
FROM eclipse-temurin:21-jre
WORKDIR /app
# 从构建阶段复制已编译的 jar 包
COPY --from=builder /build/target/*.jar app.jar
# 声明服务端口（Spring Boot 默认 8880）
EXPOSE 8880
# 直接使用 java -jar 启动，JVM 参数可在 docker-compose 或运行时通过 JAVA_OPTS 环境变量追加
ENTRYPOINT ["java", "-jar", "app.jar"]
