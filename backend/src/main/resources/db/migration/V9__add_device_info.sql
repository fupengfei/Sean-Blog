-- =============================================================================
-- V9: 访问日志增加设备信息字段
-- =============================================================================
-- 在 t_page_visit_log 中增加操作系统、浏览器、设备类型三个字段，
-- 用于记录每次访问的客户端设备信息（从 User-Agent 解析得出）。
-- 全部可空：历史数据不受影响，没有 UA 的请求（如爬虫）也不受影响。
-- =============================================================================

ALTER TABLE t_page_visit_log
    ADD COLUMN os          VARCHAR(32)  NULL COMMENT '操作系统，如 Windows / macOS / iOS / Android',
    ADD COLUMN browser     VARCHAR(64)  NULL COMMENT '浏览器及版本，如 Chrome 126 / Safari 17',
    ADD COLUMN device_type VARCHAR(16)  NULL COMMENT '设备类型：DESKTOP | MOBILE | TABLET';
