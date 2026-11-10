import { type Component, createSignal, onMount, Show } from 'solid-js';
import { ownerApi, type SystemSettings } from '@/shared/api/owner.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { haptic } from '@/shared/lib/haptic.js';
import { DangerActionDialog } from '@/widgets/owner/DangerActionDialog.js';

export const OwnerSettings: Component = () => {
	const txt = () => uiText();
	const [initialSettings, setInitialSettings] = createSignal<SystemSettings | null>(null);
	const [settings, setSettings] = createSignal<SystemSettings | null>(null);
	const [loading, setLoading] = createSignal(true);
	const [saving, setSaving] = createSignal(false);
	const [error, setError] = createSignal('');
	const [successMsg, setSuccessMsg] = createSignal('');
	const [showConfirmDialog, setShowConfirmDialog] = createSignal(false);

	const fetchSettings = async () => {
		setLoading(true);
		setError('');
		try {
			const data = await ownerApi.getSettings();
			const normalized: SystemSettings = {
				maintenance_mode: data?.maintenance_mode ?? false,
				trial_hours: data?.trial_hours ?? 24,
				monthly_stars_price: data?.monthly_stars_price ?? 100,
				max_bots_per_admin: data?.max_bots_per_admin ?? 20,
				master_start_text: data?.master_start_text || txt().masterStartPreviewBody,
				child_start_text: data?.child_start_text || txt().childStartPreviewBody,
				onboarding_msg_1: data?.onboarding_msg_1 || txt().joinMsg1,
				onboarding_msg_2: data?.onboarding_msg_2 || txt().joinMsg2,
				onboarding_msg_3: data?.onboarding_msg_3 || txt().joinMsg3,
				onboarding_msg_4: data?.onboarding_msg_4 || txt().joinMsg4,
			};
			setInitialSettings(JSON.parse(JSON.stringify(normalized)));
			setSettings(normalized);
		} catch (e: any) {
			setError(e.response?.data?.error || 'خطا در دریافت تنظیمات پلتفرم');
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		fetchSettings();
	});

	const isDirty = () => {
		if (!initialSettings() || !settings()) return false;
		return JSON.stringify(initialSettings()) !== JSON.stringify(settings());
	};

	const handleSaveInitiate = (e: Event) => {
		e.preventDefault();
		if (!settings()) return;
		executeSave('بروزرسانی پارامترهای اشتراک و متون پلتفرم');
	};

	const executeSave = async (_reason: string) => {
		const s = settings();
		if (!s) return;

		setSaving(true);
		setError('');
		setSuccessMsg('');

		try {
			const updated = await ownerApi.updateSettings(s);
			setInitialSettings(JSON.parse(JSON.stringify(updated)));
			setSettings(updated);
			setSuccessMsg('تنظیمات پلتفرم MiniGuard با موفقیت ذخیره شد.');
			setShowConfirmDialog(false);
			haptic.notify('success');
			setTimeout(() => setSuccessMsg(''), 4000);
		} catch (e: any) {
			setError(e.response?.data?.error || 'خطا در ذخیره‌سازی تنظیمات');
			haptic.notify('error');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div class="space-y-4">
			<div class="tg-section p-4">
				<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
					تنظیمات کلی پلتفرم مدیریت گروه MiniGuard
				</h2>
				<p class="text-[12px] text-[var(--tg-hint)] mt-0.5">
					مدیریت حالت تعمیرات، دوره تست رایگان (۲۴ ساعت) و تعرفه اشتراک ماهانه استارز (۱۰۰ ⭐)
				</p>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)]">
					{error()}
				</div>
			</Show>

			<Show when={successMsg()}>
				<div class="p-3.5 bg-[#34C759]/12 rounded-xl text-[13px] text-[#34C759] font-semibold">
					{successMsg()}
				</div>
			</Show>

			<Show when={!loading() && settings()}>
				<form onSubmit={handleSaveInitiate} class="space-y-4">
					<div class="tg-section p-4 flex items-center justify-between gap-4">
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<h3 class="text-[14px] font-bold text-[var(--tg-text)]">
									حالت تعمیرات پلتفرم (Maintenance Mode)
								</h3>
								<Show when={settings()?.maintenance_mode}>
									<span class="px-2 py-0.5 rounded-md bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)] text-[10.5px] font-bold">
										فعال
									</span>
								</Show>
							</div>
							<p class="text-[12px] text-[var(--tg-hint)] leading-relaxed">
								در صورت فعال‌سازی، ساخت ربات جدید موقتاً متوقف می‌شود اما فایروال ربات‌های فعال به کار
								خود ادامه می‌دهد.
							</p>
						</div>

						<input
							type="checkbox"
							checked={settings()?.maintenance_mode || false}
							onChange={(e) =>
								setSettings((s) => ({ ...s!, maintenance_mode: e.currentTarget.checked }))
							}
							class="w-5 h-5 accent-[var(--tg-button)] shrink-0"
						/>
					</div>

					<div class="tg-section p-4 space-y-4">
						<h3 class="text-[14px] font-bold text-[var(--tg-text)] border-b border-[var(--tg-separator)] pb-2.5">
							تعرفه اشتراک و سهمیه ربات‌های اختصاصی گروه
						</h3>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label class="block text-[12px] font-semibold text-[var(--tg-hint)] mb-1.5">
									مدت تست رایگان هر گروه (ساعت)
								</label>
								<input
									type="number"
									min="1"
									max="168"
									value={settings()?.trial_hours ?? 24}
									onInput={(e) =>
										setSettings((s) => ({
											...s!,
											trial_hours: parseInt(e.currentTarget.value, 10) || 24,
										}))
									}
									class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3.5 text-[14px] text-[var(--tg-text)] font-mono focus:border-[var(--tg-button)] outline-none"
									dir="ltr"
								/>
							</div>

							<div>
								<label class="block text-[12px] font-semibold text-[var(--tg-hint)] mb-1.5">
									تعرفه اشتراک ماهانه (Telegram Stars ⭐)
								</label>
								<input
									type="number"
									min="1"
									value={settings()?.monthly_stars_price ?? 100}
									onInput={(e) =>
										setSettings((s) => ({
											...s!,
											monthly_stars_price: parseInt(e.currentTarget.value, 10) || 100,
										}))
									}
									class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3.5 text-[14px] text-[var(--tg-text)] font-mono focus:border-[var(--tg-button)] outline-none"
									dir="ltr"
								/>
							</div>

							<div>
								<label class="block text-[12px] font-semibold text-[var(--tg-hint)] mb-1.5">
									حداکثر ربات اختصاصی به ازای هر مدیر
								</label>
								<input
									type="number"
									min="1"
									max="100"
									value={settings()?.max_bots_per_admin ?? 20}
									onInput={(e) =>
										setSettings((s) => ({
											...s!,
											max_bots_per_admin: parseInt(e.currentTarget.value, 10) || 20,
										}))
									}
									class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3.5 text-[14px] text-[var(--tg-text)] font-mono focus:border-[var(--tg-button)] outline-none"
									dir="ltr"
								/>
							</div>
						</div>
					</div>

					{/* Platform-Wide Bot Texts (Moved from User Custom Texts to Owner Panel) */}
					<div class="tg-section p-4 space-y-4">
						<div class="border-b border-[var(--tg-separator)] pb-2.5 flex items-center justify-between gap-2">
							<div>
								<h3 class="text-[14px] font-bold text-[var(--tg-text)]">
									{txt().botHiddenFlowsTitle} (مخصوص مالک کل پلتفرم)
								</h3>
								<p class="text-[11.5px] text-[var(--tg-hint)] mt-0.5">
									تنظیم متن استارت ربات مادر (@MiniGuardBot)، متن معرفی در پیوی ربات‌های ساخته شده و ۴ پیام
									خودکار هنگام عضویت ربات در گروه
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									haptic.impact('light');
									setSettings((s) => ({
										...s!,
										master_start_text: txt().masterStartPreviewBody,
										child_start_text: txt().childStartPreviewBody,
										onboarding_msg_1: txt().joinMsg1,
										onboarding_msg_2: txt().joinMsg2,
										onboarding_msg_3: txt().joinMsg3,
										onboarding_msg_4: txt().joinMsg4,
									}));
								}}
								class="h-8 px-2.5 rounded-lg bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[11px] font-semibold text-[var(--tg-link)] shrink-0"
							>
								متن پیش‌فرض
							</button>
						</div>

						<div class="space-y-3">
							<div>
								<label class="block text-[12.5px] font-bold text-[var(--tg-text)] mb-1.5 flex items-center gap-1.5">
									<span class="material-symbols-outlined text-[17px] text-[#F59E0B]">verified</span>
									<span>{txt().masterStartPreviewTitle}</span>
								</label>
								<textarea
									rows={4}
									value={settings()?.master_start_text || ''}
									onInput={(e) =>
										setSettings((s) => ({ ...s!, master_start_text: e.currentTarget.value }))
									}
									class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl p-3 text-[12.5px] text-[var(--tg-text)] leading-relaxed focus:border-[var(--tg-button)] outline-none resize-none"
								/>
							</div>

							<div>
								<label class="block text-[12.5px] font-bold text-[var(--tg-text)] mb-1.5 flex items-center gap-1.5">
									<span class="material-symbols-outlined text-[17px] text-[var(--tg-button)]">
										smart_toy
									</span>
									<span>{txt().childStartPreviewTitle}</span>
								</label>
								<textarea
									rows={4}
									value={settings()?.child_start_text || ''}
									onInput={(e) =>
										setSettings((s) => ({ ...s!, child_start_text: e.currentTarget.value }))
									}
									class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl p-3 text-[12.5px] text-[var(--tg-text)] leading-relaxed focus:border-[var(--tg-button)] outline-none resize-none"
								/>
							</div>

							<div class="space-y-2 pt-1">
								<label class="block text-[12.5px] font-bold text-[var(--tg-text)] flex items-center gap-1.5">
									<span class="material-symbols-outlined text-[17px] text-[#34C759]">
										playlist_add_check_circle
									</span>
									<span>{txt().join4MsgsTitle}</span>
								</label>
								<div class="grid grid-cols-1 gap-2">
									<input
										type="text"
										value={settings()?.onboarding_msg_1 || ''}
										onInput={(e) =>
											setSettings((s) => ({ ...s!, onboarding_msg_1: e.currentTarget.value }))
										}
										class="w-full h-9 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3 text-[12px] text-[var(--tg-text)] focus:border-[var(--tg-button)] outline-none"
									/>
									<input
										type="text"
										value={settings()?.onboarding_msg_2 || ''}
										onInput={(e) =>
											setSettings((s) => ({ ...s!, onboarding_msg_2: e.currentTarget.value }))
										}
										class="w-full h-9 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3 text-[12px] text-[var(--tg-text)] focus:border-[var(--tg-button)] outline-none"
									/>
									<input
										type="text"
										value={settings()?.onboarding_msg_3 || ''}
										onInput={(e) =>
											setSettings((s) => ({ ...s!, onboarding_msg_3: e.currentTarget.value }))
										}
										class="w-full h-9 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3 text-[12px] text-[var(--tg-text)] focus:border-[var(--tg-button)] outline-none"
									/>
									<input
										type="text"
										value={settings()?.onboarding_msg_4 || ''}
										onInput={(e) =>
											setSettings((s) => ({ ...s!, onboarding_msg_4: e.currentTarget.value }))
										}
										class="w-full h-9 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3 text-[12px] text-[var(--tg-text)] focus:border-[var(--tg-button)] outline-none"
									/>
								</div>
							</div>
						</div>
					</div>

					<div class="flex justify-end">
						<button
							type="submit"
							disabled={saving()}
							class="tg-btn-primary h-11 px-6 text-[13.5px] font-bold disabled:opacity-40 flex items-center gap-1.5 w-full md:w-auto justify-center"
						>
							<span class="material-symbols-outlined text-[18px]">save</span>
							<span>{saving() ? 'در حال ذخیره...' : 'ذخیره تنظیمات پلتفرم'}</span>
						</button>
					</div>
				</form>
			</Show>

			<Show when={showConfirmDialog()}>
				<DangerActionDialog
					isOpen={true}
					title="تغییر وضعیت حالت تعمیرات"
					description="آیا از تغییر وضعیت حالت تعمیرات پلتفرم MiniGuard اطمینان دارید؟"
					actionLabel="اعمال تغییرات"
					confirmWord="MAINTENANCE"
					riskLevel="critical"
					details={[
						{
							label: 'حالت تعمیرات',
							before: initialSettings()?.maintenance_mode ? 'فعال' : 'غیرفعال',
							after: settings()?.maintenance_mode ? 'فعال' : 'غیرفعال',
						},
					]}
					onConfirm={executeSave}
					onClose={() => setShowConfirmDialog(false)}
				/>
			</Show>
		</div>
	);
};
export const OwnerSettingsPage = OwnerSettings;
