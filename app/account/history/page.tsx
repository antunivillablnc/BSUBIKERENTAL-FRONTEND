import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HistoryClient from './HistoryClient';

export default function AccountHistoryPage() {
	const auth = cookies().get('auth')?.value;
	if (!auth) {
		redirect('/');
	}
	return <HistoryClient />;
}



