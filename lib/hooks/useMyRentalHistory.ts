/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';

export type RentalHistoryItem = {
	_id: string;
	userId: string;
	bikeId?: string | null;
	bikeName?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	status?: string | null;
	totalCost?: number | null;
	createdAt?: string | null;
};

export type UseMyRentalHistoryParams = {
	page?: number;
	limit?: number;
	sort?: string;
};

export function useMyRentalHistory(params: UseMyRentalHistoryParams = {}) {
	const { page = 1, limit = 10, sort = '-createdAt' } = params;
	const [data, setData] = useState<{ items: RentalHistoryItem[]; total: number; page: number; limit: number } | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Read user hints from localStorage (used as fallback when auth cookie is not available on this origin)
	const userHints = useMemo(() => {
		if (typeof window === 'undefined') return null;
		try {
			const raw = localStorage.getItem('user');
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}, []);

	const qs = useMemo(() => {
		const usp = new URLSearchParams();
		usp.set('page', String(page));
		usp.set('limit', String(limit));
		if (sort) usp.set('sort', sort);
		// Provide fallback identifiers so the API route can resolve data even without an auth cookie
		if (userHints?.id) usp.set('userId', String(userHints.id));
		if (userHints?.email) usp.set('email', String(userHints.email));
		return usp.toString();
	}, [page, limit, sort, userHints?.id, userHints?.email]);

	const fetchData = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch(`/api/rentalhistory/me?${qs}`, { credentials: 'include' });
			if (!res.ok) throw new Error(`Failed to load rental history (${res.status})`);
			const json = await res.json();
			const items: RentalHistoryItem[] = Array.isArray(json?.items) ? json.items : [];
			setData({ items, total: Number(json?.total || 0), page: Number(json?.page || page), limit: Number(json?.limit || limit) });
		} catch (e: any) {
			setError(e?.message || 'Failed to load rental history');
			setData({ items: [], total: 0, page, limit });
		} finally {
			setIsLoading(false);
		}
	}, [qs, page, limit]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return { data, isLoading, error, refetch: fetchData };
}



