import { DEMO_BOT_ID, DEMO_GROUP_ID } from '@/shared/lib/demo-mode.js';

const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const hoursAhead = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

const createState = () => ({
	bot: {
		id: DEMO_BOT_ID,
		owner_user_id: 0,
		bot_username: 'miniguard_demo_bot',
		bot_name: 'MiniGuard Demo Bot',
		bot_id: 8000000001,
		group_id: DEMO_GROUP_ID,
		group_title: 'MiniGuard Demo Supergroup',
		group_link: 'https://t.me/miniguard_demo_group',
		status: 'active' as const,
		managed_groups_count: 1,
		subscription_status: 'trial' as const,
		trial_ends_at: hoursAhead(24),
		created_at: daysAgo(1),
		updated_at: now(),
	},

	group: {
		id: DEMO_GROUP_ID,
		bot_id: DEMO_BOT_ID,
		bot_username: 'miniguard_demo_bot',
		chat_id: -1002000000001,
		chat_title: 'MiniGuard Demo Supergroup',
		group_link: 'https://t.me/miniguard_demo_group',
		chat_type: 'supergroup' as const,
		members_count: 4820,
		subscription_status: 'trial' as const,
		subscription_stars_price: 100,
		trial_ends_at: hoursAhead(24),
		created_at: daysAgo(1),
		updated_at: now(),
	},

	groupSettings: {
		group_id: DEMO_GROUP_ID,
		general: {
			language: 'fa',
			timezone: 'Asia/Tehran',
			link_protection: true,
			welcome_message: true,
			delete_joins: true,
			delete_leaves: true,
			nightMode: false,
		},
		content_restrictions: {
			links: 'delete',
			forward: 'warn',
			photos: 'allow',
			videos: 'allow',
			stickers: 'allow',
			voice: 'allow',
			files: 'warn',
			mentions: 'allow',
			profanity: 'delete',
		},
		limits: {
			minMessageLength: 0,
			maxMessageLength: 2000,
			floodMessages: 5,
			floodWindow: 10,
			duplicateCount: 3,
			duplicateWindow: 60,
			maxWarnings: 3,
		},
		quiet_hours: {
			enabled: true,
			emergencyLock: false,
			adminOverride: true,
			sendNotifications: true,
			periods: [{ id: 'demo-period-1', start: '00:30', end: '07:00' }],
		},
		mandatory_membership: {
			forceJoinEnabled: true,
			channels: [{ id: 'demo-fj-1', username: '@MiniGuardBot', title: 'MiniGuard Official' }],
		},
		custom_texts: {
			welcome: 'سلام {name} عزیز 👋 به گروه خوش آمدید!',
			warn: '⚠️ {name} اخطار {count} از {max}',
			ban: '🚫 {name} از گروه اخراج شد.',
			muted: '🔇 {name} تا {time} بی‌صدا شد.',
		},
		dynamic_bio: {
			enabled: true,
			bioTemplate: '🛡️ محافظت‌شده با @MiniGuardBot | اعضا: $members | 🕒 $time',
			displayInName: false,
			nameTemplate: '',
			interval: '10m',
		},
		version: 1,
		updated_at: now(),
	},

	groupAudit: [
		{
			id: 'g-log-1',
			group_id: DEMO_GROUP_ID,
			actor_id: 0,
			actor_name: 'MiniGuard Firewall',
			action: 'حذف پیام حاوی لینک تبلیغاتی',
			created_at: daysAgo(0),
		},
		{
			id: 'g-log-2',
			group_id: DEMO_GROUP_ID,
			actor_id: 55501,
			actor_name: 'Group Admin',
			action: 'اخطار برای @spam_user',
			created_at: daysAgo(1),
		},
		{
			id: 'g-log-3',
			group_id: DEMO_GROUP_ID,
			actor_id: 0,
			actor_name: 'MiniGuard Firewall',
			action: 'مسدودسازی فلود (۷ پیام در ۱۰ ثانیه)',
			created_at: daysAgo(2),
		},
	],
});

let state = createState();
export const getDemoState = () => state;
export const resetDemoState = () => {
	state = createState();
};

const groupAnalytics = () => {
	const days = Array.from({ length: 7 }, (_, i) => ({
		date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
		members_count: 4700 + i * 20,
		messages_count: 900 + i * 55,
		active_users: 300 + i * 9,
	}));
	return {
		summary: {
			total_members: state.group.members_count,
			members_change: 120,
			total_messages: 7420,
			messages_change_pct: 14.2,
			spam_blocked: 318,
			new_members: 164,
			members_left: 44,
			active_users: 362,
			deleted_messages: 210,
			warnings_issued: 27,
			bans_issued: 3,
			top_users: [
				{ user_id: 1, name: 'Demo User A', msgs: 412 },
				{ user_id: 2, name: 'Demo User B', msgs: 305 },
				{ user_id: 3, name: 'Demo User C', msgs: 288 },
			],
		},
		growth: days.map((d) => ({
			date: d.date,
			members_count: d.members_count,
			value: d.members_count,
		})),
		activity: days.map((d) => ({
			date: d.date,
			messages_count: d.messages_count,
			active_users: d.active_users,
			value: d.messages_count,
		})),
	};
};

const lockedError = async (config: any, fallback: string) => {
	const err: any = new Error('DEMO_LOCKED');
	err.isDemoLocked = true;
	err.config = config;
	err.response = {
		status: 423,
		statusText: 'Locked (demo)',
		headers: {},
		config,
		data: { error: fallback, demo_locked: true },
	};
	return err;
};

const mergeCategory = (target: any, body: any) => {
	const category = body?.category;
	if (category && target[category]) {
		target[category] = { ...target[category], ...(body.data || {}) };
	} else if (body?.data && typeof body.data === 'object') {
		Object.assign(target, body.data);
	}
	target.version = (target.version || 1) + 1;
	target.updated_at = now();
	return { ...target };
};

export interface DemoResult {
	data?: any;
	error?: any;
}

export const resolveDemoRoute = async (
	method: string,
	rawPath: string,
	body: any,
	config: any,
): Promise<DemoResult> => {
	const p = rawPath.split('?')[0];
	const m = method.toUpperCase();
	const s = state;

	if (/\/bots\/[^/]+\/groups$/.test(p)) return { data: [s.group] };
	if (/\/bots\/[^/]+$/.test(p) && m === 'GET') return { data: s.bot };
	if (/\/bots\/[^/]+$/.test(p) && m === 'DELETE')
		return { error: await lockedError(config, 'در حالت دمو امکان‌پذیر نیست.') };

	if (p.includes(`/groups/${DEMO_GROUP_ID}`)) {
		if (p.endsWith('/settings')) {
			if (m === 'PUT') return { data: mergeCategory(s.groupSettings, body) };
			return { data: { ...s.groupSettings } };
		}
		if (p.endsWith('/analytics')) return { data: groupAnalytics() };
		if (p.endsWith('/audit')) return { data: s.groupAudit };
		if (m === 'DELETE') return { error: await lockedError(config, 'در حالت دمو امکان‌پذیر نیست.') };
		return { data: s.group };
	}

	return { data: { success: true, demo: true } };
};
