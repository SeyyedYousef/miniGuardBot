import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createResource, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { groupApi } from '@/shared/api/bot-management.js';
import { isRtl, locale, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { SelectField, SettingsSection, ToggleSwitch } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';
import { UnsavedChangesSheet } from '@/shared/ui/UnsavedChangesSheet.js';

interface GeneralConfig {
	language: string;
	timezone: string;
	welcomeMessage: boolean;
	warningMessage: boolean;
	autoDeleteBot: boolean;
	autoDeleteDelay: number;
	trackAdmin: boolean;
	verifyMembers: boolean;
	publicCommands: boolean;
	hideJoinLeave: boolean;
	defaultPenalty: string;
	autoWarning: boolean;
	warningThreshold: number;
	warningRetention: number;
	warningFinalPenalty: string;
	casEnabled: boolean;
	antiRaidThreshold: number;
	antiRaidAction: string;
	botEnabled: boolean;
	ephemeralAll: boolean;
	ephemeralWelcome: boolean;
	ephemeralWarnings: boolean;
	ephemeralCaptcha: boolean;
	ephemeralAdminCmd: boolean;
	// Binary & Protocol Level Protections (Bot API 8.x)
	joinRequestCaptcha: boolean;
	biometricCaptcha: boolean;
	joinRequestTimeoutSec: number;
	blockZeroWidthChars: boolean;
	blockHomographImpersonation: boolean;
	// In-Chat Command Engine & Inline Buttons
	enablePersianNaturalCommands: boolean;
	autoDeleteAdminCommands: boolean;
	inlineActionButtons: boolean;
	publicReportCommand: boolean;
}

const defaultConfig: GeneralConfig = {
	language: 'fa',
	timezone: 'Asia/Tehran',
	welcomeMessage: true,
	warningMessage: true,
	autoDeleteBot: true,
	autoDeleteDelay: 60,
	trackAdmin: false,
	verifyMembers: false,
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
	botEnabled: true,
	ephemeralAll: false,
	ephemeralWelcome: true,
	ephemeralWarnings: true,
	ephemeralCaptcha: false,
	ephemeralAdminCmd: false,
	joinRequestCaptcha: true,
	biometricCaptcha: true,
	joinRequestTimeoutSec: 120,
	blockZeroWidthChars: true,
	blockHomographImpersonation: true,
	enablePersianNaturalCommands: true,
	autoDeleteAdminCommands: true,
	inlineActionButtons: true,
	publicReportCommand: true,
};

export const GeneralSettingsPage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();

	const [isSaving, setIsSaving] = createSignal(false);
	const [isDirty, setIsDirty] = createSignal(false);
	const [showUnsavedSheet, setShowUnsavedSheet] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);

	const [config, setConfig] = createStore<GeneralConfig>({ ...defaultConfig });

	createResource(
		() => params.id,
		async (groupId) => {
			const settings = await groupApi.getSettings(groupId);
			setSettingsVersion(settings.version);
			const general = (settings.general || {}) as Partial<GeneralConfig>;
			setConfig(reconcile({ ...defaultConfig, ...general }));
			return settings;
		},
	);

	const handleBack = () => {
		if (isDirty()) {
			setShowUnsavedSheet(true);
			return;
		}
		navigate(`/group/${params.id}`);
	};

	onMount(() => {
		try {
			backButton.show();
			const off = backButton.onClick(handleBack);
			onCleanup(() => off());
		} catch {}
	});

	const updateField = <K extends keyof GeneralConfig>(key: K, value: GeneralConfig[K]) => {
		setConfig(key, value);
		setIsDirty(true);
	};

	const handleSave = async () => {
		if (!isDirty()) return;
		haptic.impact('medium');
		setIsSaving(true);
		try {
			const result = await groupApi.updateSettings(
				params.id,
				'general',
				config as any,
				settingsVersion(),
			);
			setSettingsVersion(result.version);
			setIsDirty(false);
			setShowUnsavedSheet(false);
			haptic.notify('success');
			showToast(t('common.settingsSaved'), 'success');
			navigate(`/group/${params.id}`);
		} catch {
			haptic.notify('error');
			showToast(t('common.errorUpdateFailed'), 'error');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDiscard = () => {
		setIsDirty(false);
		setShowUnsavedSheet(false);
		navigate(`/group/${params.id}`);
	};

	return (
		<div class="tg-canvas pb-28 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between gap-2">
				<div class="flex items-center gap-2 min-w-0">
					<button
						onClick={() => {
							haptic.impact('light');
							handleBack();
						}}
						class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70 shrink-0"
						aria-label={t('common.back')}
					>
						<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
					</button>
					<h1 class="text-[16px] font-bold text-[var(--tg-text)] truncate">
						{t('generalSettings.title')}
					</h1>
				</div>

				<Show when={isDirty()}>
					<button
						onClick={handleSave}
						disabled={isSaving()}
						class="h-8 px-3.5 rounded-lg bg-[var(--tg-button)] text-white text-[13px] font-semibold flex items-center gap-1.5 active:opacity-80"
					>
						<Show
							when={!isSaving()}
							fallback={
								<span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							}
						>
							<span>{t('common.save')}</span>
						</Show>
					</button>
				</Show>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				{/* Core Bot Settings */}
				<div>
					<div class="tg-section-header">{t('generalSettings.botCoreSection')}</div>
					<div class="tg-section p-4 flex flex-col gap-4">
						<SettingsSection
							title={t('generalSettings.botEnabled')}
							description={t('generalSettings.botEnabledDesc')}
							enabled={config.botEnabled}
							onToggle={(v) => updateField('botEnabled', v)}
						/>

						<SelectField
							label={t('generalSettings.botLanguage')}
							value={config.language}
							onChange={(v) => updateField('language', v)}
							options={[
								{ value: 'fa', label: 'فارسی (Persian)' },
								{ value: 'ps', label: 'پښتو (Pashto)' },
								{ value: 'en', label: 'English' },
								{ value: 'ar', label: 'العربية (Arabic)' },
								{ value: 'ru', label: 'Русский (Russian)' },
								{ value: 'tr', label: 'Türkçe (Turkish)' },
								{ value: 'es', label: 'Español (Spanish)' },
								{ value: 'pt', label: 'Português (Portuguese)' },
								{ value: 'de', label: 'Deutsch (German)' },
								{ value: 'fr', label: 'Français (French)' },
								{ value: 'zh', label: '简体中文 (Chinese)' },
							]}
						/>

						<SelectField
							label={t('generalSettings.timeZone')}
							value={config.timezone}
							onChange={(v) => updateField('timezone', v)}
							options={[
								{ value: 'Asia/Tehran', label: 'Tehran (GMT+3:30)' },
								{ value: 'Asia/Kabul', label: 'Kabul (GMT+4:30)' },
								{ value: 'UTC', label: 'UTC (GMT+0)' },
								{ value: 'Europe/Moscow', label: 'Moscow (GMT+3)' },
								{ value: 'Asia/Shanghai', label: 'Shanghai (GMT+8)' },
							]}
							description={t('generalSettings.timeZoneDesc')}
						/>
					</div>
				</div>

				{/* Messaging & Auto-Delete */}
				<div>
					<div class="tg-section-header">{t('generalSettings.messagingSection')}</div>
					<div class="tg-section p-4 flex flex-col gap-3">
						<SettingsSection
							title={t('generalSettings.welcomeMessage')}
							description={t('generalSettings.welcomeMessageDesc')}
							enabled={config.welcomeMessage}
							onToggle={(v) => updateField('welcomeMessage', v)}
							hasEditText={true}
							onEditText={() => navigate(`/group/${params.id}/settings/custom-texts`)}
						/>

						<SettingsSection
							title={t('generalSettings.warningMessage')}
							description={t('generalSettings.warningMessageDesc')}
							enabled={config.warningMessage}
							onToggle={(v) => updateField('warningMessage', v)}
							hasEditText={true}
							onEditText={() => navigate(`/group/${params.id}/settings/custom-texts`)}
						/>

						<div class="bg-[var(--tg-section-bg)] rounded-xl border border-[var(--tg-separator)] p-3.5 flex flex-col gap-3">
							<div class="flex items-center justify-between gap-3">
								<div class="flex flex-col">
									<span class="text-[15px] font-medium text-[var(--tg-text)]">
										{t('generalSettings.autoDeleteBot')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] mt-0.5">
										{t('generalSettings.autoDeleteBotDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={config.autoDeleteBot}
									onChange={(v) => updateField('autoDeleteBot', v)}
								/>
							</div>

							<Show when={config.autoDeleteBot}>
								<div class="flex items-center gap-2.5 pt-2.5 border-t border-[var(--tg-separator)]">
									<input
										type="number"
										min="5"
										value={config.autoDeleteDelay}
										onInput={(e) =>
											updateField('autoDeleteDelay', parseInt(e.currentTarget.value, 10) || 60)
										}
										class="bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[14px] font-mono rounded-lg px-3 py-1.5 w-24 text-center focus:outline-none focus:border-[var(--tg-button)]"
										dir="ltr"
									/>
									<span class="text-[13px] text-[var(--tg-hint)]">
										{t('generalSettings.seconds')}
									</span>
								</div>
							</Show>
						</div>
					</div>
				</div>

				{/* Ephemeral Mode */}
				<div>
					<div class="tg-section-header">{t('generalSettings.ephemeralAll')}</div>
					<div class="tg-section p-4 flex flex-col gap-3">
						<SettingsSection
							title={t('generalSettings.ephemeralAll')}
							description={t('generalSettings.ephemeralAllDesc')}
							enabled={config.ephemeralAll}
							onToggle={(v) => updateField('ephemeralAll', v)}
						/>
						<SettingsSection
							title={t('generalSettings.ephemeralWelcome')}
							description={t('generalSettings.ephemeralWelcomeDesc')}
							enabled={config.ephemeralWelcome}
							onToggle={(v) => updateField('ephemeralWelcome', v)}
						/>
						<SettingsSection
							title={t('generalSettings.ephemeralWarnings')}
							description={t('generalSettings.ephemeralWarningsDesc')}
							enabled={config.ephemeralWarnings}
							onToggle={(v) => updateField('ephemeralWarnings', v)}
						/>
					</div>
				</div>

				{/* Moderation & Security */}
				<div>
					<div class="tg-section-header">{t('generalSettings.moderationSection')}</div>
					<div class="tg-section p-4 flex flex-col gap-4">
						<SelectField
							label={t('generalSettings.defaultPenalty')}
							value={config.defaultPenalty}
							onChange={(v) => updateField('defaultPenalty', v)}
							options={[
								{ value: 'delete', label: t('generalSettings.optDelete') },
								{ value: 'mute_1h', label: t('generalSettings.optMute1h') },
								{ value: 'mute_24h', label: t('generalSettings.optMute24h') },
								{ value: 'kick', label: t('generalSettings.optKick') },
								{ value: 'ban', label: t('generalSettings.optBan') },
							]}
							description={t('generalSettings.defaultPenaltyDesc')}
						/>

						<SettingsSection
							title={t('generalSettings.autoWarning')}
							description={t('generalSettings.autoWarningDesc')}
							enabled={config.autoWarning}
							onToggle={(v) => updateField('autoWarning', v)}
						/>

						<SettingsSection
							title={t('generalSettings.casProtection')}
							description={t('generalSettings.casProtectionDesc')}
							enabled={config.casEnabled}
							onToggle={(v) => updateField('casEnabled', v)}
						/>
					</div>
				</div>

				{/* In-Chat Commands & Inline Action Buttons Section */}
				<div>
					<div class="tg-section-header">
						{locale() === 'ps'
							? 'د چټ دننه کمانډونو او شیشه‌يي تڼیو انجن تنظیمات'
							: isRtl()
								? 'تنظیمات موتور دستورات داخل چت و دکمه‌های شیشه‌ای'
								: 'In-Chat Commands & Inline Action Buttons'}
					</div>
					<div class="tg-section p-4 flex flex-col gap-3.5">
						<SettingsSection
							title={
								locale() === 'ps'
									? 'بې له سلیشه طبیعي کمانډونه (Natural Triggers)'
									: isRtl()
										? 'دستورات فارسی بدون اسلش (Natural Triggers)'
										: 'Persian Natural Language Commands'
							}
							description={
								locale() === 'ps'
									? 'په ګروپ کې د اډمین په ریپلای سره د «بن / شړل»، «سکوت / بې‌غږه ۲ ساعته»، «خبرداری»، «معاف» او «پینل» په څېر کمانډونو هوښیار پېژندل'
									: isRtl()
										? 'تشخیص هوشمند دستوراتی مانند «بن»، «سکوت ۲ ساعت»، «اخطار»، «معاف» و «پنل» با ریپلای ادمین در گروه'
										: 'Recognize natural reply commands without requiring a leading slash'
							}
							enabled={config.enablePersianNaturalCommands}
							onToggle={(v) => updateField('enablePersianNaturalCommands', v)}
						/>

						<SettingsSection
							title={
								locale() === 'ps'
									? 'د اډمین د کمانډ پیغام اتومات پاکول'
									: isRtl()
										? 'حذف خودکار پیام دستور ادمین'
										: 'Auto-Delete Admin Command Message'
							}
							description={
								locale() === 'ps'
									? 'د شړلو، بې‌غږه کولو یا پاکولو تر پلي کېدو وروسته د اډمین کمانډ پیغام سملاسي پاکول ترڅو چټ پاک پاتې شي'
									: isRtl()
										? 'تمیز ماندن چت گروه با حذف آنی پیام دستور ادمین پس از اجرای بن، سکوت یا پاکسازی'
										: 'Keep group chat clean by deleting the admin command message after execution'
							}
							enabled={config.autoDeleteAdminCommands}
							onToggle={(v) => updateField('autoDeleteAdminCommands', v)}
						/>

						<SettingsSection
							title={
								locale() === 'ps'
									? 'د بوټ د پیغامونو لاندې د چټک غبرګون شیشه‌يي تڼۍ'
									: isRtl()
										? 'دکمه‌های شیشه‌ای واکنش سریع زیر پیام‌های ربات'
										: 'Quick-Action Inline Buttons Below Bot Alerts'
							}
							description={
								locale() === 'ps'
									? 'د بوټ د سرغړونې پیغامونو لاندې «🔊 بې‌غږه لرې کول» او «🚫 دایمي شړل» شیشه‌يي تڼۍ ورګډول (یوازې د اډمینانو لپاره)'
									: isRtl()
										? 'افزودن دکمه شیشه‌ای «🔊 لغو سکوت» و «🚫 اخراج کامل» زیر پیام‌های برخورد ربات (مخصوص ادمین‌ها)'
										: 'Attach 1-tap Unmute and Ban inline buttons below bot moderation messages'
							}
							enabled={config.inlineActionButtons}
							onToggle={(v) => updateField('inlineActionButtons', v)}
						/>

						<SettingsSection
							title={
								locale() === 'ps'
									? 'د غړو لپاره د «راپور» (/report) عامه کمانډ'
									: isRtl()
										? 'دستور عمومی «گزارش» (/report) برای اعضا'
										: 'Public Member Report Command (/report)'
							}
							description={
								locale() === 'ps'
									? 'غړو ته اجازه ورکول چې پر سرغړونکي پیغام د «راپور» یا /report ریپلای سره د ګروپ اډمینان سملاسي خبر کړي'
									: isRtl()
										? 'امکان ریپلای اعضا روی پیام متخلف با «گزارش» یا /report جهت اطلاع‌رسانی سریع به مدیران گروه'
										: 'Allow members to reply with /report to alert group administrators'
							}
							enabled={config.publicReportCommand}
							onToggle={(v) => updateField('publicReportCommand', v)}
						/>
					</div>
				</div>

				{/* Binary Protocol & Biometric Join-Request Security (Bot API 8.x) */}
				<div>
					<div class="tg-section-header">
						{locale() === 'ps'
							? 'بایومیټریک کیپچا او باینري امنیت (Bot API 8.x)'
							: isRtl()
								? 'کپچای بیومتریک و امنیت باینری (Bot API 8.x)'
								: 'Biometric Join-Request & Binary Security'}
					</div>
					<div class="tg-section p-4 flex flex-col gap-3.5">
						<SettingsSection
							title={
								locale() === 'ps'
									? 'د غړیتوب له غوښتنې سره د ننوتلو تایید (chatJoinRequest)'
									: isRtl()
										? 'تایید ورود با درخواست عضویت (chatJoinRequest)'
										: 'Native Join-Request Gate (chatJoinRequest)'
							}
							description={
								locale() === 'ps'
									? 'ګروپ ته له ننوتلو مخکې په شخصي پیغام کې د نویو کارنانو هویت تاییدول، پرته له دې چې د ګروپ چټ کې مزاحم پیغام واستول شي'
									: isRtl()
										? 'احراز هویت کاربران جدید در پیوی قبل از ورود به گروه بدون ارسال هیچ پیام مزاحم در چت گروه'
										: 'Verify new members in PM via approveChatJoinRequest with zero clutter inside the group'
							}
							enabled={config.joinRequestCaptcha}
							onToggle={(v) => updateField('joinRequestCaptcha', v)}
						/>

						<Show when={config.joinRequestCaptcha}>
							<SettingsSection
								title={
									locale() === 'ps'
										? 'د مینی‌اپ بایومیټریک کیپچا (BiometricManager)'
										: isRtl()
											? 'کپچای بیومتریک مینی‌اپ (BiometricManager)'
											: 'WebApp Biometric Verification (TouchID / FaceID)'
								}
								description={
									locale() === 'ps'
										? 'د جعلي حسابونو او بوټانو د ۱۰۰٪ مخنیوي لپاره د ټیلیګرام د رسمي ګوتې نښې یا مخ پېژندنې تایید لازمي کول'
										: isRtl()
											? 'الزام به تایید اثر انگشت یا تشخیص چهره رسمی تلگرام برای مسدودسازی ۱۰۰٪ اکانت‌های فیک و بات‌ها'
											: 'Require native Telegram hardware biometric signature before approving join request'
								}
								enabled={config.biometricCaptcha}
								onToggle={(v) => updateField('biometricCaptcha', v)}
							/>
						</Show>

						<SettingsSection
							title={
								locale() === 'ps'
									? 'د پټو باینري تورو سپر (Zero-Width & RTL)'
									: isRtl()
										? 'سپر کاراکترهای نامرئی باینری (Zero-Width & RTL)'
										: 'Binary Zero-Width & Bidi RTL Override Shield'
							}
							description={
								locale() === 'ps'
									? 'د U+200B تر U+202E پورې پټو کنټرول تورو بندول چې د لینک او ممنوعه کلمو فلټر تېروتنې لپاره کارول کېږي'
									: isRtl()
										? 'مسدودسازی کاراکترهای مخفی U+200B تا U+202E که برای دور زدن فیلتر لینک و کلمات ممنوعه استفاده می‌شوند'
										: 'Block invisible UTF-8 control characters used to bypass link and keyword filters'
							}
							enabled={config.blockZeroWidthChars}
							onToggle={(v) => updateField('blockZeroWidthChars', v)}
						/>

						<SettingsSection
							title={
								locale() === 'ps'
									? 'د اډمین د جعلي نوم مخنیوی (Unicode Homograph Shield)'
									: isRtl()
										? 'ضد جعل هویت ادمین (Unicode Homograph Shield)'
										: 'Admin Impersonation Homograph Protection'
							}
							description={
								locale() === 'ps'
									? 'د ګروپ اډمینانو د نوم نقل کولو د مخنیوي لپاره د کارنانو په نوم کې د ورته سیریلیک/عربي تورو اتومات پېژندل'
									: isRtl()
										? 'تشخیص خودکار حروف مشابه سیریلیک/عربی در نام کاربران برای جلوگیری از جعل هویت مدیران گروه'
										: 'Detect mixed-script Cyrillic/Latin lookalike characters impersonating group admins'
							}
							enabled={config.blockHomographImpersonation}
							onToggle={(v) => updateField('blockHomographImpersonation', v)}
						/>
					</div>
				</div>
			</main>

			{/* Bottom Save Button */}
			<Show when={isDirty()}>
				<div class="fixed bottom-0 inset-x-0 p-4 bg-[var(--tg-header-bg)] backdrop-blur-xl border-t border-[var(--tg-separator)] z-40">
					<div class="max-w-md mx-auto">
						<button
							onClick={handleSave}
							disabled={isSaving()}
							class="tg-btn-primary w-full h-11 text-[15px] flex items-center justify-center gap-2"
						>
							<Show
								when={!isSaving()}
								fallback={
									<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								}
							>
								<span class="material-symbols-outlined text-[20px]">check</span>
								<span>{t('generalSettings.saveSettings')}</span>
							</Show>
						</button>
					</div>
				</div>
			</Show>

			<UnsavedChangesSheet
				isOpen={showUnsavedSheet()}
				onSave={handleSave}
				onDiscard={handleDiscard}
				onClose={() => setShowUnsavedSheet(false)}
				saving={isSaving()}
			/>
		</div>
	);
};
