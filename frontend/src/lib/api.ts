import {
  Result,
  PageResult,
  Category,
  Tag,
  Article,
  ArticleSummary,
  ArticleRelations,
  ArticleListParams,
  Project,
  FileBundle,
  FileTreeResponse,
  FileTreeNode,
  ContactRecord,
  ContactListParams,
  ContactStats,
  LoginRequest,
  LoginResponse,
  PasswordChangeRequest,
  AdminArticleListParams,
  PageViewRequest,
  PageViewStatVO,
  PageViewTrendVO,
  PageViewSummaryVO,
  CountryStatVO,
  VisitorSummaryVO,
} from '@/types';

// ---------------------------------------------------------------------------
// 基础配置
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function adminUrl(path: string): string {
  return `${API_BASE}/admin${path}`;
}

function publicUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// ---------------------------------------------------------------------------
// 通用 fetch 封装
// ---------------------------------------------------------------------------

class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  // 分离 headers 和其余选项，避免 options.headers 覆盖默认 headers
  const { headers: optHeaders, ...rest } = options;
  const isFormData = rest.body instanceof FormData;

  const res = await fetch(url, {
    ...rest,
    headers: {
      // FormData 不设置 Content-Type，让浏览器自动生成 multipart boundary
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...optHeaders,
    },
  });

  // 401 / 403 → 仅对 admin 接口清除 token 并跳转登录页，公开接口只抛异常
  if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
    const isAdminRequest = url.includes('/admin');
    const isLoginRequest = url.includes('/admin/login');
    if (isAdminRequest && !isLoginRequest) {
      localStorage.removeItem('token');
      window.location.href = '/admin/login';
      throw new ApiError(res.status, '登录已过期，请重新登录');
    }
  }

  // 非 JSON 响应（例如文件内容）
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new ApiError(res.status, `HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.text()) as unknown as T;
  }

  const body: Result<T> = await res.json();

  if (body.code !== 200) {
    throw new ApiError(body.code, body.message || '请求失败');
  }

  return body.data;
}

async function requestWithAuth<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAdminToken();
  if (!token) {
    throw new ApiError(401, '未登录');
  }
  return request<T>(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// ---------------------------------------------------------------------------
// 公开 API
// ---------------------------------------------------------------------------

// 分类
export async function getCategories(): Promise<Category[]> {
  return request<Category[]>(publicUrl('/categories'));
}

// 标签
export async function getTags(): Promise<Tag[]> {
  return request<Tag[]>(publicUrl('/tags'));
}

// 文章
export async function getArticles(params: ArticleListParams = {}): Promise<PageResult<Article>> {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', String(params.category));
  if (params.tag) qs.set('tag', String(params.tag));
  if (params.page) qs.set('page', String(params.page));
  if (params.size) qs.set('size', String(params.size));
  if (params.keyword) qs.set('keyword', params.keyword);
  return request<PageResult<Article>>(publicUrl(`/articles?${qs.toString()}`));
}

export async function getFeaturedArticles(limit = 6): Promise<Article[]> {
  return request<Article[]>(publicUrl(`/articles/featured?limit=${limit}`));
}

export async function getArticleBySlug(slug: string): Promise<Article> {
  return request<Article>(publicUrl(`/articles/${slug}`));
}

/** Fetch previous and next articles relative to the given slug */
export async function getAdjacentArticles(
  slug: string,
): Promise<{ prev: Article | null; next: Article | null }> {
  // Fetch a large page of articles to find adjacent ones; for a personal blog this is fine
  const result = await getArticles({ page: 1, size: 100 });
  const articles = result.list;
  const idx = articles.findIndex((a) => a.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? articles[idx - 1] : null,
    next: idx < articles.length - 1 ? articles[idx + 1] : null,
  };
}

/** 获取前置文章 */
export async function getPrerequisiteArticle(
  slug: string,
): Promise<ArticleSummary | null> {
  return request<ArticleSummary | null>(
    publicUrl(`/articles/${slug}/prerequisite`),
  );
}

/** 获取相关文章 */
export async function getRelatedArticles(
  slug: string,
): Promise<ArticleSummary[]> {
  return request<ArticleSummary[]>(
    publicUrl(`/articles/${slug}/related`),
  );
}

// 项目
export async function getProjects(): Promise<Project[]> {
  return request<Project[]>(publicUrl('/projects'));
}

export async function getFeaturedProjects(limit = 6): Promise<Project[]> {
  return request<Project[]>(publicUrl(`/projects/featured?limit=${limit}`));
}

// Skill 文件包
export async function getBundles(): Promise<FileBundle[]> {
  return request<FileBundle[]>(publicUrl('/bundles'));
}

export async function getFeaturedBundles(limit = 6): Promise<FileBundle[]> {
  return request<FileBundle[]>(publicUrl(`/bundles/featured?limit=${limit}`));
}

export async function getBundleTree(id: number): Promise<FileTreeResponse> {
  return request<FileTreeResponse>(publicUrl(`/bundles/${id}/tree`));
}

export async function getBundleFile(id: number, path: string): Promise<string> {
  const qs = new URLSearchParams({ path });
  return request<string>(publicUrl(`/bundles/${id}/file?${qs.toString()}`));
}

// 联系
/** 首页商务合作 */
export async function postBusinessContact(
  companyName: string,
  email: string,
  content: string,
): Promise<void> {
  await request<void>(publicUrl('/contact/business'), {
    method: 'POST',
    body: JSON.stringify({ companyName, email, content }),
  });
}

/** 关于我 - 发送邮件 */
export async function postMailContact(email: string, content: string): Promise<void> {
  await request<void>(publicUrl('/contact/mail'), {
    method: 'POST',
    body: JSON.stringify({ email, content }),
  });
}

/** 获取简历 */
export async function postResumeContact(companyName: string, email: string): Promise<void> {
  await request<void>(publicUrl('/contact/resume'), {
    method: 'POST',
    body: JSON.stringify({ companyName, email }),
  });
}

/** 订阅 */
export async function postSubscribeContact(email: string): Promise<void> {
  await request<void>(publicUrl('/contact/subscribe'), {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

// 认证
export async function adminLogin(req: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>(adminUrl('/login'), {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function adminChangePassword(req: PasswordChangeRequest): Promise<void> {
  await requestWithAuth<void>(adminUrl('/password'), {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

// 文章管理
export async function adminGetArticles(params: AdminArticleListParams = {}): Promise<PageResult<Article>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.size) qs.set('size', String(params.size));
  if (params.keyword) qs.set('keyword', params.keyword);
  return requestWithAuth<PageResult<Article>>(adminUrl(`/articles?${qs.toString()}`));
}

export async function adminCreateArticle(formData: FormData): Promise<Article> {
  return requestWithAuth<Article>(adminUrl('/articles'), {
    method: 'POST',
    body: formData,
    headers: {} as Record<string, string>,
  });
}

export async function adminUpdateArticleStatus(id: number, status: string): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}?status=${status}`), {
    method: 'PUT',
  });
}

export async function adminToggleArticleFeature(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}/feature`), {
    method: 'PUT',
  });
}

export async function adminDeleteArticle(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}`), {
    method: 'DELETE',
  });
}

/** Admin: 根据 ID 获取单篇文章 */
export async function adminGetArticleById(id: number): Promise<Article> {
  return requestWithAuth<Article>(adminUrl(`/articles/${id}`));
}

/** Admin: 查询文章关联关系 */
export async function adminGetArticleRelations(
  id: number,
): Promise<ArticleRelations> {
  return requestWithAuth<ArticleRelations>(adminUrl(`/articles/${id}/related`));
}

/** Admin: 设置前置文章 */
export async function adminSetPrerequisite(
  id: number,
  prerequisiteId: number | null,
): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}/prerequisite`), {
    method: 'PUT',
    body: JSON.stringify({ prerequisiteId }),
  });
}

/** Admin: 移除前置文章 */
export async function adminRemovePrerequisite(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}/prerequisite`), {
    method: 'DELETE',
  });
}

/** Admin: 全量替换相关文章 */
export async function adminSetRelated(
  id: number,
  relatedIds: number[],
): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}/related`), {
    method: 'PUT',
    body: JSON.stringify({ relatedIds }),
  });
}

// 分类管理
export async function adminGetCategories(): Promise<Category[]> {
  return requestWithAuth<Category[]>(adminUrl('/categories'));
}

export async function adminCreateCategory(name: string, slug: string): Promise<Category> {
  return requestWithAuth<Category>(adminUrl('/categories'), {
    method: 'POST',
    body: JSON.stringify({ name, slug }),
  });
}

export async function adminUpdateCategory(id: number, name: string, slug: string): Promise<Category> {
  return requestWithAuth<Category>(adminUrl(`/categories/${id}`), {
    method: 'PUT',
    body: JSON.stringify({ name, slug }),
  });
}

export async function adminDeleteCategory(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/categories/${id}`), {
    method: 'DELETE',
  });
}

// 标签管理
export async function adminGetTags(): Promise<Tag[]> {
  return requestWithAuth<Tag[]>(adminUrl('/tags'));
}

export async function adminCreateTag(name: string, slug: string): Promise<Tag> {
  return requestWithAuth<Tag>(adminUrl('/tags'), {
    method: 'POST',
    body: JSON.stringify({ name, slug }),
  });
}

export async function adminUpdateTag(id: number, name: string, slug: string): Promise<Tag> {
  return requestWithAuth<Tag>(adminUrl(`/tags/${id}`), {
    method: 'PUT',
    body: JSON.stringify({ name, slug }),
  });
}

export async function adminDeleteTag(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/tags/${id}`), {
    method: 'DELETE',
  });
}

// 项目管理
export async function adminGetProjects(): Promise<Project[]> {
  return requestWithAuth<Project[]>(adminUrl('/projects'));
}

export async function adminCreateProject(formData: FormData): Promise<Project> {
  return requestWithAuth<Project>(adminUrl('/projects'), {
    method: 'POST',
    body: formData,
    headers: {} as Record<string, string>,
  });
}

export async function adminUpdateProject(id: number, formData: FormData): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/projects/${id}`), {
    method: 'PUT',
    body: formData,
    headers: {} as Record<string, string>,
  });
}

export async function adminToggleProjectFeature(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/projects/${id}/feature`), {
    method: 'PUT',
  });
}

export async function adminUpdateProjectSort(id: number, sortOrder: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/projects/${id}/sort?sortOrder=${sortOrder}`), {
    method: 'PUT',
  });
}

export async function adminDeleteProject(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/projects/${id}`), {
    method: 'DELETE',
  });
}

// Bundle 管理
export async function adminGetBundles(): Promise<FileBundle[]> {
  return requestWithAuth<FileBundle[]>(adminUrl('/bundles'));
}

export async function adminCreateBundle(formData: FormData): Promise<FileBundle> {
  return requestWithAuth<FileBundle>(adminUrl('/bundles'), {
    method: 'POST',
    body: formData,
    headers: {} as Record<string, string>,
  });
}

export async function adminPublishBundle(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/bundles/${id}/publish`), {
    method: 'PUT',
  });
}

export async function adminUnpublishBundle(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/bundles/${id}/unpublish`), {
    method: 'PUT',
  });
}

export async function adminUpdateBundle(
  id: number,
  data: { name: string; description: string; type: string },
): Promise<FileBundle> {
  return requestWithAuth<FileBundle>(adminUrl(`/bundles/${id}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function adminToggleBundleFeature(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/bundles/${id}/feature`), {
    method: 'PUT',
  });
}

export async function adminDeleteBundle(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/bundles/${id}`), {
    method: 'DELETE',
  });
}

// 联系记录管理
export async function adminGetContacts(params: ContactListParams = {}): Promise<PageResult<ContactRecord>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.size) qs.set('size', String(params.size));
  if (params.type) qs.set('type', params.type);
  return requestWithAuth<PageResult<ContactRecord>>(adminUrl(`/contacts?${qs.toString()}`));
}

export async function adminGetContactStats(): Promise<ContactStats> {
  return requestWithAuth<ContactStats>(adminUrl('/contacts/stats'));
}

// ---------------------------------------------------------------------------
// 访问统计
// ---------------------------------------------------------------------------

/** 发送 PV 事件（公开 API） */
export async function postPageView(data: PageViewRequest): Promise<void> {
  await request<void>(publicUrl('/page-views'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** PV 排行 */
export async function getPageViewRanking(
  window: string = '7d',
  pageType?: string,
): Promise<PageViewStatVO[]> {
  const qs = new URLSearchParams({ window });
  if (pageType) qs.set('pageType', pageType);
  return requestWithAuth<PageViewStatVO[]>(adminUrl(`/stats/page-views?${qs.toString()}`));
}

/** PV 每日趋势 */
export async function getPageViewTrend(days: number = 7): Promise<PageViewTrendVO[]> {
  return requestWithAuth<PageViewTrendVO[]>(adminUrl(`/stats/page-views/trend?days=${days}`));
}

/** PV 汇总 */
export async function getPageViewSummary(): Promise<PageViewSummaryVO> {
  return requestWithAuth<PageViewSummaryVO>(adminUrl('/stats/page-views/summary'));
}

/** 访客国家排行 */
export async function getVisitorCountries(window: string = '7d'): Promise<CountryStatVO[]> {
  return requestWithAuth<CountryStatVO[]>(adminUrl(`/stats/visitors/countries?window=${window}`));
}

/** 访客 UV 汇总 */
export async function getVisitorSummary(): Promise<VisitorSummaryVO> {
  return requestWithAuth<VisitorSummaryVO>(adminUrl('/stats/visitors/summary'));
}
