// ---------- 基础实体 ----------

/** 文章分类 */
export interface Category {
  /** Long 精度，后端返回 string 类型 */
  id: string;
  /** 分类名称 */
  name: string;
  /** URL 友好的唯一标识 */
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/** 文章标签 */
export interface Tag {
  /** Long 精度，后端返回 string 类型 */
  id: string;
  /** 标签名称 */
  name: string;
  /** URL 友好的唯一标识 */
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 文章实体（完整版，包含正文内容）
 *
 * Slug 格式：`{title-slug}-{timestamp}`，详情页通过 slug 访问
 *
 * 状态字段 `status` 可能值：
 * - `DRAFT` — 草稿
 * - `PUBLISHED` — 已发布
 * - `DELETED` — 已软删除（不物理删除）
 */
export interface Article {
  /** Long 精度，后端返回 string 类型 */
  id: string;
  /** 文章标题 */
  title: string;
  /** URL 友好的唯一标识，格式 {title-slug}-{timestamp} */
  slug: string;
  /** Markdown 原文，用于编辑和存储 */
  contentMd: string;
  /** Markdown 渲染后的 HTML，用于页面展示 */
  contentHtml: string;
  /** 文章摘要，用于卡片和列表展示 */
  excerpt: string;
  /** 作者名称 */
  author: string;
  /** 发布日期 */
  publishDate: string;
  /** 封面图 URL */
  coverImage: string;
  /** 所属分类 ID，可为空 */
  categoryId: string | null;
  /** 状态：DRAFT | PUBLISHED | DELETED */
  status: string;
  /** 是否精选（首页展示） */
  isFeatured: boolean;
  /** 浏览次数 */
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  /** 关联的分类对象 */
  category: Category | null;
  /** 关联的标签列表 */
  tags: Tag[];
}

/** 精简文章摘要（用于关联文章展示，不含 contentMd/contentHtml/tags） */
export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  publishDate: string;
  coverImage: string;
  excerpt: string;
  createdAt: string;
  category: Category | null;
}

/** 文章关联关系（Admin 编辑页初始化用） */
export interface ArticleRelations {
  prerequisite: { id: string; title: string } | null;
  nextArticle: { id: string; title: string } | null;
  related: { id: string; title: string }[];
}

/**
 * 项目实体
 *
 * `tags` 为 JSON 字符串数组（如 `["React","TypeScript"]`），
 * 前端使用前需 `JSON.parse()` 解析
 *
 * `status` 可能值：DRAFT | PUBLISHED | DELETED
 */
export interface Project {
  id: string;
  title: string;
  description: string;
  url: string;
  githubUrl: string;
  coverImage: string;
  /** JSON 字符串数组，前端使用前需 JSON.parse() */
  tags: string;
  isFeatured: boolean;
  /** 排序序号，越小越靠前 */
  sortOrder: number;
  /** 状态：DRAFT | PUBLISHED | DELETED */
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Skill 文件目录（Bundle）
 *
 * 对应服务端 `/data/skills/{bundle_id}/` 目录下的 zip 上传包
 *
 * `status` 可能值：PUBLISHED | UNPUBLISHED
 */
export interface FileBundle {
  id: string;
  name: string;
  description: string;
  /** 服务端的根路径 */
  rootPath: string;
  /** 类型标签（如 SKILL, TOOL 等） */
  type: string;
  /** 状态：PUBLISHED | UNPUBLISHED */
  status: string;
  isFeatured: boolean;
  /** 包含的文件数量 */
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 文件树节点，用于 Skill 浏览页面的左树右内容布局 */
export interface FileTreeNode {
  id: string;
  name: string;
  /** DIRECTORY | FILE */
  nodeType: string;
  /** 文件在 bundle 内的相对路径 */
  filePath: string;
  /** 文件大小（字节），目录为 null */
  fileSize: number | null;
  children: FileTreeNode[];
}

/** 文件树接口响应 */
export interface FileTreeResponse {
  bundleId: string;
  bundleName: string;
  tree: FileTreeNode[];
}

/**
 * 业务联系记录
 *
 * `type` 字段可能值：
 * - `BUSINESS` — 商务合作咨询
 * - `MAIL` — 发送邮件记录
 * - `RESUME` — 简历请求记录
 * - `SUBSCRIBE` — 邮件订阅记录
 */
export interface ContactRecord {
  id: string;
  /** 类型：BUSINESS | MAIL | RESUME | SUBSCRIBE */
  type: string;
  /** 联系内容 / 邮件正文 */
  content: string;
  /** 公司名称（简历请求时填入） */
  companyName: string;
  /** 联系邮箱 */
  email: string;
  /** 客户端 IP 地址 */
  ipAddress: string;
  createdAt: string;
}

/** 各类型联系记录的数量统计，key 为类型 (BUSINESS/MAIL/RESUME/SUBSCRIBE) */
export type ContactStats = Record<string, number>;

// ---------- 认证相关 ----------

/** 登录请求参数 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 修改密码请求参数 */
export interface PasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
}

/** 登录成功响应 */
export interface LoginResponse {
  /** JWT token，后续 Admin 请求需携带 Authorization: Bearer <token> */
  token: string;
  /** token 过期时间（秒） */
  expiresIn: number;
}

// ---------- 通用响应包装 ----------

/** 后端统一响应包装，code=200 表示成功 */
export interface Result<T> {
  code: number;
  message: string;
  data: T;
}

/** 分页响应包装 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

// ---------- 请求参数 ----------

/** 前台文章列表查询参数 */
export interface ArticleListParams {
  /** 分类 slug 筛选 */
  category?: string;
  /** 标签 slug 筛选 */
  tag?: string;
  page?: number;
  size?: number;
  /** 关键词搜索 */
  keyword?: string;
}

/** Admin 联系记录查询参数 */
export interface ContactListParams {
  page?: number;
  size?: number;
  /** 筛选类型：BUSINESS | MAIL | RESUME | SUBSCRIBE */
  type?: string;
}

/** Admin 文章列表查询参数 */
export interface AdminArticleListParams {
  page?: number;
  size?: number;
  keyword?: string;
}

// ---------- 统计分析 ----------

/** 页面浏览上报请求 */
export interface PageViewRequest {
  /** 页面类型：home | blog_list | blog_detail | projects | about | skills | skills_detail */
  pageType: string;
  /** 页面标识（博客 detail 用 slug，skill detail 用 id） */
  pageKey?: string;
}

/** 各页面的 PV 统计 */
export interface PageViewStatVO {
  pageType: string;
  pageKey: string;
  name: string;
  cnt: number;
}

/** 按日维度、分页面类型的 PV 趋势数据 */
export interface PageViewTrendVO {
  day: string;
  home: number;
  blogList: number;
  blogDetail: number;
  projects: number;
  about: number;
  skills: number;
  skillsDetail: number;
}

/** PV 汇总概览 */
export interface PageViewSummaryVO {
  totalPv: number;
  todayPv: number;
  weekPv: number;
  totalDelta: number;
  weekDelta: number;
}

/** 按国家/地区统计的访问来源 */
export interface CountryStatVO {
  country: string;
  cnt: number;
  percentage: number;
}

/** 独立访客 UV 汇总 */
export interface VisitorSummaryVO {
  totalUv: number;
  todayUv: number;
  weekUv: number;
}
