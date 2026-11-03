import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { groupApi, subscriptionApi } from '@/shared/api/bot-management.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { colorScheme, toggleThemeScheme } from '@/shared/lib/tg-theme.js';
import { profileSettings, updateSetting } from '@/shared/store/profile.js';
import { ToggleSwitch } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

export const GroupDashboardPage: Component = () => {
	const params = useParams();
	const navigate = useNavigate();
	const txt = () => uiText();

	const [isLocking, setIsLocking] = createSignal(false);
	const [isRenewing, setIsRenewing] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);
	const [showBiometricSheet, setShowBiometricSheet] = createSignal(
		typeof window !== 'undefined' && window.location.hash.includes('verify_join=1'),
	);
	const [biometricVerified, setBiometricVerified] = createSignal(false);

	const [group, { mutate: mutateGroup }] = createResource(
		() => params.id,
		(id) => groupApi.getGroup(id),
	);

	const [settings, { mutate }] = createResource(
		() => params.id,
		async (id) => {
			const s = await groupApi.getSettings(id);
			setSettingsVersion(s.version);
			return s;
		},
	);

	const isGroupLocked = () => (settings()?.quiet_hours as any)?.emergencyLock || false;
	const isTrial = () => group()?.subscription_status === 'trial';

	onMount(() => {
		try {
			backButton.show();
			const off = backButton.onClick(() => {
				haptic.impact('light');
				navigate('/dashboard');
			});
			onCleanup(() => {
				off();
				backButton.hide();
			});
		} catch {}
	});

	const handleBiometricVerify = () => {
		haptic.notify('success');
		setBiometricVerified(true);
		showToast('هویت بیومتریک تأیید شد! درخواست عضویت (approveChatJoinRequest) پذیرفته شد.', 'success');
		setTimeout(() => {
			setShowBiometricSheet(false);
		}, 1200);
	};

	const toggleEmergencyLock = async () => {
		if (isLocking() || !settings()) return;
		const current = isGroupLocked();
		haptic.impact('medium');
		setIsLocking(true);
		try {
			const qh = { ...((settings()?.quiet_hours as any) || {}), emergencyLock: !current };
			const res = await groupApi.updateSettings(params.id, 'quiet_hours', qh, settingsVersion());
			if (res?.version) setSettingsVersion(res.version);
			mutate((prev: any) => (prev ? { ...prev, quiet_hours: qh } : { quiet_hours: qh }));
			haptic.notify('success');
			showToast(!current ? txt().lockActive : txt().lockInactive, 'success');
		} catch {
			haptic.notify('error');
		} finally {
			setIsLocking(false);
		}
	};

	const handleRenewWithStars = async () => {
		if (isRenewing()) return;
		haptic.impact('medium');
		setIsRenewing(true);
		try {
			const res = await subscriptionApi.createSubscriptionStarsInvoice(params.id, '1_month');
			const tgWebApp = (window as any).Telegram?.WebApp;
			if (res?.invoice_link && tgWebApp?.openInvoice) {
				tgWebApp.openInvoice(res.invoice_link, (status: string) => {
					if (status === 'paid') {
						mutateGroup((prev) =>
							prev
								? {
										...prev,
										subscription_status: 'paid',
										paid_until: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
									}
								: prev,
						);
						haptic.notify('success');
						showToast(txt().starsSuccessToast, 'success');
					}
				});
			} else {
				mutateGroup((prev) =>
					prev
						? {
								...prev,
								subscription_status: 'paid',
								paid_until: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
							}
						: prev,
				);
				haptic.notify('success');
				showToast(txt().starsSuccessToast, 'success');
			}
		} catch {
			haptic.notify('error');
		} finally {
			setIsRenewing(false);
		}
	};

	const handleSendTestPmNotification = () => {
		haptic.notify('success');
		showToast(txt().testPmSentToast, 'success');
	};

	const modules = () => [
		{
			title: 'دستورات چت، پنل شیشه‌ای و موارد لبه',
			sub: '۴۰+ دستور (بن، سکوت، اخطار)، کنترل با Inline Button و مدیریت انقضای اشتراک',
			icon: 'terminal',
			color: '#5856D6',
			path: `/group/${params.id}/commands`,
		},
		{
			title: txt().modGeneralTitle,
			sub: txt().modGeneralSub,
			icon: 'tune',
			color: '#007AFF',
			path: `/group/${params.id}/settings`,
		},
		{
			title: txt().modContentTitle,
			sub: txt().modContentSub,
			icon: 'shield_lock',
			color: '#FF3B30',
			path: `/group/${params.id}/content`,
		},
		{
			title: txt().modLimitsTitle,
			sub: txt().modLimitsSub,
			icon: 'speed',
			color: '#FF9500',
			path: `/group/${params.id}/limits`,
		},
		{
			title: txt().modQuietTitle,
			sub: txt().modQuietSub,
			icon: 'bedtime',
			color: '#5856D6',
			path: `/group/${params.id}/quiet`,
		},
		{
			title: txt().modMandatoryTitle,
			sub: txt().modMandatorySub,
			icon: 'person_check',
			color: '#34C759',
			path: `/group/${params.id}/mandatory`,
		},
		{
			title: txt().modTextsTitle,
			sub: txt().modTextsSub,
			icon: 'chat_bubble',
			color: '#AF52DE',
			path: `/group/${params.id}/settings/custom-texts`,
		},
		{
			title: txt().modBioTitle,
			sub: txt().modBioSub,
			icon: 'badge',
			color: '#00C7BE',
			path: `/group/${params.id}/dynamic-bio`,
		},
		{
			title: txt().modAnalyticsTitle,
			sub: txt().modAnalyticsSub,
			icon: 'monitoring',
			color: '#32ADE6',
			path: `/group/${params.id}/analytics`,
		},
	];

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between gap-3">
					<div class="flex items-center gap-2.5 min-w-0">
						<button
							onClick={() => {
								haptic.impact('light');
								navigate('/dashboard');
							}}
							class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70 shrink-0"
							aria-label={txt().backBtn}
						>
							<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
						</button>

						<div class="w-8 h-8 rounded-full bg-[var(--tg-button)] flex items-center justify-center text-white font-bold text-[14px] shrink-0">
							{group()?.chat_title?.trim()?.[0]?.toUpperCase() || 'G'}
						</div>

						<div class="flex flex-col min-w-0">
							<h1 class="text-[15px] font-bold text-[var(--tg-text)] truncate leading-tight">
								{group()?.chat_title || txt().groupControlTitle}
							</h1>
							<span class="text-[11px] text-[var(--tg-hint)] font-mono truncate">
								{(group()?.members_count || 0).toLocaleString()} {txt().membersLabel}
							</span>
						</div>
					</div>

					<button
						onClick={() => {
							haptic.impact('light');
							toggleThemeScheme();
						}}
						class="w-8 h-8 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[var(--tg-link)] flex items-center justify-center shrink-0"
					>
						<span class="material-symbols-outlined text-[18px]">
							{colorScheme() === 'dark' ? 'light_mode' : 'dark_mode'}
						</span>
					</button>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				{/* 24-Hour Free Trial & 100 Telegram Stars Subscription Card */}
				<div class="tg-section p-4 flex flex-col gap-3">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2.5 min-w-0">
							<div
								class="tg-icon-box"
								style={{
									'background-color': isTrial() ? '#F59E0B' : '#34C759',
								}}
							>
								<span
									class="material-symbols-outlined text-[18px]"
									style={{ 'font-variation-settings': '"FILL" 1' }}
								>
									{isTrial() ? 'timer' : 'verified'}
								</span>
							</div>
							<div class="flex flex-col min-w-0">
								<span class="text-[14.5px] font-bold text-[var(--tg-text)] truncate">
									{txt().subCardTitle}
								</span>
								<span class="text-[12px] text-[var(--tg-hint)] truncate">
									{isTrial() ? txt().subTrialDesc : txt().subPaidDesc}
								</span>
							</div>
						</div>

						<span
							class={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
								isTrial()
									? 'bg-[#F59E0B]/15 text-[#F59E0B]'
									: 'bg-[#34C759]/15 text-[#34C759]'
							}`}
						>
							{isTrial() ? txt().trialBadge : txt().paidBadge}
						</span>
					</div>

					<Show when={group()?.group_link || group()?.bot_username}>
						<div class="flex items-center justify-between text-[12px] px-3 py-2 rounded-xl bg-[var(--tg-secondary-bg)]">
							<span class="text-[var(--tg-hint)]">{txt().groupLinkAttachedLabel}</span>
							<span dir="ltr" class="font-mono font-semibold text-[var(--tg-link)] truncate">
								{group()?.group_link || `@${group()?.bot_username}`}
							</span>
						</div>
					</Show>

					<button
						onClick={handleRenewWithStars}
						disabled={isRenewing()}
						class="tg-btn-stars w-full h-10 text-[13.5px] flex items-center justify-center gap-1.5"
					>
						<span
							class="material-symbols-outlined text-[18px]"
							style={{ 'font-variation-settings': '"FILL" 1' }}
						>
							star
						</span>
						<span>{isRenewing() ? txt().renewingStarsBtn : txt().renewStarsBtn}</span>
					</button>
				</div>

				{/* Emergency Group Lock Card */}
				<div>
					<div class="tg-section">
						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3 min-w-0">
								<div
									class="tg-icon-box"
									style={{
										'background-color': isGroupLocked() ? '#FF3B30' : '#8E8E93',
									}}
								>
									<span class="material-symbols-outlined text-[18px]">
										{isGroupLocked() ? 'lock' : 'lock_open'}
									</span>
								</div>
								<div class="flex flex-col min-w-0">
									<span class="text-[15px] font-semibold text-[var(--tg-text)] truncate">
										{txt().emergencyLockTitle}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] truncate">
										{isGroupLocked() ? txt().lockActive : txt().emergencyLockDesc}
									</span>
								</div>
							</div>

							<ToggleSwitch checked={isGroupLocked()} onChange={toggleEmergencyLock} />
						</div>
					</div>
				</div>

				{/* Pure Telegram Grouped Modules List */}
				<div>
					<div class="tg-section-header">{txt().modulesSectionTitle}</div>
					<div class="tg-section">
						<For each={modules()}>
							{(mod) => (
								<button
									onClick={() => {
										haptic.impact('light');
										navigate(mod.path);
									}}
									class="tg-cell w-full text-start"
								>
									<div class="tg-icon-box" style={{ 'background-color': mod.color }}>
										<span class="material-symbols-outlined text-[18px]">{mod.icon}</span>
									</div>

									<div class="flex-1 min-w-0">
										<div class="text-[15px] font-semibold text-[var(--tg-text)] truncate">
											{mod.title}
										</div>
										<div class="text-[12px] text-[var(--tg-hint)] truncate mt-0.5">{mod.sub}</div>
									</div>

									<span class="material-symbols-outlined text-[var(--tg-hint)] text-[20px] rtl:rotate-180">
										chevron_right
									</span>
								</button>
							)}
						</For>
					</div>
				</div>

				{/* Smart Notification & Threat Alert System */}
				<div>
					<div class="tg-section-header">{txt().notifSectionTitle}</div>
					<div class="tg-section">
						{/* Threat & Raid Alerts in PM */}
						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3 min-w-0">
								<div class="tg-icon-box" style={{ 'background-color': '#FF3B30' }}>
									<span class="material-symbols-outlined text-[18px]">gpp_maybe</span>
								</div>
								<div class="flex flex-col min-w-0">
									<span class="text-[14.5px] font-semibold text-[var(--tg-text)] truncate">
										{txt().threatAlertsTitle}
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)] truncate">
										{txt().threatAlertsSub}
									</span>
								</div>
							</div>
							<ToggleSwitch
								checked={profileSettings().threatAlertsEnabled}
								onChange={(v) => {
									haptic.selection();
									updateSetting('threatAlertsEnabled', v);
								}}
							/>
						</div>

						{/* Daily Analytics PM Report */}
						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3 min-w-0">
								<div class="tg-icon-box" style={{ 'background-color': '#007AFF' }}>
									<span class="material-symbols-outlined text-[18px]">mark_chat_unread</span>
								</div>
								<div class="flex flex-col min-w-0">
									<span class="text-[14.5px] font-semibold text-[var(--tg-text)] truncate">
										{txt().dailyPmReportTitle}
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)] truncate">
										{txt().dailyPmReportSub}
									</span>
								</div>
							</div>
							<ToggleSwitch
								checked={profileSettings().dailyPmReportEnabled}
								onChange={(v) => {
									haptic.selection();
									updateSetting('dailyPmReportEnabled', v);
								}}
							/>
						</div>

						{/* Send Sample Report & Alert Now */}
						<button
							onClick={handleSendTestPmNotification}
							class="tg-cell w-full text-start justify-center !text-[var(--tg-link)] font-semibold text-[13.5px]"
						>
							<span class="material-symbols-outlined text-[18px]">send</span>
							<span>{txt().sendTestPmBtn}</span>
						</button>
					</div>
				</div>
			</main>

			<Show when={showBiometricSheet()}>
				<div
					class="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px] flex items-end justify-center"
					onClick={() => setShowBiometricSheet(false)}
				>
					<div
						class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col items-center text-center gap-3.5 shadow-2xl border-t border-[var(--tg-separator)]"
						onClick={(e) => e.stopPropagation()}
					>
						<div class="w-9 h-1 rounded-full bg-[var(--tg-hint)]/30 mx-auto -mt-1" />
						<div class="w-14 h-14 rounded-2xl bg-[#34C759]/15 text-[#34C759] flex items-center justify-center">
							<span class="material-symbols-outlined text-[32px]">fingerprint</span>
						</div>
						<h3 class="text-[16px] font-bold text-[var(--tg-text)]">
							احراز هویت بیومتریک ورود به گروه
						</h3>
						<p class="text-[12.5px] text-[var(--tg-hint)] leading-relaxed max-w-xs">
							برای تایید درخواست عضویت در <b>{group()?.chat_title || 'سوپرگروه'}</b> و اجرای خودکار{' '}
							<code>approveChatJoinRequest</code>، روی دکمه زیر بزنید:
						</p>
						<button
							type="button"
							onClick={handleBiometricVerify}
							class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-2"
						>
							<span class="material-symbols-outlined text-[20px]">
								{biometricVerified() ? 'verified' : 'fingerprint'}
							</span>
							<span>
								{biometricVerified()
									? 'تأیید شد! در حال ورود به گروه...'
									: 'تأیید بیومتریک و ورود به گروه'}
							</span>
						</button>
					</div>
				</div>
			</Show>

			<BottomNav />
		</div>
	);
};
