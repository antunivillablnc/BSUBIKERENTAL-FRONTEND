export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return base.replace(/\/$/, '');
}

export async function apiFetch(input: string, init?: RequestInit) {
  const base = getApiBaseUrl();
  const url = `${base}${input.startsWith('/') ? input : `/${input}`}`;
  return fetch(url, init);
}


