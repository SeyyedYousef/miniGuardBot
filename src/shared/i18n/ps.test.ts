import { describe, expect, it, vi } from 'vitest';
import { dict as en } from './en.js';
import { dict as ps } from './ps.js';

vi.unmock('@/shared/i18n/index.js');

const extractPlaceholders = (text: string): string[] => {
	const matches = text.match(/\{[a-zA-Z0-9_]+\}/g) || [];
	return [...new Set(matches)].sort();
};

const collectLeaves = (obj: Record<string, any>, prefix = ''): Record<string, string> => {
	const leaves: Record<string, string> = {};
	for (const key of Object.keys(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		const val = obj[key];
		if (val && typeof val === 'object' && !Array.isArray(val)) {
			Object.assign(leaves, collectLeaves(val, path));
		} else if (typeof val === 'string') {
			leaves[path] = val;
		}
	}
	return leaves;
};

describe('Pashto (ps) Frontend i18n Dictionary & Runtime', () => {
	it('has 100% key and placeholder parity between ps.ts and en.ts', () => {
		expect(ps.dir).toBe('rtl');
		expect(ps.settings.language).toBe('ستاسو ژبه');

		const enLeaves = collectLeaves(en);
		const psLeaves = collectLeaves(ps);

		expect(Object.keys(psLeaves).sort()).toEqual(Object.keys(enLeaves).sort());

		for (const key of Object.keys(enLeaves)) {
			const psVal = psLeaves[key];
			expect(psVal.trim().length, `Empty Pashto translation for "${key}"`).toBeGreaterThan(0);
			expect(
				extractPlaceholders(psVal),
				`Placeholder mismatch between en and ps at "${key}"`,
			).toEqual(extractPlaceholders(enLeaves[key]));
		}
	});

	it('registers Pashto (ps) as an RTL locale and dynamically loads its dictionary', async () => {
		const i18nMod = await import('./index.js');

		expect(i18nMod.RTL_LOCALES).toContain('ps');
		expect(i18nMod.VALID_LOCALE_CODES).toContain('ps');

		const psMeta = i18nMod.SUPPORTED_LANGUAGES.find((l) => l.code === 'ps');
		expect(psMeta).toBeDefined();
		expect(psMeta?.rtl).toBe(true);
		expect(psMeta?.native).toBe('پښتو');
		expect(i18nMod.getLanguageLabel('ps')).toContain('پښتو');

		await i18nMod.loadDictionary('ps');
		i18nMod.setLocale('ps');

		expect(i18nMod.locale()).toBe('ps');
		expect(i18nMod.isRtl()).toBe(true);
		expect(i18nMod.t('common.back')).toBe(ps.common.back);
		expect(i18nMod.t('settings.language')).toBe(ps.settings.language);
	});

	it('provides localized Pashto templates and credit info in group-ui.ts', async () => {
		const i18nMod = await import('./index.js');
		i18nMod.setLocale('ps');

		const groupUi = await import('./group-ui.js');

		const minimalPs = groupUi.getMinimalCustomTexts('ps');
		const minimalPus = groupUi.getMinimalCustomTexts('pus');
		const minimalFa = groupUi.getMinimalCustomTexts('fa');

		expect(minimalPs.welcomeText).toBe(minimalPus.welcomeText);
		expect(minimalPs.welcomeText).not.toBe(minimalFa.welcomeText);
		expect(minimalPs.welcomeText).toContain('{user}');
		expect(minimalPs.warningText).toContain('{reason}');
		expect(minimalPs.forceJoinLabel.length).toBeGreaterThan(0);

		const ui = groupUi.uiText();
		expect(ui.heroTitle).toBe('هر ګروپ، یو پرمختللی مدیریتي بوټ');
		expect(ui.createBotBtn).toBe('د ګروپ ځانګړی بوټ جوړول');

		const now = Date.now();
		const trialCredit = groupUi.getRemainingCreditInfo(
			{
				subscription_status: 'trial',
				trial_ends_at: new Date(now + 12 * 3600 * 1000).toISOString(),
			},
			now,
		);
		expect(trialCredit.isExpired).toBe(false);
		expect(trialCredit.shortBadge.length).toBeGreaterThan(0);
		expect(trialCredit.detailedText).toContain('وړیا');
	});
});
