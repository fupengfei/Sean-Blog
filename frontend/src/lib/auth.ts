export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}

export function login(token: string): void {
  localStorage.setItem('token', token);
}

export function logout(): void {
  localStorage.removeItem('token');
  window.location.href = '/admin/login';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}
