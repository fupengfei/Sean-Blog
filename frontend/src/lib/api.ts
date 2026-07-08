import {
  Result,
  PageResult,
  Category,
  Tag,
  Article,
  ArticleListParams,
  Project,
  FileBundle,
  FileTreeResponse,
  FileTreeNode,
  ContactRecord,
  ContactListParams,
  LoginRequest,
  LoginResponse,
  PasswordChangeRequest,
  AdminArticleListParams,
} from '@/types';

// ---------------------------------------------------------------------------
// 基础配置
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

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
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

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

export async function getBundleTree(id: number): Promise<FileTreeResponse> {
  return request<FileTreeResponse>(publicUrl(`/bundles/${id}/tree`));
}

export async function getBundleFile(id: number, path: string): Promise<string> {
  const qs = new URLSearchParams({ path });
  return request<string>(publicUrl(`/bundles/${id}/file?${qs.toString()}`));
}

// 联系
export async function postMailContact(): Promise<void> {
  await request<void>(publicUrl('/contact/mail'), { method: 'POST' });
}

export async function postResumeContact(companyName: string, email: string): Promise<void> {
  await request<void>(publicUrl('/contact/resume'), {
    method: 'POST',
    body: JSON.stringify({ companyName, email }),
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
    // 不设置 Content-Type，让浏览器自动设置 multipart boundary
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
