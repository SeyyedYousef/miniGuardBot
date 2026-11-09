import { apiClient } from './axios.js';

/* ==========================================================================
   Type Definitions for MiniGuard Owner Domain Entities
   ========================================================================== */

export interface SearchedUser {
	telegram_id: number;
	username: string;
	first_name: string;
	last_name: string;
	language_code: string;
	created_at: string;
	managed_groups_count?: number;
	is_premium: boolean;
	is_flagged: boolean;
	fraud_reason: string;
	is_banned?: boolean;
	ban_type?: string;
	ban_reason?: string;
	ban_expires_at?: string;
}

export interface AuditLogEntry {
	id: string | number;
	owner_id: number;
	target_type?: string;
	target_id?: string | number;
	action: string;
	ip_address?: string;
	user_agent?: string;
	payload?: Record<string, any>;
	created_at: string;
}

export interface SystemSettings {
	maintenance_mode: boolean;
	trial_hours?: number;
	monthly_stars_price?: number;
	max_bots_per_admin?: number;
	master_start_text?: string;
	child_start_text?: string;
	onboarding_msg_1?: string;
	onboarding_msg_2?: string;
	onboarding_msg_3?: string;
	onboarding_msg_4?: string;
}

export interface BroadcastMessage {
	id: string | number;
	target_audience: 'all' | 'premium' | 'active_7d' | 'inactive';
	message_text: string;
	status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
	scheduled_at?: string;
	sent_count: number;
	total_count: number;
	created_at: string;
}

export interface FinanceOrder {
	id: string;
	user_id: number;
	username?: string;
	amount_stars: number;
	status: 'paid' | 'pending' | 'failed' | 'refunded';
	item_type: string;
	created_at: string;
}

export interface SystemHealthMetrics {
	db_status: 'ok' | 'degraded' | 'down';
	db_latency_ms: number;
	redis_status: 'ok' | 'down';
	active_goroutines: number;
	memory_used_mb: number;
	uptime_seconds: number;
	recent_errors_count: number;
}

export interface OwnerEntityItem {
	id: string | number;
	type: 'group';
	title: string;
	username?: string;
	bot_username?: string;
	members_count?: number;
	telegram_id: number;
	owner_id: number;
	owner_username?: string;
	credit_balance: number;
	remaining_hours?: number;
	remaining_label?: string;
	subscription_status?: 'trial' | 'paid' | 'active' | 'expired';
	expires_at?: string;
	status: 'active' | 'suspended' | 'expired';
	created_at: string;
}

/* ==========================================================================
   Unified Typed Owner API Client (MiniGuard Group Platform)
   ========================================================================== */

export const ownerApi = {
	// --- Group Admins ---
	searchUsers: (query: string, config?: any) =>
		apiClient
			.get<SearchedUser[]>(`/owner/users/search?q=${encodeURIComponent(query)}`, config)
			.then((r) => r.data),

	banUser: (userId: number, banType: string, reason: string, durationSeconds: number) =>
		apiClient
			.post<{ success: boolean }>('/owner/users/ban', {
				user_id: userId,
				ban_type: banType,
				reason,
				duration_seconds: durationSeconds,
			})
			.then((r) => r.data),

	unbanUser: (userId: number) =>
		apiClient
			.post<{ success: boolean }>('/owner/users/unban', { user_id: userId })
			.then((r) => r.data),

	flagUser: (userId: number, isFlagged: boolean, fraudReason: string) =>
		apiClient
			.post<{ success: boolean }>('/owner/users/flag', {
				user_id: userId,
				is_flagged: isFlagged,
				fraud_reason: fraudReason,
			})
			.then((r) => r.data),

	impersonateUser: (userId: number) =>
		apiClient
			.post<{ token: string }>('/owner/users/impersonate', { user_id: userId })
			.then((r) => r.data),

	// --- Audit Logs ---
	getAuditLogs: (limit = 20, offset = 0) =>
		apiClient
			.get<{ logs: AuditLogEntry[]; has_more: boolean }>(
				`/owner/audit-logs?limit=${limit}&offset=${offset}`,
			)
			.then((r) => r.data),

	// --- Platform Settings ---
	getSettings: () => apiClient.get<SystemSettings>('/owner/settings').then((r) => r.data),
	updateSettings: async (settingsPayload: Partial<SystemSettings>) => {
		let existing: SystemSettings | null = null;
		try {
			const res = await apiClient.get<SystemSettings>('/owner/settings');
			existing = res.data;
		} catch (_e) {}

		const mergedPayload: SystemSettings = {
			maintenance_mode: settingsPayload.maintenance_mode ?? existing?.maintenance_mode ?? false,
			trial_hours: settingsPayload.trial_hours ?? existing?.trial_hours ?? 24,
			monthly_stars_price:
				settingsPayload.monthly_stars_price ?? existing?.monthly_stars_price ?? 100,
			max_bots_per_admin: settingsPayload.max_bots_per_admin ?? existing?.max_bots_per_admin ?? 20,
			master_start_text: settingsPayload.master_start_text ?? existing?.master_start_text ?? '',
			child_start_text: settingsPayload.child_start_text ?? existing?.child_start_text ?? '',
			onboarding_msg_1: settingsPayload.onboarding_msg_1 ?? existing?.onboarding_msg_1 ?? '',
			onboarding_msg_2: settingsPayload.onboarding_msg_2 ?? existing?.onboarding_msg_2 ?? '',
			onboarding_msg_3: settingsPayload.onboarding_msg_3 ?? existing?.onboarding_msg_3 ?? '',
			onboarding_msg_4: settingsPayload.onboarding_msg_4 ?? existing?.onboarding_msg_4 ?? '',
		};

		return (await apiClient.put<SystemSettings>('/owner/settings', mergedPayload)).data;
	},

	// --- Broadcast ---
	listBroadcasts: () =>
		apiClient
			.get<BroadcastMessage[]>('/owner/broadcasts')
			.then((r) => r.data)
			.catch(() => []),
	sendBroadcast: (audience: string, text: string, _scheduledAt?: string) =>
		apiClient
			.post<{ success: boolean; id: string | number }>('/owner/broadcasts', {
				target_audience: audience,
				message: text,
			})
			.then((r) => r.data),

	// --- Finance (Telegram Stars Subscriptions) ---
	getFinanceOrders: () =>
		apiClient.get<FinanceOrder[]>('/owner/finance/orders').then((r) => r.data),

	// --- Health ---
	getHealthMetrics: () =>
		apiClient.get<SystemHealthMetrics>('/owner/health/metrics').then((r) => r.data),
	getHealthLogs: () =>
		apiClient
			.get<any[]>('/owner/health/errors')
			.then((r) =>
				Array.isArray(r.data)
					? r.data.map((e) => `[${e.source || 'SYS'}] ${e.error_message || ''}`)
					: [],
			)
			.catch(() => []),

	// --- Managed Groups & Dedicated Bots ---
	listEntities: async (): Promise<OwnerEntityItem[]> => {
		const groupsRes = await apiClient
			.get<any[]>('/owner/entities/groups')
			.catch(() => ({ data: [] }));
		return (groupsRes.data || []).map((g: any) => ({ ...g, type: 'group' as const }));
	},
	addEntityCredit: (
		id: string | number,
		amountDays: number,
		reason = 'Owner manual extension',
		amountHours = 0,
	) =>
		apiClient
			.post<{
				success: boolean;
				status?: string;
				expires_at?: string;
				remaining_days?: number;
				remaining_hours?: number;
				remaining_label?: string;
			}>('/owner/entities/add-credit', {
				entity_id: String(id),
				days: amountDays,
				hours: amountHours,
				reason,
			})
			.then((r) => r.data),
	toggleEntityStatus: (id: string | number, isActive: boolean) =>
		apiClient
			.post<{ success: boolean; status: string }>('/owner/entities/toggle-status', {
				entity_id: String(id),
				is_active: isActive,
			})
			.then((r) => r.data),
};
