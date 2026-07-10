// ---------- 基础实体 ----------

export interface Category {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  contentMd: string;
  contentHtml: string;
  excerpt: string;
  author: string;
  coverImage: string;
  categoryId: number | null;
  status: string;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  category: Category | null;
  tags: Tag[];
}

export interface Project {
  id: number;
  title: string;
  description: string;
  url: string;
  githubUrl: string;
  coverImage: string;
  tags: string; // JSON string array
  isFeatured: boolean;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileBundle {
  id: number;
  name: string;
  description: string;
  rootPath: string;
  type: string;
  status: string;
  isFeatured: boolean;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileTreeNode {
  id: number;
  name: string;
  nodeType: string; // DIRECTORY | FILE
  filePath: string;
  fileSize: number | null;
  children: FileTreeNode[];
}

export interface FileTreeResponse {
  bundleId: number;
  bundleName: string;
  tree: FileTreeNode[];
}

export interface ContactRecord {
  id: number;
  type: string; // BUSINESS | MAIL | RESUME | SUBSCRIBE
  content: string;
  companyName: string;
  email: string;
  ipAddress: string;
  createdAt: string;
}

/** 各类型联系记录的数量统计，key 为类型 (BUSINESS/MAIL/RESUME/SUBSCRIBE) */
export type ContactStats = Record<string, number>;

// ---------- 认证相关 ----------

export interface LoginRequest {
  username: string;
  password: string;
}

export interface PasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
}

// ---------- 通用响应包装 ----------

export interface Result<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

// ---------- 请求参数 ----------

export interface ArticleListParams {
  category?: number;
  tag?: number;
  page?: number;
  size?: number;
  keyword?: string;
}

export interface ContactListParams {
  page?: number;
  size?: number;
  type?: string;
}

export interface AdminArticleListParams {
  page?: number;
  size?: number;
  keyword?: string;
}

// ---------- 统计分析 ----------

export interface PageViewRequest {
  pageType: string;
  pageKey?: string;
}

export interface PageViewStatVO {
  pageType: string;
  pageKey: string;
  name: string;
  cnt: number;
}

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

export interface PageViewSummaryVO {
  totalPv: number;
  todayPv: number;
  weekPv: number;
  totalDelta: number;
  weekDelta: number;
}

export interface CountryStatVO {
  country: string;
  cnt: number;
  percentage: number;
}

export interface VisitorSummaryVO {
  totalUv: number;
  todayUv: number;
  weekUv: number;
}
