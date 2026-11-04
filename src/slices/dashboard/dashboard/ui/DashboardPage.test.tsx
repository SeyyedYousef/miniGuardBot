import { render, screen } from '@solidjs/testing-library';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage.js';

// Mock the router and query hooks
vi.mock('@solidjs/router', () => ({
	useNavigate: () => vi.fn(),
	useLocation: () => ({ pathname: '/dashboard' }),
	A: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock('@tma.js/sdk-solid', () => ({
	backButton: { hide: vi.fn(), show: vi.fn(), onClick: vi.fn() },
	hapticFeedback: { impactOccurred: vi.fn() },
	initData: {
		user: () => ({ first_name: 'Test', photo_url: '' }),
	},
}));

vi.mock('@/shared/api/bot-management.js', () => ({
	botApi: {
		listBots: vi.fn().mockResolvedValue([]),
		listGroups: vi.fn().mockResolvedValue([]),
	},
}));

describe('DashboardPage', () => {
	it('renders the dashboard with title', async () => {
		render(() => <DashboardPage />);
		expect(await screen.findByText('گروه‌های تحت مدیریت شما')).toBeInTheDocument();
	});

	it('renders the add group button', async () => {
		render(() => <DashboardPage />);
		const buttons = await screen.findAllByText('افزودن گروه');
		expect(buttons.length).toBeGreaterThan(0);
	});
});
