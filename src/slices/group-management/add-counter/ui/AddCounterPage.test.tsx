import { fireEvent, render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupApi } from '@/shared/api/bot-management.js';
import { AddCounterPage } from './AddCounterPage.js';

vi.mock('@solidjs/router', () => ({
	useParams: () => ({ id: 'g1' }),
	useNavigate: () => vi.fn(),
}));

vi.mock('@/shared/api/bot-management.js', () => ({
	groupApi: {
		getSettings: vi.fn(),
		updateSettings: vi.fn(),
		getAddCounterStats: vi.fn(),
		resetAddCounter: vi.fn(),
		adjustAddCounter: vi.fn(),
	},
}));

describe('AddCounterPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(groupApi.getSettings as any).mockResolvedValue({
			add_counter: {
				enabled: true,
				sendProgressMessage: true,
				sendCompletionMessage: true,
				requireTargetToChat: true,
				requiredCount: 5,
				preventDuplicateReadd: true,
				ignoreBots: true,
				countAdmins: true,
				countInviteLinks: false,
				autoDeleteSec: 45,
				resetPeriodDays: 0,
				leaderboardEnabled: true,
				exemptions: ['@vip_user'],
			},
			mandatory_membership: {
				forced_add_enabled: true,
				forced_add_count: 5,
			},
			version: 2,
		});
		(groupApi.getAddCounterStats as any).mockResolvedValue({
			group_id: 'g1',
			settings: { requiredCount: 5 },
			total_group_adds: 19,
			tracked_users_count: 3,
			completed_users_count: 1,
			period_started_at: new Date().toISOString(),
			leaderboard: [
				{
					rank: 1,
					userId: 1001,
					name: 'علی‌رضا محمدی',
					username: 'alireza_m',
					count: 8,
					lifetimeCount: 10,
					lastAddedAt: new Date().toISOString(),
					targetCompleted: true,
				},
			],
		});
		(groupApi.updateSettings as any).mockResolvedValue({ version: 3 });
		(groupApi.resetAddCounter as any).mockResolvedValue({
			ok: true,
			total_group_adds: 0,
			leaderboard: [],
		});
	});

	it('renders Add-Counter title, summary telemetry, and leaderboard', async () => {
		render(() => <AddCounterPage />);
		expect(await screen.findByText('قابلیت ادشمار پیشرفته')).toBeInTheDocument();
		expect(await screen.findByText('علی‌رضا محمدی')).toBeInTheDocument();
		expect(await screen.findByText('19')).toBeInTheDocument();
	});

	it('saves updated target count preset via add_counter settings category', async () => {
		render(() => <AddCounterPage />);
		const preset10 = await screen.findByRole('button', { name: '10' });
		fireEvent.click(preset10);

		const saveButtons = await screen.findAllByRole('button', { name: /ذخیره/ });
		fireEvent.click(saveButtons[0]);

		expect(groupApi.updateSettings).toHaveBeenCalledWith(
			'g1',
			'add_counter',
			expect.objectContaining({
				enabled: true,
				requiredCount: 10,
			}),
			2,
		);
	});
});
