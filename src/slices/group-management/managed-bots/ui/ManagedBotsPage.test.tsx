import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { botApi } from '@/shared/api/bot-management.js';
import { ManagedBotsPage } from './ManagedBotsPage.js';

vi.mock('@solidjs/router', () => ({
	useParams: () => ({ id: 'g1', botId: 'b1' }),
	useNavigate: () => vi.fn(),
	useLocation: () => ({ pathname: '/group/g1' }),
	A: (props: any) => props.children,
}));

vi.mock('@/shared/api/bot-management.js', () => ({
	botApi: {
		listBots: vi.fn(),
		registerBot: vi.fn(),
	},
}));

describe('ManagedBotsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(botApi.listBots as any).mockResolvedValue([
			{ id: 'b1', bot_username: 'testbot', bot_name: 'Test Bot', status: 'active' },
		]);
	});

	it('renders managed bots title', async () => {
		render(() => <ManagedBotsPage />);
		expect(await screen.findByText('ربات‌های اختصاصی شما')).toBeInTheDocument();
	});

	it('renders bot name from API', async () => {
		render(() => <ManagedBotsPage />);
		expect(await screen.findByText('Test Bot')).toBeInTheDocument();
	});
});
