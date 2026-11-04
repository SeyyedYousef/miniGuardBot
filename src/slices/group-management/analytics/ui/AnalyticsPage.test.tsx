import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupApi } from '@/shared/api/bot-management.js';
import { AnalyticsPage } from './AnalyticsPage.js';

vi.mock('@solidjs/router', () => ({
	useParams: () => ({ id: 'g1', botId: 'b1' }),
	useNavigate: () => vi.fn(),
	useLocation: () => ({ pathname: '/group/g1' }),
	A: (props: any) => props.children,
}));

vi.mock('@/shared/api/bot-management.js', () => ({
	groupApi: {
		getAnalytics: vi.fn(),
		getGroup: vi.fn(),
	},
}));

describe('AnalyticsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(groupApi.getAnalytics as any).mockResolvedValue({
			summary: {
				total_members: 1000,
				members_change: 50,
				total_messages: 5000,
				messages_change_pct: 10,
				spam_blocked: 200,
				new_members: 60,
				members_left: 10,
				active_users: 150,
			},
			growth: [{ date: '2026-05-16', value: 1000 }],
			activity: [{ date: '2026-05-16', value: 500 }],
		});
		(groupApi.getGroup as any).mockResolvedValue({ id: 'g1', chat_title: 'Test Group' });
	});

	it('renders analytics title', async () => {
		render(() => <AnalyticsPage />);
		expect(await screen.findByText('آمار و تحلیل')).toBeInTheDocument();
	});

	it('renders activity chart header', async () => {
		render(() => <AnalyticsPage />);
		expect(await screen.findByText('فعالیت پیام‌ها')).toBeInTheDocument();
	});
});
