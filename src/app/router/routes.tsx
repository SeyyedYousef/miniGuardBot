import { type Component, lazy } from 'solid-js';
import { OwnerLayout } from '@/widgets/owner/OwnerLayout.js';
import { OwnerRouteGuard } from './OwnerRouteGuard.js';

// Vertical Slice Architecture (VSA) Lazy-Loaded Slices
const IndexPage = lazy(() =>
	import('@/slices/home/home/index.js').then((m) => ({ default: m.IndexPage })),
);
const DashboardPage = lazy(() =>
	import('@/slices/dashboard/dashboard/index.js').then((m) => ({ default: m.DashboardPage })),
);
const AirdropPage = lazy(() =>
	import('@/slices/airdrop/airdrop/index.js').then((m) => ({ default: m.AirdropPage })),
);

// Group Management Vertical Slice
const ManagedBotsPage = lazy(() =>
	import('@/slices/group-management/managed-bots/index.js').then((m) => ({
		default: m.ManagedBotsPage,
	})),
);
const BotManagePage = lazy(() =>
	import('@/slices/group-management/bot-manage/index.js').then((m) => ({
		default: m.BotManagePage,
	})),
);
const GroupDashboardPage = lazy(() =>
	import('@/slices/group-management/dashboard/index.js').then((m) => ({
		default: m.GroupDashboardPage,
	})),
);
const GeneralSettingsPage = lazy(() =>
	import('@/slices/group-management/general-settings/index.js').then((m) => ({
		default: m.GeneralSettingsPage,
	})),
);
const ContentRestrictionsPage = lazy(() =>
	import('@/slices/group-management/content-restrictions/index.js').then((m) => ({
		default: m.ContentRestrictionsPage,
	})),
);
const LimitsPage = lazy(() =>
	import('@/slices/group-management/limits/index.js').then((m) => ({ default: m.LimitsPage })),
);
const QuietHoursPage = lazy(() =>
	import('@/slices/group-management/quiet-hours/index.js').then((m) => ({
		default: m.QuietHoursPage,
	})),
);
const MandatoryPage = lazy(() =>
	import('@/slices/group-management/mandatory/index.js').then((m) => ({
		default: m.MandatoryPage,
	})),
);
const CustomTextsPage = lazy(() =>
	import('@/slices/group-management/custom-texts/index.js').then((m) => ({
		default: m.CustomTextsPage,
	})),
);
const AnalyticsPage = lazy(() =>
	import('@/slices/group-management/analytics/index.js').then((m) => ({
		default: m.AnalyticsPage,
	})),
);
const GroupDynamicBioPage = lazy(() =>
	import('@/slices/group-management/dynamic-bio/index.js').then((m) => ({
		default: m.GroupDynamicBioPage,
	})),
);
const CommandsAndInlinePage = lazy(() =>
	import('@/slices/group-management/commands/index.js').then((m) => ({
		default: m.CommandsAndInlinePage,
	})),
);

// Profile Vertical Slice
const ProfilePage = lazy(() =>
	import('@/slices/profile/profile/index.js').then((m) => ({ default: m.ProfilePage })),
);
const SettingsPage = lazy(() =>
	import('@/slices/profile/settings/index.js').then((m) => ({ default: m.SettingsPage })),
);
const SecurityPage = lazy(() =>
	import('@/slices/profile/security/index.js').then((m) => ({ default: m.SecurityPage })),
);

// Owner Admin Vertical Slice
const OwnerDashboardPage = lazy(() =>
	import('@/slices/owner/dashboard/index.js').then((m) => ({ default: m.OwnerDashboardPage })),
);
const OwnerEntitiesPage = lazy(() =>
	import('@/slices/owner/entities/index.js').then((m) => ({ default: m.OwnerEntitiesPage })),
);
const OwnerUsersPage = lazy(() =>
	import('@/slices/owner/users/index.js').then((m) => ({ default: m.OwnerUsersPage })),
);
const OwnerAuditLogPage = lazy(() =>
	import('@/slices/owner/audit-log/index.js').then((m) => ({ default: m.OwnerAuditLogPage })),
);
const OwnerSettingsPage = lazy(() =>
	import('@/slices/owner/settings/index.js').then((m) => ({ default: m.OwnerSettingsPage })),
);
const OwnerBroadcastPage = lazy(() =>
	import('@/slices/owner/broadcast/index.js').then((m) => ({ default: m.OwnerBroadcastPage })),
);
const OwnerFinancePage = lazy(() =>
	import('@/slices/owner/finance/index.js').then((m) => ({ default: m.OwnerFinancePage })),
);
const OwnerHealthPage = lazy(() =>
	import('@/slices/owner/health/index.js').then((m) => ({ default: m.OwnerHealthPage })),
);

interface Route {
	path: string;
	Component: Component;
	title?: string;
}

const withOwnerGuard = (PageComponent: Component, activeTab: any, title?: string): Component => {
	return () => (
		<OwnerRouteGuard>
			<OwnerLayout activeTab={activeTab} title={title}>
				<PageComponent />
			</OwnerLayout>
		</OwnerRouteGuard>
	);
};

export const routes: Route[] = [
	{ path: '/', Component: IndexPage },
	{ path: '/dashboard', Component: DashboardPage },
	{ path: '/airdrop', Component: AirdropPage },

	// Profile Slice
	{ path: '/profile', Component: ProfilePage },
	{ path: '/profile/settings', Component: SettingsPage },
	{ path: '/profile/security', Component: SecurityPage },

	// Group Management Slice (1 Bot = 1 Dedicated Group)
	{ path: '/managed-bots', Component: ManagedBotsPage },
	{ path: '/bot/:botId/manage', Component: BotManagePage },
	{ path: '/group/:id', Component: GroupDashboardPage },
	{ path: '/group/:id/commands', Component: CommandsAndInlinePage },
	{ path: '/group/:id/settings', Component: GeneralSettingsPage },
	{ path: '/group/:id/content', Component: ContentRestrictionsPage },
	{ path: '/group/:id/limits', Component: LimitsPage },
	{ path: '/group/:id/quiet', Component: QuietHoursPage },
	{ path: '/group/:id/mandatory', Component: MandatoryPage },
	{ path: '/group/:id/settings/custom-texts', Component: CustomTextsPage },
	{ path: '/group/:id/analytics', Component: AnalyticsPage },
	{ path: '/group/:id/dynamic-bio', Component: GroupDynamicBioPage },

	// Owner Slice (MiniGuard Group Management Platform Admin)
	{
		path: '/owner/dashboard',
		Component: withOwnerGuard(OwnerDashboardPage, 'dashboard', 'داشبورد مدیریتی'),
	},
	{
		path: '/owner/entities',
		Component: withOwnerGuard(OwnerEntitiesPage, 'entities', 'مدیریت گروه‌ها و بات‌ها'),
	},
	{ path: '/owner/users', Component: withOwnerGuard(OwnerUsersPage, 'users', 'مدیران گروه') },
	{
		path: '/owner/audit-logs',
		Component: withOwnerGuard(OwnerAuditLogPage, 'audit-logs', 'لاگ‌های سیستم'),
	},
	{
		path: '/owner/settings',
		Component: withOwnerGuard(OwnerSettingsPage, 'settings', 'تنظیمات پلتفرم'),
	},
	{
		path: '/owner/broadcast',
		Component: withOwnerGuard(OwnerBroadcastPage, 'broadcast', 'ارسال همگانی'),
	},
	{
		path: '/owner/finance',
		Component: withOwnerGuard(OwnerFinancePage, 'finance', 'اشتراک استارز'),
	},
	{ path: '/owner/health', Component: withOwnerGuard(OwnerHealthPage, 'health', 'سلامت سرور') },
];
