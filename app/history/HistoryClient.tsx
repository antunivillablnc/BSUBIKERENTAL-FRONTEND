"use client";
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMyRentalHistory } from '@/lib/hooks/useMyRentalHistory';

export default function HistoryClient() {
	const [page, setPage] = useState(1);
	const [query, setQuery] = useState('');
	const limit = 10;
	const { data, isLoading, error, refetch } = useMyRentalHistory({ page, limit });

	const items = data?.items || [];
	const total = data?.total || 0;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	// Derived
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return items;
		return items.filter((r) => {
			const name = String(r?.bikeName || r?.bikeId || '').toLowerCase();
			return name.includes(needle);
		});
	}, [items, query]);

	// Removed quick stats per request

	function exportCsv() {
		if (!filtered.length) return;
		const header = ['Bike', 'Start', 'End', 'Status'];
		const rows = filtered.map((r) => {
			const s = r?.startDate ? new Date(String(r.startDate)) : null;
			const e = r?.endDate ? new Date(String(r.endDate)) : null;
			const start = s && !isNaN(s.getTime()) ? s.toISOString() : '';
			const end = e && !isNaN(e.getTime()) ? e.toISOString() : '';
			const status = r?.status || (r?.endDate ? 'Completed' : 'In Progress');
			return [
				String(r?.bikeName || r?.bikeId || 'Bike'),
				start,
				end,
				status,
			].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',');
		});
		const csv = [header.join(','), ...rows].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		const d = new Date();
		const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
		a.href = url;
		a.download = `rental_history_${iso}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	return (
		<div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 20px' }}>
			{/* Page Header */}
			<div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 24, padding: '18px 16px', marginBottom: 12, textAlign: 'center', boxShadow: '0 2px 10px var(--shadow-color)' }}>
				<h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>My Rental History</h1>
				<div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>View your completed rides</div>

				{/* Toolbar */}
				<div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
					<div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 8 }}>
						<input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search bike…"
							style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', minWidth: 240, color: 'var(--text-primary)' }}
						/>
						<button
							onClick={exportCsv}
							disabled={!filtered.length}
							style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: filtered.length ? 'pointer' : 'not-allowed', opacity: filtered.length ? 1 : 0.6 }}
						>
							Export CSV
						</button>
						<button
							onClick={() => refetch()}
							style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
						>
							Refresh
						</button>
						<Link href="/home" style={{ textDecoration: 'none' }}>
							<button
								style={{ background: 'var(--accent-color)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
							>
								Back to Home
							</button>
						</Link>
					</div>
				</div>
			</div>

			{/* Stats removed per request */}

			<div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
				<div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<div style={{ fontWeight: 700, color: 'var(--text-secondary)' }} />
					<div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
						Page {page} of {totalPages}
					</div>
				</div>

				{error && (
					<div style={{ padding: '12px 16px', color: '#ef4444' }}>
						{error}
					</div>
				)}

				{!isLoading && filtered.length === 0 && !error && (
					<div style={{ padding: '24px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>
						<div>No rental history yet.</div>
						<div style={{ marginTop: 10 }}>
							<Link href="/reserve" style={{ textDecoration: 'none' }}>
								<button style={{ background: 'var(--accent-color)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>
									Rent a Bike
								</button>
							</Link>
						</div>
					</div>
				)}

				{filtered.length > 0 && (
					<div style={{ width: '100%', overflowX: 'auto' }}>
						<table style={{ width: '100%', borderCollapse: 'collapse' }}>
							<thead>
								<tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
									<th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Bike</th>
									<th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Start</th>
									<th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>End</th>
									<th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((r) => {
									const startDate = r?.startDate ? new Date(String(r.startDate)) : null;
									const endDate = r?.endDate ? new Date(String(r.endDate)) : null;
									const start = startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleString() : '—';
									const end = endDate && !isNaN(endDate.getTime()) ? endDate.toLocaleString() : '—';
									const status = r?.status || (r?.endDate ? 'Completed' : 'In Progress');
									return (
										<tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
											<td style={{ padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
												{r.bikeName || r.bikeId || 'Bike'}
											</td>
											<td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
												{start}
											</td>
											<td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
												{end}
											</td>
											<td style={{ padding: '12px 16px' }}>
												<span
													style={{
														display: 'inline-block',
														padding: '4px 8px',
														borderRadius: 999,
														fontSize: 12,
														fontWeight: 800,
														color: status === 'Completed' ? '#065f46' : '#7c2d12',
														background: status === 'Completed' ? '#d1fae5' : '#ffedd5',
														border: `1px solid ${status === 'Completed' ? '#10b981' : '#f59e0b'}`,
													}}
												>
													{status}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination */}
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: 12 }}>
					<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
						{total > 0 ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` : '—'}
					</div>
					<div style={{ display: 'flex', gap: 8 }}>
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page <= 1 || isLoading}
							style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: page <= 1 || isLoading ? 'not-allowed' : 'pointer', opacity: page <= 1 || isLoading ? 0.6 : 1 }}
						>
							&lt;
						</button>
						<button
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page >= totalPages || isLoading}
							style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: page >= totalPages || isLoading ? 'not-allowed' : 'pointer', opacity: page >= totalPages || isLoading ? 0.6 : 1 }}
						>
							&gt;
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}



