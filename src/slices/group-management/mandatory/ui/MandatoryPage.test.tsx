import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupApi } from '@/shared/api/bot-management.js';
import { MandatoryPage } from './MandatoryPage.js';

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

describe('MandatoryPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(groupApi.getSettings as any).mockResolvedValue({
			mandatory_membership: {
				forced_add_enabled: true,
				forced_add_count: 3,
				force_join_enabled: true,
				required_channels: ['@channel1'],
				verification_enabled: false,
				exemptions: [],
			},
			version: 1,
		});
	});

	it('renders mandatory title', async () => {
		render(() => <MandatoryPage />);
		expect(await screen.findByText('عضویت اجباری')).toBeInTheDocument();
	});

	it('renders force join section', async () => {
		render(() => <MandatoryPage />);
		const elements = await screen.findAllByText('عضویت اجباری در کانال');
		expect(elements.length).toBeGreaterThan(0);
	});
});
