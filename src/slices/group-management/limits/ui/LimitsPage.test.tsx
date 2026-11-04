import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupApi } from '@/shared/api/bot-management.js';
import { LimitsPage } from './LimitsPage.js';

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

describe('LimitsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(groupApi.getSettings as any).mockResolvedValue({
			limits: {
				minMessageLength: 1,
				maxMessageLength: 4096,
				floodMessages: 5,
				floodWindow: 10,
				duplicateCount: 3,
				duplicateWindow: 60,
			},
			version: 1,
		});
	});

	it('renders limits title', async () => {
		render(() => <LimitsPage />);
		expect(await screen.findByText('محدودیت‌ها')).toBeInTheDocument();
	});

	it('renders message length section', async () => {
		render(() => <LimitsPage />);
		const elements = await screen.findAllByText('طول پیام');
		expect(elements.length).toBeGreaterThan(0);
	});
});
