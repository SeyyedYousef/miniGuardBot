export const mockApiLogic = (method: string = 'GET', url: string = '', _data: any = null) => {
	try {
		const path = url.split('?')[0];
		const methodUp = (method || 'GET').toUpperCase();
		const win = window as any;

		if (!win.__mockBots) {
			let storedBots: any[] | null = null;
			try {
				const raw = localStorage.getItem('mg_persisted_bots');
				if (raw) {
					const parsed = JSON.parse(raw);
					if (Array.isArray(parsed)) {
						storedBots = parsed.filter(
							(b) =>
								b &&
								b.id !== 'mock-bot-1' &&
								b.id !== 'mock-bot-2' &&
								b.id !== 'b1' &&
								b.bot_username?.toLowerCase() !== 'miniguardbot' &&
								b.bot_username !== 'devs_miniguard_bot',
						);
					}
				}
			} catch {}
			win.__mockBots = storedBots || [];
		}

		if (!win.__mockGroups) {
			let storedGroups: any[] | null = null;
			try {
				const raw = localStorage.getItem('mg_persisted_groups');
				if (raw) {
					const parsed = JSON.parse(raw);
					if (Array.isArray(parsed)) {
						storedGroups = parsed.filter(
							(g) => g && g.id !== 'demo-group' && g.id !== 'ton-builders-group' && g.id !== 'g1',
						);
					}
				}
			} catch {}
			win.__mockGroups = storedGroups || [];
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
				try {
					localStorage.setItem('mg_persisted_bots', JSON.stringify(win.__mockBots));
					localStorage.setItem('mg_persisted_groups', JSON.stringify(win.__mockGroups));
				} catch {}
				return newBot;
			}

			if (methodUp === 'PUT') {
				const botId = path.split('/bots/')[1]?.split('/')[0];
				win.__mockBots = win.__mockBots.map((b: any) =>
					b.id === botId
						? {
								...b,
								group_link: _data?.group_link || b.group_link,
								group_title: _data?.group_title || b.group_title,
								updated_at: new Date().toISOString(),
							}
						: b,
				);
				win.__mockGroups = win.__mockGroups.map((g: any) =>
					g.bot_id === botId
						? {
								...g,
								group_link: _data?.group_link || g.group_link,
								chat_title: _data?.group_title || g.chat_title,
								updated_at: new Date().toISOString(),
							}
						: g,
				);
				try {
					localStorage.setItem('mg_persisted_bots', JSON.stringify(win.__mockBots));
					localStorage.setItem('mg_persisted_groups', JSON.stringify(win.__mockGroups));
				} catch {}
				return win.__mockBots.find((b: any) => b.id === botId) || {};
			}

			if (methodUp === 'DELETE') {
				const botId = path.split('/bots/')[1]?.split('/')[0];
				win.__mockBots = win.__mockBots.filter((b: any) => b.id !== botId);
				win.__mockGroups = win.__mockGroups.filter((g: any) => g.bot_id !== botId);
				try {
					localStorage.setItem('mg_persisted_bots', JSON.stringify(win.__mockBots));
					localStorage.setItem('mg_persisted_groups', JSON.stringify(win.__mockGroups));
				} catch {}
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
					return win.__mockGroups.filter((g: any) => g.bot_id === botId);
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

			if (methodUp === 'PUT') {
				const groupId = path.split('/groups/')[1]?.split('/')[0];
				win.__mockGroups = win.__mockGroups.map((g: any) =>
					g.id === groupId
						? {
								...g,
								group_link: _data?.group_link || g.group_link,
								chat_title: _data?.chat_title || _data?.group_title || g.chat_title,
								updated_at: new Date().toISOString(),
							}
						: g,
				);
				try {
					localStorage.setItem('mg_persisted_groups', JSON.stringify(win.__mockGroups));
				} catch {}
				return win.__mockGroups.find((g: any) => g.id === groupId) || {};
			}

			if (methodUp === 'DELETE') {
				const groupId = path.split('/groups/')[1]?.split('/')[0];
				const target = win.__mockGroups.find((g: any) => g.id === groupId);
				win.__mockGroups = win.__mockGroups.filter((g: any) => g.id !== groupId);
				if (target?.bot_id) {
					win.__mockBots = win.__mockBots.filter((b: any) => b.id !== target.bot_id);
				}
				try {
					localStorage.setItem('mg_persisted_bots', JSON.stringify(win.__mockBots));
					localStorage.setItem('mg_persisted_groups', JSON.stringify(win.__mockGroups));
				} catch {}
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
					add_counter: {
						enabled: true,
						sendProgressMessage: true,
						sendCompletionMessage: true,
						requireTargetToChat: true,
						requiredCount: 5,
						preventDuplicateReadd: true,
						ignoreBots: true,
						countAdmins: true,
						countInviteLinks: false,
						autoDeleteSec: 45,
						resetPeriodDays: 0,
						leaderboardEnabled: true,
						exemptions: ['@admin'],
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

		// /groups/:id/add-counter
		if (path.includes('/groups/') && path.includes('/add-counter/reset') && methodUp === 'POST') {
			return {
				ok: true,
				total_group_adds: 0,
				leaderboard: [],
			};
		}
		if (path.includes('/groups/') && path.includes('/add-counter/adjust') && methodUp === 'POST') {
			const uid = Number(_data?.userId || 1001);
			const nextCount =
				_data?.count !== undefined
					? Number(_data.count)
					: Math.max(0, 4 + Number(_data?.delta || 0));
			return {
				ok: true,
				user: {
					userId: uid,
					name: _data?.name || 'علی‌رضا محمدی',
					username: _data?.username || 'alireza_m',
					count: nextCount,
					lifetimeCount: nextCount,
				},
				leaderboard: [
					{
						rank: 1,
						userId: uid,
						name: _data?.name || 'علی‌رضا محمدی',
						username: _data?.username || 'alireza_m',
						count: nextCount,
						lifetimeCount: nextCount,
						lastAddedAt: new Date().toISOString(),
						targetCompleted: nextCount >= 5,
					},
				],
			};
		}
		if (path.includes('/groups/') && path.endsWith('/add-counter')) {
			return {
				group_id: path.split('/groups/')[1]?.split('/')[0] || 'demo-group',
				settings: {
					enabled: true,
					sendProgressMessage: true,
					sendCompletionMessage: true,
					requireTargetToChat: true,
					requiredCount: 5,
					preventDuplicateReadd: true,
					ignoreBots: true,
					countAdmins: true,
					countInviteLinks: false,
					autoDeleteSec: 45,
					resetPeriodDays: 0,
					leaderboardEnabled: true,
					exemptions: ['@admin'],
				},
				total_group_adds: 29,
				tracked_users_count: 4,
				completed_users_count: 2,
				period_started_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
				leaderboard: [
					{
						rank: 1,
						userId: 1001,
						name: 'علی‌رضا محمدی',
						username: 'alireza_m',
						count: 11,
						lifetimeCount: 14,
						lastAddedAt: new Date(Date.now() - 1800_000).toISOString(),
						targetCompleted: true,
					},
					{
						rank: 2,
						userId: 1002,
						name: 'سارا حسینی',
						username: 'sara_h',
						count: 7,
						lifetimeCount: 7,
						lastAddedAt: new Date(Date.now() - 7200_000).toISOString(),
						targetCompleted: true,
					},
					{
						rank: 3,
						userId: 1003,
						name: 'امیرحسین رضایی',
						username: 'amir_rz',
						count: 4,
						lifetimeCount: 4,
						lastAddedAt: new Date(Date.now() - 14400_000).toISOString(),
						targetCompleted: false,
					},
					{
						rank: 4,
						userId: 1004,
						name: 'نگار کریمی',
						count: 2,
						lifetimeCount: 4,
						lastAddedAt: new Date(Date.now() - 36000_000).toISOString(),
						targetCompleted: false,
					},
				],
			};
		}

		// /groups/:id/profile
		if (path.includes('/groups/') && path.includes('/profile')) {
			const groupId = path.split('/groups/')[1]?.split('/')[0] || 'demo-group';
			const found = win.__mockGroups.find((g: any) => g.id === groupId);
			if (methodUp === 'PUT' || methodUp === 'POST') {
				if (found && _data?.current_title) {
					found.chat_title = _data.current_title;
					found.title = _data.current_title;
				}
				return {
					ok: true,
					group_id: groupId,
					current_title: _data?.current_title || found?.chat_title || 'گروه تلگرام',
					current_description: _data?.current_description || '',
					members_count: found?.members_count || 1,
					dynamic_bio: _data?.dynamic_bio || {
						enabled: false,
						title_template: _data?.current_title || found?.chat_title || '',
						bio_template: _data?.current_description || '',
					},
				};
			}
			return {
				group_id: groupId,
				current_title: found?.chat_title || 'گروه تلگرام',
				current_description: '',
				members_count: found?.members_count || 1,
				dynamic_bio: {
					enabled: false,
					title_template: found?.chat_title || '',
					bio_template: '',
				},
			};
		}

		// /groups/:id/analytics
		if (path.includes('/analytics')) {
			const groupId = path.split('/groups/')[1]?.split('/')[0] || 'demo-group';
			const found = win.__mockGroups.find((g: any) => g.id === groupId);
			const membersCount = found?.members_count || 1;
			const today = new Date();
			const dailyStats = Array.from({ length: 7 }, (_, idx) => {
				const d = new Date(today.getTime() - (6 - idx) * 86400 * 1000);
				return {
					date: d.toISOString().slice(0, 10),
					total_messages: 0,
					active_users: 0,
					new_members: 0,
					left_members: 0,
					spam_blocked: 0,
					warnings_issued: 0,
					muted_users: 0,
					banned_users: 0,
				};
			});
			return {
				group_id: groupId,
				group_title: found?.chat_title || 'گروه تلگرام',
				summary: {
					total_messages: 0,
					active_users: 0,
					new_members: 0,
					removed_members: 0,
					deleted_messages: 0,
					warnings_issued: 0,
					bans_issued: 0,
					spam_blocked: 0,
					total_members: membersCount,
					members_change: 0,
					messages_change_pct: 0,
					members_left: 0,
				},
				growth: dailyStats.map((d) => ({ date: d.date, value: membersCount })),
				activity: dailyStats.map((d) => ({ date: d.date, value: 0 })),
				hourly_messages: Array.from({ length: 24 }, () => 0),
				daily_stats: dailyStats,
				top_violated_rules: [],
				top_users: [],
				forum_topics: [],
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
