/**
 * MiniGuard (@MiniGuardBot) — Pure Binary & Protocol Firewall Engine (Bot API 8.x)
 *
 * Implements decoupled, unit-testable pure functions for:
 * 1. Binary UTF-8 Zero-Width & Bidi RTL/LTR Override detection (\u200B-\u200F, \u202A-\u202E, \u2060-\u206F, \uFEFF)
 * 2. Unicode Homograph & Mixed-Script Admin Impersonation detection (Cyrillic/Greek/Latin confusables)
 * 3. Forum Supergroup Topic (`message_thread_id`) exemption & topic creation lock
 * 4. Bot API 7.x/8.x Entity inspection (`external_reply`, `story`, `custom_emoji`, `spoiler`)
 * 5. Native `UpdateChatJoinRequest` + WebApp Biometric verification evaluation
 */

export interface BinaryMessageEntity {
	type:
		| 'url'
		| 'text_link'
		| 'mention'
		| 'hashtag'
		| 'cashtag'
		| 'bot_command'
		| 'custom_emoji'
		| 'spoiler'
		| 'phone_number';
	offset: number;
	length: number;
	url?: string;
	custom_emoji_id?: string;
}

export interface IncomingGroupMessage {
	message_id: number;
	user_id: number;
	user_display_name: string;
	is_admin?: boolean;
	text?: string;
	caption?: string;
	message_thread_id?: number;
	is_topic_message?: boolean;
	forum_topic_created?: boolean;
	forum_topic_edited?: boolean;
	external_reply?: {
		origin_chat_id?: number;
		origin_type?: string;
	} | null;
	story?: {
		id: number;
		chat_id: number;
	} | null;
	has_media_spoiler?: boolean;
	entities?: BinaryMessageEntity[];
	caption_entities?: BinaryMessageEntity[];
}

export interface BinaryFirewallConfig {
	// Forum Topics (`message_thread_id`)
	forumTopicsMode: boolean;
	whitelistedTopicIds: number[];
	lockTopicCreation: boolean;
	// Binary UTF-8 & Spoofing
	blockZeroWidthChars: boolean;
	blockHomographImpersonation: boolean;
	protectedAdminNames: string[];
	// Bot API 8.x Entities & Cross-Chat
	blockExternalReplies: boolean;
	blockStoryForwards: boolean;
	blockPremiumCustomEmojis: boolean;
	blockSpoilerMessages: boolean;
	removeLinks: boolean;
}

export interface FirewallVerdict {
	allowed: boolean;
	reason:
		| 'ok'
		| 'whitelisted_topic'
		| 'admin_exempt'
		| 'zero_width_obfuscation'
		| 'homograph_admin_impersonation'
		| 'locked_topic_creation'
		| 'external_reply_blocked'
		| 'story_forward_blocked'
		| 'premium_custom_emoji_blocked'
		| 'spoiler_blocked'
		| 'link_blocked';
	matchedDetail?: string;
}

// Binary UTF-8 invisible / bidirectional control characters used by spammers to bypass regex filters
const ZERO_WIDTH_AND_BIDI_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/u;

// Confusable Cyrillic/Greek characters commonly used in Homograph attacks against Latin/Persian names
const CONFUSABLE_MAP: Record<string, string> = {
	а: 'a', // Cyrillic small a
	е: 'e', // Cyrillic small ie
	о: 'o', // Cyrillic small o
	р: 'p', // Cyrillic small er
	с: 'c', // Cyrillic small es
	у: 'y', // Cyrillic small u
	х: 'x', // Cyrillic small ha
	і: 'i', // Cyrillic small byelorussian-ukrainian i
	ј: 'j', // Cyrillic small je
	ѕ: 's', // Cyrillic small dze
	А: 'a',
	В: 'b',
	Е: 'e',
	К: 'k',
	М: 'm',
	Н: 'h',
	О: 'o',
	Р: 'p',
	С: 'c',
	Т: 't',
	Х: 'x',
	ك: 'ک', // Arabic Kaf to Persian Keheh
	ي: 'ی', // Arabic Yeh to Persian Farsi Yeh
	ة: 'ه',
};

/**
 * Detects invisible zero-width joiners, non-joiners (outside normal Persian ZWNJ context if abused),
 * or RTL/LTR bidirectional override characters (`\u202E` etc.).
 */
export function detectZeroWidthOrBidiOverride(rawText: string): {
	detected: boolean;
	codePoints: string[];
} {
	if (!rawText) return { detected: false, codePoints: [] };

	const found: string[] = [];
	for (const ch of rawText) {
		const cp = ch.codePointAt(0) ?? 0;
		// Flag Bidi overrides (\u202A-\u202E), invisible math/word joiners (\u2060-\u206F), BOM (\uFEFF),
		// LRM/RLM (\u200E-\u200F), ZWSP (\u200B), and consecutive ZWNJ/ZWJ abuse (>= 3 in a row)
		if (
			cp === 0x200b ||
			cp === 0x200e ||
			cp === 0x200f ||
			(cp >= 0x202a && cp <= 0x202e) ||
			(cp >= 0x2060 && cp <= 0x206f) ||
			cp === 0xfeff
		) {
			found.push(`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
		}
	}

	if (/[\u200C\u200D]{3,}/u.test(rawText)) {
		found.push('U+200C_FLOOD');
	}

	return {
		detected: found.length > 0,
		codePoints: Array.from(new Set(found)),
	};
}

/**
 * Normalizes a display name by replacing Cyrillic/Greek/Arabic confusable characters
 * and stripping zero-width characters to detect Admin Impersonation (Homograph Attack).
 */
export function normalizeHomographString(input: string): string {
	const stripped = input.replace(ZERO_WIDTH_AND_BIDI_REGEX, '').trim();
	let out = '';
	for (const ch of stripped) {
		out += CONFUSABLE_MAP[ch] ?? ch.toLowerCase();
	}
	return out.replace(/\s+/g, ' ');
}

export function detectHomographAdminSpoofing(
	userDisplayName: string,
	protectedAdminNames: string[],
): { spoofed: boolean; matchedAdmin?: string } {
	if (!userDisplayName || !protectedAdminNames.length) {
		return { spoofed: false };
	}

	const normalizedUser = normalizeHomographString(userDisplayName);
	const rawUserLower = userDisplayName.trim().toLowerCase();

	for (const adminName of protectedAdminNames) {
		const cleanAdmin = adminName.trim();
		if (!cleanAdmin) continue;
		const normalizedAdmin = normalizeHomographString(cleanAdmin);

		if (normalizedUser === normalizedAdmin) {
			// Spoofed if it uses confusables/invisible chars OR claims an exact protected admin title
			return { spoofed: true, matchedAdmin: cleanAdmin };
		}
		// Also check if user embeds Cyrillic + Latin mixed script inside the same word
		if (normalizedUser.includes(normalizedAdmin) && rawUserLower !== cleanAdmin.toLowerCase()) {
			return { spoofed: true, matchedAdmin: cleanAdmin };
		}
	}

	return { spoofed: false };
}

/**
 * Checks whether a message inside a Forum Supergroup (`message_thread_id`) belongs to a whitelisted topic.
 */
export function isForumTopicWhitelisted(
	messageThreadId: number | undefined,
	forumTopicsMode: boolean,
	whitelistedTopicIds: number[],
): boolean {
	if (!forumTopicsMode || !messageThreadId) return false;
	return whitelistedTopicIds.includes(messageThreadId);
}

/**
 * Evaluates an incoming Telegram Bot API 8.x message against Binary & Entity Firewall rules.
 */
export function evaluateBinaryMessageFirewall(
	msg: IncomingGroupMessage,
	config: BinaryFirewallConfig,
): FirewallVerdict {
	if (msg.is_admin) {
		return { allowed: true, reason: 'admin_exempt' };
	}

	// 1. Check Forum Topic creation/editing lock
	if (
		config.forumTopicsMode &&
		config.lockTopicCreation &&
		(msg.forum_topic_created || msg.forum_topic_edited)
	) {
		return {
			allowed: false,
			reason: 'locked_topic_creation',
			matchedDetail: 'forum_topic_created',
		};
	}

	// 2. Check Homograph / Admin Impersonation on sender's display name
	if (config.blockHomographImpersonation) {
		const spoofCheck = detectHomographAdminSpoofing(
			msg.user_display_name,
			config.protectedAdminNames,
		);
		if (spoofCheck.spoofed) {
			return {
				allowed: false,
				reason: 'homograph_admin_impersonation',
				matchedDetail: spoofCheck.matchedAdmin,
			};
		}
	}

	const combinedText = `${msg.text || ''} ${msg.caption || ''}`.trim();
	const allEntities: BinaryMessageEntity[] = [
		...(msg.entities || []),
		...(msg.caption_entities || []),
	];

	// 3. Check Zero-Width / Bidi RTL override characters (never exempted even in whitelisted topics)
	if (config.blockZeroWidthChars && combinedText) {
		const zw = detectZeroWidthOrBidiOverride(combinedText);
		if (zw.detected) {
			return {
				allowed: false,
				reason: 'zero_width_obfuscation',
				matchedDetail: zw.codePoints.join(', '),
			};
		}
	}

	// 4. Forum Topic Whitelist check (exempts links, media, and forwards in designated topics)
	if (
		isForumTopicWhitelisted(
			msg.message_thread_id,
			config.forumTopicsMode,
			config.whitelistedTopicIds,
		)
	) {
		return {
			allowed: true,
			reason: 'whitelisted_topic',
			matchedDetail: `topic:${msg.message_thread_id}`,
		};
	}

	// 5. Bot API 7.x/8.x `external_reply` (cross-chat / channel reply spam)
	if (config.blockExternalReplies && msg.external_reply) {
		return {
			allowed: false,
			reason: 'external_reply_blocked',
			matchedDetail: String(msg.external_reply.origin_chat_id || 'external'),
		};
	}

	// 6. Bot API `story` forward lock
	if (config.blockStoryForwards && msg.story) {
		return {
			allowed: false,
			reason: 'story_forward_blocked',
			matchedDetail: `story:${msg.story.id}`,
		};
	}

	// 7. Bot API `custom_emoji` entity lock (often used for animated ad banners by spam bots)
	if (config.blockPremiumCustomEmojis) {
		const customEmoji = allEntities.find((e) => e.type === 'custom_emoji');
		if (customEmoji) {
			return {
				allowed: false,
				reason: 'premium_custom_emoji_blocked',
				matchedDetail: customEmoji.custom_emoji_id || 'custom_emoji',
			};
		}
	}

	// 8. Spoiler entity or media spoiler lock
	if (config.blockSpoilerMessages) {
		const hasTextSpoiler = allEntities.some((e) => e.type === 'spoiler');
		if (msg.has_media_spoiler || hasTextSpoiler) {
			return {
				allowed: false,
				reason: 'spoiler_blocked',
			};
		}
	}

	// 9. URL & hidden `text_link` entity check
	if (config.removeLinks) {
		const linkEntity = allEntities.find((e) => e.type === 'url' || e.type === 'text_link');
		if (linkEntity || /(https?:\/\/|t\.me\/|telegram\.me\/)/i.test(combinedText)) {
			return {
				allowed: false,
				reason: 'link_blocked',
				matchedDetail: linkEntity?.url || 'url',
			};
		}
	}

	return { allowed: true, reason: 'ok' };
}

/**
 * Evaluates `UpdateChatJoinRequest` with optional WebApp Biometric verification.
 */
export function evaluateChatJoinRequest(params: {
	userId: number;
	isBot: boolean;
	userDisplayName: string;
	biometricRequired: boolean;
	biometricTokenVerified: boolean;
	protectedAdminNames: string[];
}): { action: 'approve' | 'decline' | 'pending_biometric'; reason: string } {
	if (params.isBot) {
		return { action: 'decline', reason: 'bot_account_rejected' };
	}

	const zwName = detectZeroWidthOrBidiOverride(params.userDisplayName);
	if (zwName.detected) {
		return { action: 'decline', reason: 'zero_width_name_rejected' };
	}

	const spoof = detectHomographAdminSpoofing(params.userDisplayName, params.protectedAdminNames);
	if (spoof.spoofed) {
		return { action: 'decline', reason: 'admin_impersonation_rejected' };
	}

	if (params.biometricRequired && !params.biometricTokenVerified) {
		return { action: 'pending_biometric', reason: 'awaiting_webapp_biometric_auth' };
	}

	return { action: 'approve', reason: 'verified_human_member' };
}
