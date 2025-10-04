export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return base.replace(/\/$/, '');
}

export async function apiFetch(input: string, init?: RequestInit) {
  const base = getApiBaseUrl();
  const url = `${base}${input.startsWith('/') ? input : `/${input}`}`;
  const headers = new Headers(init?.headers || {});
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {}
  return fetch(url, { ...init, headers, credentials: 'include' });
}


