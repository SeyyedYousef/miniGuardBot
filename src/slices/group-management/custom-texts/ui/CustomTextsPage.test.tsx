import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupApi } from '@/shared/api/bot-management.js';
import { CustomTextsPage } from './CustomTextsPage.js';

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

describe('CustomTextsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(groupApi.getSettings as any).mockResolvedValue({
			custom_texts: {
				welcomeText: 'Hello!',
				warningText: '',
				silenceStartText: '',
				silenceEndText: '',
				rulesText: '',
				forceJoinText: '',
				forceAddText: '',
				inlineButtons: [],
			},
			version: 1,
		});
	});

	it('renders custom texts title', async () => {
		render(() => <CustomTextsPage />);
		const titles = await screen.findAllByText(/متن‌های سفارشی/);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('renders welcome text section', async () => {
		render(() => <CustomTextsPage />);
		const elements = await screen.findAllByText(/خوش‌آمدگویی/);
		expect(elements.length).toBeGreaterThan(0);
	});

	it('renders Add-Counter text editors and interactive variable chips', async () => {
		render(() => <CustomTextsPage />);
		expect((await screen.findAllByText(/متن پیام ادشمار/)).length).toBeGreaterThan(0);
		expect((await screen.findAllByText(/متن تکمیل هدف ادشمار/)).length).toBeGreaterThan(0);
		expect((await screen.findAllByText('{added}')).length).toBeGreaterThan(0);
		expect((await screen.findAllByText('{remain}')).length).toBeGreaterThan(0);
		expect((await screen.findAllByText('{target}')).length).toBeGreaterThan(0);
	});
});
