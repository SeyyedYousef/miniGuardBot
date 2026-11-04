export const mockApiLogic = (method: string = 'GET', url: string = '', _data: any = null) => {
	try {
		const path = url.split('?')[0];
		const methodUp = (method || 'GET').toUpperCase();
		const win = window as any;

		if (!win.__mockBots) {
			win.__mockBots = [
				{
					id: 'mock-bot-1',
					owner_user_id: 99281932,
					bot_username: 'devs_miniguard_bot',
					bot_name: 'Telegram Devs Guard',
					bot_id: 719283746,
					group_id: 'demo-group',
					group_link: 'https://t.me/TelegramDevelopers',
					group_title: 'Telegram Developers Community',
					status: 'active',
					managed_groups_count: 1,
					subscription_status: 'trial',
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			];
		}

		if (!win.__mockGroups) {
			win.__mockGroups = [
				{
					id: 'demo-group',
					bot_id: 'mock-bot-1',
					bot_username: 'devs_miniguard_bot',
					group_link: 'https://t.me/TelegramDevelopers',
					chat_id: -100192837465,
					telegram_chat_id: -100192837465,
					chat_title: 'Telegram Developers Community',
					chat_type: 'supergroup',
					members_count: 14820,
					photo_url: '',
					subscription_status: 'trial',
					trial_ends_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
					paid_until: '',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				{
					id: 'ton-builders-group',
					bot_id: 'mock-bot-2',
					bot_username: 'ton_builders_guard_bot',
					group_link: 'https://t.me/TONBuildersChat',
					chat_id: -100182736455,
					telegram_chat_id: -100182736455,
					chat_title: 'TON Mini Apps Builders',
					chat_type: 'supergroup',
					members_count: 6390,
					photo_url: '',
					subscription_status: 'paid',
					trial_ends_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
					paid_until: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			];
		}

		// /bots endpoints
		if (path.includes('/bots') && !path.includes('/groups')) {
			if (methodUp === 'GET') {
				if (path === '/bots') {
					return win.__mockBots;
				}
				const botId = path.split('/bots/')[1]?.split('/')[0];
				return (
					win.__mockBots.find((b: any) => b.id === botId) ||
					win.__mockBots[0] || {
						id: botId || 'mock-bot-1',
						owner_user_id: 99281932,
						bot_username: 'devs_miniguard_bot',
						bot_name: 'Telegram Devs Guard',
						bot_id: 719283746,
						group_id: 'demo-group',
						group_link: 'https://t.me/TelegramDevelopers',
						group_title: 'Telegram Developers Community',
						status: 'active',
						managed_groups_count: 1,
						subscription_status: 'trial',
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					}
				);
			}

			if (methodUp === 'POST') {
				const newBotId = `bot-${Date.now()}`;
				const newGroupId = `group-${Date.now()}`;
				const rawLink = (_data?.group_link || 'https://t.me/my_group').trim();
				const slug = rawLink
					.replace(/^https?:\/\/t\.me\//i, '')
					.replace(/^@/, '')
					.replace(/^\+/, '')
					.split('/')[0];

				const resolvedTitle =
					_data?.group_title?.trim() ||
					(slug ? `Group @${slug}` : `Group (${_data?.name || 'MiniGuard'})`);

				const newBot = {
					id: newBotId,
					owner_user_id: 99281932,
					bot_username:
						_data?.username || `miniguard_${Math.floor(1000 + Math.random() * 9000)}_bot`,
					bot_name: _data?.name || `MiniGuard • ${resolvedTitle}`,
					bot_id: _data?.bot_id || Math.floor(100000000 + Math.random() * 900000000),
					group_id: newGroupId,
					group_link: rawLink,
					group_title: resolvedTitle,
					status: 'active',
					managed_groups_count: 1,
					subscription_status: 'trial',
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
				win.__mockBots = [newBot, ...win.__mockBots];

				// 1 Bot = 1 Dedicated Group with 24-Hour Free Trial
				const autoGroup = {
					id: newGroupId,
					bot_id: newBotId,
					bot_username: newBot.bot_username,
					group_link: rawLink,
					chat_id: -100000000000 - Math.floor(Math.random() * 899999999),
					telegram_chat_id: -100000000000 - Math.floor(Math.random() * 899999999),
					chat_title: resolvedTitle,
					chat_type: 'supergroup',
					members_count: 1,
					subscription_status: 'trial',
					trial_ends_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
					paid_until: '',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
				win.__mockGroups = [autoGroup, ...win.__mockGroups];
				return newBot;
			}

			if (methodUp === 'DELETE') {
				const botId = path.split('/bots/')[1]?.split('/')[0];
				win.__mockBots = win.__mockBots.filter((b: any) => b.id !== botId);
				win.__mockGroups = win.__mockGroups.filter((g: any) => g.bot_id !== botId);
				return { status: 'revoked' };
			}
		}

		// /subscription/subscribe-stars-invoice or /subscription/subscribe
		if (path.includes('/subscription/')) {
			const groupId = _data?.group_id || 'demo-group';
			const paidUntil = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
			win.__mockGroups = (win.__mockGroups || []).map((g: any) =>
				g.id === groupId
					? {
							...g,
							subscription_status: 'paid',
							paid_until: paidUntil,
							updated_at: new Date().toISOString(),
						}
					: g,
			);
			return {
				success: true,
				status: 'paid',
				price_stars: 100,
				paid_until: paidUntil,
				invoice_link: '',
			};
		}

		// /groups endpoints
		if (path.includes('/groups') && !path.includes('/settings') && !path.includes('/analytics')) {
			if (methodUp === 'GET') {
				if (path.includes('/audit')) {
					return [
						{
							id: 'log-1',
							group_id: 'demo-group',
							actor_id: 0,
							actor_name: 'MiniGuard Core',
							action: '🛡️ Blocked spam link flood & notified group owner in @MiniGuardBot PM',
							created_at: new Date(Date.now() - 4 * 60000).toISOString(),
						},
						{
							id: 'log-2',
							group_id: 'demo-group',
							actor_id: 0,
							actor_name: 'MiniGuard Core',
							action: '⚡ Sent 4 onboarding & binary permission check messages to group',
							created_at: new Date(Date.now() - 18 * 60000).toISOString(),
						},
						{
							id: 'log-3',
							group_id: 'demo-group',
							actor_id: 0,
							actor_name: 'MiniGuard Billing',
							action: '🎁 Activated 24-Hour Free Trial (100 ⭐/month renewal reminder scheduled)',
							created_at: new Date(Date.now() - 35 * 60000).toISOString(),
						},
					];
				}
				if (path.includes('/bots/') && path.includes('/groups')) {
					const botId = path.split('/bots/')[1]?.split('/')[0];
					const filtered = win.__mockGroups.filter((g: any) => g.bot_id === botId);
					return filtered.length > 0 ? filtered : [win.__mockGroups[0]].filter(Boolean);
				}
				const groupId = path.split('/groups/')[1]?.split('/')[0];
				const found = win.__mockGroups.find((g: any) => g.id === groupId);
				if (found) return found;
				return {
					id: groupId || 'demo-group',
					bot_id: 'mock-bot-1',
					bot_username: 'devs_miniguard_bot',
					group_link: 'https://t.me/TelegramDevelopers',
					chat_id: -100192837465,
					telegram_chat_id: -100192837465,
					chat_title: 'Telegram Developers Community',
					chat_type: 'supergroup',
					members_count: 14820,
					subscription_status: 'trial',
					trial_ends_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
					paid_until: '',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
			}

			if (methodUp === 'DELETE') {
				const groupId = path.split('/groups/')[1]?.split('/')[0];
				win.__mockGroups = win.__mockGroups.filter((g: any) => g.id !== groupId);
				return { status: 'revoked' };
			}
		}

		// /groups/:id/settings
		if (path.includes('/settings') && !path.includes('/owner')) {
			const groupId = path.split('/groups/')[1]?.split('/')[0] || 'demo-group';
			if (!win.__mockGroupSettingsById) {
				win.__mockGroupSettingsById = {};
			}
			if (!win.__mockGroupSettingsById[groupId]) {
				win.__mockGroupSettingsById[groupId] = {
					group_id: groupId,
					general: {
						language: 'fa',
						timezone: 'Asia/Tehran',
						botEnabled: true,
						welcomeMessage: true,
						warningMessage: true,
						autoDeleteBot: true,
						autoDeleteDelay: 60,
						trackAdmin: true,
						verifyMembers: true,
						publicCommands: false,
						hideJoinLeave: true,
						defaultPenalty: 'delete',
						autoWarning: true,
						warningThreshold: 3,
						warningRetention: 7,
						warningFinalPenalty: 'mute_24h',
						casEnabled: true,
						antiRaidThreshold: 15,
						antiRaidAction: 'lockdown',
						ephemeralAll: false,
						ephemeralWelcome: true,
						ephemeralWarnings: true,
						ephemeralCaptcha: true,
						ephemeralAdminCmd: false,
						name: 'Telegram Developers Community',
						description: 'Official Supergroup • Protected by MiniGuard (@MiniGuardBot)',
					},
					content_restrictions: {
						removeLinks: {
							enabled: true,
							window: 'Always',
							start: '08:00',
							end: '22:00',
							penalty: 'delete',
						},
						blockBots: {
							enabled: true,
							window: 'Always',
							start: '08:00',
							end: '22:00',
							penalty: 'kick',
						},
						removeBotInviters: {
							enabled: true,
							window: 'Always',
							start: '08:00',
							end: '22:00',
							penalty: 'delete',
						},
						blockForwards: {
							enabled: true,
							window: 'Always',
							start: '08:00',
							end: '22:00',
							penalty: 'delete',
						},
						bannedKeywords: ['spam', 'pump', 'تبلیغ', 'ربات شرط بندی'],
						requiredKeywords: [],
					},
					limits: {
						minMessageLength: 2,
						maxMessageLength: 1500,
						floodMessages: 5,
						floodWindow: 5,
						duplicateCount: 2,
						duplicateWindow: 15,
					},
					quiet_hours: {
						emergencyLock: false,
						adminOverride: true,
						sendNotifications: true,
						periods: [{ id: 'qh-1', start: '00:00', end: '07:00' }],
					},
					mandatory_membership: {
						forced_add_enabled: false,
						forced_add_count: 3,
						force_join_enabled: true,
						required_channels: ['@Telegram', '@TONBlockchain'],
						verification_enabled: true,
						exemptions: ['@trusted_admin'],
					},
					custom_texts: {
						welcomeText: '👋 سلام {user} عزیز، به گروه {group} خوش آمدید!',
						warningText: '⚠️ {user} | اخطار {count}/{threshold} • علت: {reason}',
						silenceStartText: '🔒 ساعات خاموشی گروه فعال شد.',
						silenceEndText: '🔓 ساعات خاموشی به پایان رسید. گفتگو آزاد است.',
						rulesText: '📜 قوانین گروه:\n۱. احترام متقابل\n۲. عدم ارسال لینک و تبلیغات',
						forceJoinText: '📢 {user} عزیز، برای ارسال پیام ابتدا عضو کانال شوید:\n{channel_names}',
						forceAddText:
							'👥 {user} عزیز، برای چت باید {remainadd} نفر دیگر دعوت کنید ({added}/{number})',
						botStartText:
							'🛡️ سلام {user} عزیز!\nمن ربات اختصاصی مدیریت گروه «{group}» هستم.\n\n⚡ این ربات توسط @MiniGuardBot ساخته شده است! اگر می‌خواهید یک ربات مدیریت گروه با نام دلخواه و بیش از ۱۰۰ قابلیت پیشرفته داشته باشید، همین حالا آن را امتحان کنید.',
						inlineButtons: [
							{
								id: 'btn-1',
								title: '🚀 ساخت ربات با @MiniGuardBot',
								url: 'https://t.me/MiniGuardBot',
							},
						],
					},
					dynamic_bio: {
						enabled: true,
						bioTemplate: '👥 اعضا: $members | 🕒 بروزرسانی: $time ($date)',
						displayInName: false,
						nameTemplate: 'Telegram Devs ($time)',
						interval: '10m',
					},
					version: 1,
					updated_at: new Date().toISOString(),
				};
			}

			const currentSettings = win.__mockGroupSettingsById[groupId];

			if (methodUp === 'GET') {
				return currentSettings;
			}
			if (methodUp === 'PUT') {
				const section = _data?.category || _data?.section;
				const data = _data?.data;
				if (section && data) {
					currentSettings[section] = data;
				}
				currentSettings.version += 1;
				currentSettings.updated_at = new Date().toISOString();
				return {
					group_id: groupId,
					version: currentSettings.version,
					updated_at: currentSettings.updated_at,
				};
			}
		}

		// /groups/:id/analytics
		if (path.includes('/analytics')) {
			const growthData = [
				{ date: '2026-10-27', value: 14120, members_count: 14120 },
				{ date: '2026-10-28', value: 14250, members_count: 14250 },
				{ date: '2026-10-29', value: 14390, members_count: 14390 },
				{ date: '2026-10-30', value: 14510, members_count: 14510 },
				{ date: '2026-10-31', value: 14630, members_count: 14630 },
				{ date: '2026-11-01', value: 14740, members_count: 14740 },
				{ date: '2026-11-02', value: 14820, members_count: 14820 },
			];
			const activityData = [
				{ date: '2026-10-27', value: 2140, messages_count: 2140, active_users: 510 },
				{ date: '2026-10-28', value: 2490, messages_count: 2490, active_users: 545 },
				{ date: '2026-10-29', value: 2310, messages_count: 2310, active_users: 530 },
				{ date: '2026-10-30', value: 2890, messages_count: 2890, active_users: 610 },
				{ date: '2026-10-31', value: 3120, messages_count: 3120, active_users: 670 },
				{ date: '2026-11-01', value: 2980, messages_count: 2980, active_users: 640 },
				{ date: '2026-11-02', value: 3490, messages_count: 3490, active_users: 720 },
			];
			return {
				summary: {
					total_messages: 19420,
					active_users: 720,
					new_members: 700,
					removed_members: 24,
					deleted_messages: 418,
					warnings_issued: 52,
					bans_issued: 11,
					spam_blocked: 1240,
					total_members: 14820,
					members_change: 700,
					messages_change_pct: 22.4,
					members_left: 24,
				},
				growth: growthData,
				activity: activityData,
			};
		}

		// /subscription/packages
		if (path.includes('/packages')) {
			return [
				{
					id: '1_month',
					name: '1 Month Pro (100 Stars)',
					duration_months: 1,
					price_usd: 1.99,
					price_per_month: 1.99,
					price_stars: 100,
					price_coins: 0,
					price_frg: 1.99,
					badge: 'popular',
				},
			];
		}

		if (path.includes('/auth/token')) {
			return { token: 'mock-jwt-token-miniguard' };
		}

		if (path.includes('/profile/stats')) {
			return {
				usernamesAnalyzed: 0,
				groupsManaged: win.__mockGroups.length || 2,
				channelsManaged: 0,
				daysActive: 42,
				currentStreak: 7,
				globalRank: 1,
				totalTaps: 0,
				totalFrgEarned: 0,
				totalFrgSpent: 0,
				frgBalance: 0,
				memberSince: '2026-04-15T00:00:00Z',
				level: 1,
				xp: 100,
				xpToNextLevel: 1000,
				isPremium: true,
			};
		}

		if (path.includes('/profile/public-config')) {
			return { dashboard_ads: [] };
		}

		if (path.includes('/profile/language')) {
			return { status: 'ok' };
		}

		// Owner Panel Endpoints
		if (path.includes('/owner/dashboard/stats')) {
			return {
				dau: 1840,
				mau: 14200,
				total_users: 28500,
				frg_circulation: 0,
				stars_volume: 42800,
				recent_activity: [
					{
						id: 'act-1',
						owner_id: 99281932,
						action: 'BOT_REGISTERED',
						ip_address: '127.0.0.1',
						created_at: new Date().toISOString(),
					},
				],
				dau_chart: [
					{ date: '10/28', value: 1420 },
					{ date: '10/29', value: 1580 },
					{ date: '10/30', value: 1690 },
					{ date: '11/01', value: 1750 },
					{ date: '11/02', value: 1840 },
				],
				coin_flow_chart: [
					{ date: '10/28', value: 6500 },
					{ date: '10/30', value: 8200 },
					{ date: '11/02', value: 9400 },
				],
			};
		}

		if (path.includes('/owner/entities')) {
			return (win.__mockGroups || []).map((g: any) => ({
				id: g.id,
				type: 'group',
				title: g.chat_title,
				telegram_id: g.chat_id || -100192837465,
				username: g.group_link || 'tg_group',
				owner_id: 99281932,
				owner_username: 'rogue',
				status: 'active',
				credit_balance: 30,
			}));
		}

		return { status: 'ok' };
	} catch (error) {
		console.error('[Mock API Error]:', error);
		throw error;
	}
};
