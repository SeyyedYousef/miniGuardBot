import { describe, expect, it } from 'vitest';
import {
	type BinaryFirewallConfig,
	detectHomographAdminSpoofing,
	detectZeroWidthOrBidiOverride,
	evaluateBinaryMessageFirewall,
	evaluateChatJoinRequest,
	isForumTopicWhitelisted,
} from './firewall-engine.js';

const baseConfig: BinaryFirewallConfig = {
	forumTopicsMode: true,
	whitelistedTopicIds: [42, 108],
	lockTopicCreation: true,
	blockZeroWidthChars: true,
	blockHomographImpersonation: true,
	protectedAdminNames: ['Ali Rezaei', 'مدیر اصلی گروه'],
	blockExternalReplies: true,
	blockStoryForwards: true,
	blockPremiumCustomEmojis: true,
	blockSpoilerMessages: true,
	removeLinks: true,
};

describe('MiniGuard Binary & Protocol Firewall Engine', () => {
	it('detects invisible Zero-Width Space (U+200B) and RTL Override (U+202E) characters', () => {
		const clean = detectZeroWidthOrBidiOverride('سلام دوستان به گروه خوش آمدید');
		expect(clean.detected).toBe(false);

		const obfuscatedLink = detectZeroWidthOrBidiOverride('https://t\u200B.me/\u202Espam_channel');
		expect(obfuscatedLink.detected).toBe(true);
		expect(obfuscatedLink.codePoints).toContain('U+200B');
		expect(obfuscatedLink.codePoints).toContain('U+202E');
	});

	it('detects Cyrillic/Arabic Homograph spoofing of group admin display names', () => {
		// Using Cyrillic 'а' (\u0430) and 'е' (\u0435) instead of Latin 'a' and 'e'
		const cyrillicSpoof = 'Аli Rеzaei';
		const res = detectHomographAdminSpoofing(cyrillicSpoof, baseConfig.protectedAdminNames);
		expect(res.spoofed).toBe(true);
		expect(res.matchedAdmin).toBe('Ali Rezaei');

		// Using Arabic Kaf/Yeh against Persian admin title
		const arabicSpoof = 'مدير اصلي گروه';
		const resFa = detectHomographAdminSpoofing(arabicSpoof, baseConfig.protectedAdminNames);
		expect(resFa.spoofed).toBe(true);

		const normalMember = detectHomographAdminSpoofing(
			'Mohammad Karimi',
			baseConfig.protectedAdminNames,
		);
		expect(normalMember.spoofed).toBe(false);
	});

	it('exempts whitelisted Forum Topic IDs (message_thread_id) from link/external_reply locks', () => {
		expect(isForumTopicWhitelisted(42, true, [42, 108])).toBe(true);
		expect(isForumTopicWhitelisted(999, true, [42, 108])).toBe(false);

		// Link inside whitelisted topic #42 is allowed
		const allowedInTopic = evaluateBinaryMessageFirewall(
			{
				message_id: 1,
				user_id: 1001,
				user_display_name: 'Sina',
				message_thread_id: 42,
				text: 'Check out https://github.com/solidjs/solid',
				entities: [{ type: 'url', offset: 10, length: 31 }],
			},
			baseConfig,
		);
		expect(allowedInTopic.allowed).toBe(true);
		expect(allowedInTopic.reason).toBe('whitelisted_topic');

		// Same link in non-whitelisted topic #99 is blocked
		const blockedInGeneral = evaluateBinaryMessageFirewall(
			{
				message_id: 2,
				user_id: 1001,
				user_display_name: 'Sina',
				message_thread_id: 99,
				text: 'Check out https://github.com/solidjs/solid',
				entities: [{ type: 'url', offset: 10, length: 31 }],
			},
			baseConfig,
		);
		expect(blockedInGeneral.allowed).toBe(false);
		expect(blockedInGeneral.reason).toBe('link_blocked');
	});

	it('blocks Bot API 8.x external_reply, story forwards, and custom_emoji spam', () => {
		const extReplyVerdict = evaluateBinaryMessageFirewall(
			{
				message_id: 10,
				user_id: 2002,
				user_display_name: 'User2',
				text: 'Look at this channel post',
				external_reply: { origin_chat_id: -10099887766, origin_type: 'channel' },
			},
			baseConfig,
		);
		expect(extReplyVerdict.allowed).toBe(false);
		expect(extReplyVerdict.reason).toBe('external_reply_blocked');

		const storyVerdict = evaluateBinaryMessageFirewall(
			{
				message_id: 11,
				user_id: 2002,
				user_display_name: 'User2',
				story: { id: 55, chat_id: -10012345 },
			},
			baseConfig,
		);
		expect(storyVerdict.allowed).toBe(false);
		expect(storyVerdict.reason).toBe('story_forward_blocked');

		const customEmojiVerdict = evaluateBinaryMessageFirewall(
			{
				message_id: 12,
				user_id: 2002,
				user_display_name: 'User2',
				text: '💎 Join VIP',
				entities: [
					{ type: 'custom_emoji', offset: 0, length: 2, custom_emoji_id: '5368324170671202286' },
				],
			},
			baseConfig,
		);
		expect(customEmojiVerdict.allowed).toBe(false);
		expect(customEmojiVerdict.reason).toBe('premium_custom_emoji_blocked');
	});

	it('evaluates UpdateChatJoinRequest with WebApp Biometric verification', () => {
		const pendingBio = evaluateChatJoinRequest({
			userId: 501,
			isBot: false,
			userDisplayName: 'Reza',
			biometricRequired: true,
			biometricTokenVerified: false,
			protectedAdminNames: baseConfig.protectedAdminNames,
		});
		expect(pendingBio.action).toBe('pending_biometric');

		const approvedHuman = evaluateChatJoinRequest({
			userId: 501,
			isBot: false,
			userDisplayName: 'Reza',
			biometricRequired: true,
			biometricTokenVerified: true,
			protectedAdminNames: baseConfig.protectedAdminNames,
		});
		expect(approvedHuman.action).toBe('approve');

		const spoofDeclined = evaluateChatJoinRequest({
			userId: 502,
			isBot: false,
			userDisplayName: 'Аli Rеzaei',
			biometricRequired: false,
			biometricTokenVerified: false,
			protectedAdminNames: baseConfig.protectedAdminNames,
		});
		expect(spoofDeclined.action).toBe('decline');
	});
});
