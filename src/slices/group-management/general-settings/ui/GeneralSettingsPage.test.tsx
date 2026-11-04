import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupApi } from '@/shared/api/bot-management.js';
import { GeneralSettingsPage } from './GeneralSettingsPage.js';

vi.mock('@solidjs/router', () => ({
	useParams: () => ({ id: 'g1', botId: 'b1' }),
	useNavigate: () => vi.fn(),
	useLocation: () => ({ pathname: '/group/g1' }),
	A: (props: any) => props.children,
}));

vi.mock('@/shared/api/bot-management.js', () => ({
	groupApi: {
		getSettings: vi.fn(),
		updateSettings: vi.fn(),
	},
}));

describe('GeneralSettingsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(groupApi.getSettings as any).mockResolvedValue({
			general: { language: 'fa', timezone: 'Asia/Tehran', welcomeMessage: true },
			version: 1,
		});
	});

	it('renders settings title', async () => {
		render(() => <GeneralSettingsPage />);
		expect(await screen.findByText('تنظیمات عمومی')).toBeInTheDocument();
	});

	it('renders core sections', async () => {
		render(() => <GeneralSettingsPage />);
		const elements = await screen.findAllByText('تنظیمات اصلی ربات');
		expect(elements.length).toBeGreaterThan(0);
	});
});
