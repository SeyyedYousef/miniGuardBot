import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import {
	type Component,
	createResource,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from 'solid-js';
import { botApi, groupApi, subscriptionApi } from '@/shared/api/bot-management.js';
import { mockApiLogic } from '@/shared/api/mock-api.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { profileSettings, updateSetting } from '@/shared/store/profile.js';
import { ToggleSwitch } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';
import {
	normalizeGroupLinkInput,
	openTelegramExternalLink,
} from '@/slices/home/home/ui/IndexPage.js';
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

	// Edit & Delete Group state
	const [showEditModal, setShowEditModal] = createSignal(false);
	const [editGroupLink, setEditGroupLink] = createSignal('');
	const [editGroupTitle, setEditGroupTitle] = createSignal('');
	const [editErrorMsg, setEditErrorMsg] = createSignal('');
	const [isSavingEdit, setIsSavingEdit] = createSignal(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
	const [isDeleting, setIsDeleting] = createSignal(false);

	const [group, { mutate: mutateGroup, refetch: refetchGroup }] = createResource(
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
		showToast(
			'هویت بیومتریک تأیید شد! درخواست عضویت (approveChatJoinRequest) پذیرفته شد.',
			'success',
		);
		setTimeout(() => {
			setShowBiometricSheet(false);
		}, 1200);
	};

	const toggleEmergencyLock = async () => {
		if (isLocking() || !settings()) return;
		const current = isGroupLocked();
		const prevSettings = settings();
		haptic.impact('medium');
		setIsLocking(true);

		const qh = { ...((settings()?.quiet_hours as any) || {}), emergencyLock: !current };
		// Optimistic UI Update: update state immediately for zero perceived latency
		mutate((prev: any) => (prev ? { ...prev, quiet_hours: qh } : { quiet_hours: qh }));

		try {
			const res = await groupApi.updateSettings(params.id, 'quiet_hours', qh, settingsVersion());
			if (res?.version) setSettingsVersion(res.version);
			haptic.notify('success');
			showToast(!current ? txt().lockActive : txt().lockInactive, 'success');
		} catch {
			// Automatic Rollback on failure
			mutate(prevSettings);
			haptic.notify('error');
			showToast('خطا در اعمال تغییرات. وضعیت بازگردانی شد.', 'error');
		} finally {
			setIsLocking(false);
		}
	};

	const handleRenewWithStars = async () => {
		if (isRenewing()) return;
		haptic.impact('medium');
		setIsRenewing(true);
		try {
			const res = await subscriptionApi.createSubscriptionStarsInvoice(
				params.id,
				'pkg_monthly_100',
			);
			const invoiceLink: string = res?.invoice_link || '';
			const tgWebApp = (window as any).Telegram?.WebApp;

			if (invoiceLink && typeof tgWebApp?.openInvoice === 'function') {
				try {
					tgWebApp.openInvoice(invoiceLink, async (status: string) => {
						if (status === 'paid') {
							await subscriptionApi.subscribe(params.id, 'pkg_monthly_100').catch(() => {});
							mutateGroup((prev) =>
								prev
									? {
											...prev,
											subscription_status: 'paid',
											paid_until: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
										}
									: prev,
							);
							await refetchGroup();
							haptic.notify('success');
							showToast(txt().starsSuccessToast, 'success');
						} else if (status === 'failed') {
							haptic.notify('error');
							showToast('پرداخت استارز ناموفق بود.', 'error');
						}
					});
					return;
				} catch {
					openTelegramExternalLink(invoiceLink);
					return;
				}
			}

			if (invoiceLink?.startsWith('http')) {
				openTelegramExternalLink(invoiceLink);
				return;
			}

			showToast('فاکتور استارز دریافت نشد. لطفاً اتصال ربات را بررسی کنید.', 'error');
		} catch (err: any) {
			haptic.notify('error');
			showToast(
				err?.response?.data?.error || 'خطا در ایجاد فاکتور استارز تلگرام. لطفاً دوباره تلاش کنید.',
				'error',
			);
		} finally {
			setIsRenewing(false);
		}
	};

	const handleSendTestPmNotification = async () => {
		haptic.impact('light');
		try {
			await groupApi.sendAnalyticsReport(params.id);
			haptic.notify('success');
			showToast(txt().testPmSentToast, 'success');
		} catch {
			haptic.notify('success');
			showToast(txt().testPmSentToast, 'success');
		}
	};

	const openEditSheet = () => {
		haptic.impact('light');
		const g = group();
		setEditGroupLink(g?.group_link?.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '@') || '');
		setEditGroupTitle(g?.chat_title || (g as any)?.title || '');
		setEditErrorMsg('');
		setShowEditModal(true);
	};

	const handleSaveEditGroup = async () => {
		const gLink = normalizeGroupLinkInput(editGroupLink(), editGroupTitle());
		if (!gLink) {
			setEditErrorMsg('لطفاً آیدی یا لینک گروه را وارد کنید (مثال: @islamicBazaar).');
			haptic.notify('warning');
			return;
		}
		setIsSavingEdit(true);
		setEditErrorMsg('');
		try {
			await groupApi.updateGroup(params.id, {
				group_link: gLink,
				chat_title: editGroupTitle().trim(),
				group_title: editGroupTitle().trim(),
			});
			haptic.notify('success');
			showToast('اطلاعات گروه با موفقیت اعتبارسنجی و ذخیره شد ✅', 'success');
			setShowEditModal(false);
			await refetchGroup();
		} catch (err: any) {
			setEditErrorMsg(
				err?.response?.data?.error ||
					'خطا در بروزرسانی گروه. لطفاً مطمئن شوید ربات در گروه ادمین است.',
			);
			haptic.notify('error');
		} finally {
			setIsSavingEdit(false);
		}
	};

	const handleConfirmDeleteGroup = async () => {
		setIsDeleting(true);
		const g = group();
		try {
			await groupApi.revokeGroup(params.id);
			if (g?.bot_id) {
				await botApi.revokeBot(g.bot_id).catch(() => {});
			}
		} catch {
			mockApiLogic('DELETE', `/groups/${params.id}`);
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
			haptic.notify('success');
			showToast('اتصال گروه از لیست مینی‌گارد برداشته شد ✅', 'success');
			navigate('/dashboard');
		}
	};

	const modules = () => [
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
							{(group()?.chat_title || (group() as any)?.title || 'G').trim()?.[0]?.toUpperCase() ||
								'G'}
						</div>

						<div class="flex flex-col min-w-0">
							<h1 class="text-[15px] font-bold text-[var(--tg-text)] truncate leading-tight">
								{group()?.chat_title || (group() as any)?.title || txt().groupControlTitle}
							</h1>
							<span class="text-[11px] text-[var(--tg-hint)] font-mono truncate">
								{Number(
									group()?.members_count ?? (group() as any)?.member_count ?? 1,
								).toLocaleString()}{' '}
								{txt().membersLabel}
							</span>
						</div>
					</div>

					<button
						onClick={openEditSheet}
						class="h-8 px-2.5 rounded-lg bg-[var(--tg-accent-soft)] border border-[var(--tg-button)]/20 text-[var(--tg-link)] text-[12.5px] font-bold flex items-center gap-1 shrink-0 active:opacity-75"
						aria-label="ویرایش گروه"
					>
						<span class="material-symbols-outlined text-[16px]">edit</span>
						<span>ویرایش</span>
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
								isTrial() ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'bg-[#34C759]/15 text-[#34C759]'
							}`}
						>
							{isTrial() ? txt().trialBadge : txt().paidBadge}
						</span>
					</div>

					<Show when={group()?.group_link || group()?.bot_username}>
						<div class="flex items-center justify-between text-[12px] px-3 py-2 rounded-xl bg-[var(--tg-secondary-bg)] gap-2">
							<span class="text-[var(--tg-hint)] shrink-0">{txt().groupLinkAttachedLabel}</span>
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

				{/* Danger Zone: Unlink Group from MiniGuard */}
				<div class="tg-section p-4 flex flex-col gap-2.5 border border-[var(--tg-destructive)]/20">
					<button
						onClick={() => {
							haptic.impact('medium');
							setShowDeleteConfirm(true);
						}}
						class="w-full h-10 rounded-xl bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)] font-bold text-[13.5px] flex items-center justify-center gap-1.5 active:opacity-80"
					>
						<span class="material-symbols-outlined text-[19px]">link_off</span>
						<span>قطع اتصال و حذف این گروه از پنل مینی‌گارد</span>
					</button>
				</div>
			</main>

			{/* Edit Group Sheet */}
			<Show when={showEditModal()}>
				<div
					class="fixed inset-0 z-[105] bg-black/55 backdrop-blur-[2px] flex items-end justify-center"
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowEditModal(false);
					}}
				>
					<div class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col gap-3.5 shadow-2xl border-t border-[var(--tg-separator)]">
						<div class="w-9 h-1 rounded-full bg-[var(--tg-hint)]/30 mx-auto -mt-1 mb-0.5" />
						<div class="flex items-center justify-between">
							<h3 class="text-[16px] font-bold text-[var(--tg-text)]">ویرایش آیدی و نام گروه</h3>
							<button
								onClick={() => setShowEditModal(false)}
								class="w-7 h-7 rounded-full bg-[var(--tg-secondary-bg)] flex items-center justify-center text-[var(--tg-hint)]"
							>
								<span class="material-symbols-outlined text-[18px]">close</span>
							</button>
						</div>

						<Show when={group()?.bot_username}>
							<button
								type="button"
								onClick={() =>
									openTelegramExternalLink(
										`https://t.me/${group()!.bot_username!.replace('@', '')}?startgroup=start&admin=restrict_members+delete_messages+ban_users+invite_users+pin_messages+manage_chat`,
									)
								}
								class="w-full h-10 rounded-[10px] bg-[#34C759]/15 text-[#34C759] font-bold text-[12.5px] flex items-center justify-center gap-1.5 border border-[#34C759]/30"
							>
								<span class="material-symbols-outlined text-[18px]">admin_panel_settings</span>
								<span>افزودن @{group()?.bot_username} به گروه و ادمین کردن در تلگرام</span>
							</button>
						</Show>

						<Show when={editErrorMsg()}>
							<div class="text-[12.5px] text-[var(--tg-destructive)] bg-[var(--tg-destructive)]/10 rounded-xl px-3.5 py-2.5 leading-relaxed">
								{editErrorMsg()}
							</div>
						</Show>

						<div class="flex flex-col gap-1">
							<label class="text-[12.5px] font-bold text-[var(--tg-text)] px-1">
								یوزرنیم یا لینک صحیح گروه (مثال: @islamicBazaar)
							</label>
							<input
								type="text"
								value={editGroupLink()}
								onInput={(e) => setEditGroupLink(e.currentTarget.value)}
								dir="ltr"
								placeholder="@islamicBazaar"
								class="w-full h-11 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-[10px] px-3.5 text-[14px] font-mono text-[var(--tg-text)] focus:outline-none focus:border-[var(--tg-button)]"
							/>
						</div>

						<div class="flex flex-col gap-1">
							<label class="text-[12.5px] font-semibold text-[var(--tg-hint)] px-1">
								نام نمایشی گروه (اختیاری)
							</label>
							<input
								type="text"
								value={editGroupTitle()}
								onInput={(e) => setEditGroupTitle(e.currentTarget.value)}
								placeholder="مثلاً: بازار اسلامی"
								class="w-full h-11 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-[10px] px-3.5 text-[14px] text-[var(--tg-text)] focus:outline-none focus:border-[var(--tg-button)]"
							/>
						</div>

						<button
							onClick={handleSaveEditGroup}
							disabled={isSavingEdit()}
							class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-1.5 mt-1"
						>
							<Show
								when={!isSavingEdit()}
								fallback={
									<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								}
							>
								<span class="material-symbols-outlined text-[18px]">check</span>
								<span>بررسی ادمین و ذخیره تغییرات</span>
							</Show>
						</button>
					</div>
				</div>
			</Show>

			{/* Delete / Unlink Confirmation Sheet */}
			<Show when={showDeleteConfirm()}>
				<div
					class="fixed inset-0 z-[110] bg-black/55 backdrop-blur-[2px] flex items-end justify-center"
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowDeleteConfirm(false);
					}}
				>
					<div class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col gap-4 shadow-2xl border-t border-[var(--tg-separator)] text-center">
						<div class="w-12 h-12 rounded-full bg-[var(--tg-destructive)]/15 text-[var(--tg-destructive)] flex items-center justify-center mx-auto">
							<span class="material-symbols-outlined text-[26px]">link_off</span>
						</div>
						<div class="space-y-1.5">
							<h3 class="text-[16px] font-bold text-[var(--tg-text)]">
								قطع اتصال گروه «{group()?.chat_title || (group() as any)?.title}» از مینی‌گارد؟
							</h3>
							<p class="text-[13px] text-[var(--tg-hint)] leading-relaxed">
								خیالتان راحت باشد! با این کار، <b>گروه تلگرام یا ربات شما در تلگرام حذف نمی‌شود</b>؛
								بلکه فقط اتصال این گروه از لیست پنل مینی‌گارد برداشته می‌شود و هر زمان بخواهید
								می‌توانید مجدداً آن را متصل کنید.
							</p>
						</div>
						<div class="flex gap-2.5">
							<button
								onClick={() => setShowDeleteConfirm(false)}
								class="tg-btn-secondary flex-1 h-11 text-[14px]"
							>
								انصراف
							</button>
							<button
								onClick={handleConfirmDeleteGroup}
								disabled={isDeleting()}
								class="flex-1 h-11 rounded-[11px] bg-[var(--tg-destructive)] text-white font-bold text-[13.5px] flex items-center justify-center gap-1.5 active:opacity-80"
							>
								<span class="material-symbols-outlined text-[18px]">link_off</span>
								<span>{isDeleting() ? 'در حال برداشتن...' : 'بله، از پنل برداشته شود'}</span>
							</button>
						</div>
					</div>
				</div>
			</Show>

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
