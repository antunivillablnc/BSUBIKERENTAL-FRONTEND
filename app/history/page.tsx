import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HistoryClient from './HistoryClient';

export default async function AccountHistoryPage() {
	const cookieStore = await cookies();
	const auth = cookieStore.get('auth')?.value;
	if (!auth) {
		redirect('/');
	}
	return <HistoryClient />;
}



