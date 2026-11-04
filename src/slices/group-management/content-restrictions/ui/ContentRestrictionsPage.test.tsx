import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupApi } from '@/shared/api/bot-management.js';
import { ContentRestrictionsPage } from './ContentRestrictionsPage.js';

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

describe('ContentRestrictionsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(groupApi.getSettings as any).mockResolvedValue({
			content_restrictions: {},
			version: 1,
		});
	});

	it('renders content restrictions title and tabs', async () => {
		render(() => <ContentRestrictionsPage />);
		expect(await screen.findByText('محدودیت محتوا')).toBeInTheDocument();
		expect(await screen.findByText('لینک‌ها و شناسه‌ها')).toBeInTheDocument();
	});

	it('renders remove links control with active default', async () => {
		render(() => <ContentRestrictionsPage />);
		const els = await screen.findAllByText('حذف لینک‌ها');
		expect(els.length).toBeGreaterThan(0);
	});
});
