import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { type OwnerEntityItem, ownerApi } from '@/shared/api/owner.js';
import { haptic } from '@/shared/lib/haptic.js';

export const OwnerEntities: Component = () => {
	const [groups, setGroups] = createSignal<OwnerEntityItem[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal('');
	const [successMsg, setSuccessMsg] = createSignal('');
	const [busyId, setBusyId] = createSignal<string>('');

	// Manual Credit Form State
	const [manualTargetId, setManualTargetId] = createSignal('');
	const [manualDays, setManualDays] = createSignal(30);
	const [manualHours, setManualHours] = createSignal(0);
	const [manualReason, setManualReason] = createSignal('شارژ دستی توسط مالک پلتفرم');

	const fetchData = async () => {
		setLoading(true);
		setError('');
		try {
			const allEntities = await ownerApi.listEntities();
			const list = allEntities.filter((e) => e.type === 'group') || [];
			setGroups(list);
			if (!manualTargetId() && list.length > 0) {
				setManualTargetId(String(list[0].id));
			}
		} catch (e: any) {
			setError(e.response?.data?.error || 'خطا در دریافت لیست گروه‌های متصل');
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		fetchData();
	});

	const showFlashSuccess = (msg: string) => {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 4000);
	};

	const handleAddCredit = async (
		targetId: string | number,
		days: number,
		hours = 0,
		label = '',
	) => {
		if (!String(targetId).trim()) {
			setError('لطفاً شناسه گروه یا آیدی عددی کاربر را وارد کنید.');
			return;
		}
		haptic.impact('medium');
		setBusyId(String(targetId));
		setError('');
		try {
			const res = await ownerApi.addEntityCredit(
				targetId,
				days,
				manualReason() || 'Owner manual extension',
				hours,
			);
			haptic.notify('success');
			showFlashSuccess(
				`✅ اعتبار ${label || `#${targetId}`} با موفقیت بروزرسانی شد (${res.remaining_label || `${days} روز`}).`,
			);
			await fetchData();
		} catch (e: any) {
			haptic.notify('error');
			setError(e.response?.data?.error || 'خطا در اعمال اعتبار دستی');
		} finally {
			setBusyId('');
		}
	};

	const handleToggleStatus = async (entity: OwnerEntityItem) => {
		haptic.impact('medium');
		setBusyId(String(entity.id));
		setError('');
		const nextActive = entity.status !== 'active';
		try {
			await ownerApi.toggleEntityStatus(entity.id, nextActive);
			haptic.notify('success');
			showFlashSuccess(
				nextActive
					? `✅ گروه «${entity.title}» فعال شد.`
					: `⏸ گروه «${entity.title}» موقتاً تعلیق شد.`,
			);
			await fetchData();
		} catch {
			haptic.notify('error');
			setError('خطا در تغییر وضعیت گروه');
		} finally {
			setBusyId('');
		}
	};

	return (
		<div class="space-y-4">
			{/* Header */}
			<div class="tg-section p-4 flex items-center justify-between">
				<div class="flex flex-col">
					<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
						مدیریت گروه‌ها، بات‌ها و شارژ دستی اعتبار ({groups().length})
					</h2>
					<span class="text-[12px] text-[var(--tg-hint)]">
						افزودن یا کسر دستی اعتبار (روز/ساعت) برای هر گروه یا کاربر و مدیریت وضعیت بات‌ها
					</span>
				</div>
				<button
					onClick={() => {
						haptic.impact('light');
						fetchData();
					}}
					class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-semibold flex items-center gap-1"
				>
					<span class="material-symbols-outlined text-[16px]">refresh</span>
					<span>بروزرسانی</span>
				</button>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)] font-medium">
					{error()}
				</div>
			</Show>

			<Show when={successMsg()}>
				<div class="p-3.5 bg-[#34C759]/12 rounded-xl text-[13px] text-[#34C759] font-semibold">
					{successMsg()}
				</div>
			</Show>

			{/* Manual Credit Grant Box */}
			<div class="tg-section p-4 space-y-3.5">
				<div class="flex items-center justify-between">
					<span class="text-[14px] font-bold text-[var(--tg-text)]">
						➕ شارژ و تنظیم دستی اعتبار (گروه یا کاربر)
					</span>
					<span class="text-[11px] text-[var(--tg-hint)]">اعمال آنی در دیتابیس سرور</span>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div class="flex flex-col gap-1">
						<label class="text-[11px] text-[var(--tg-hint)] font-medium">
							انتخاب گروه یا ورود آیدی عددی کاربر/گروه
						</label>
						<div class="flex gap-1.5">
							<Show when={groups().length > 0}>
								<select
									value={manualTargetId()}
									onChange={(e) => setManualTargetId(e.currentTarget.value)}
									class="h-10 px-2.5 rounded-lg bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[12.5px] text-[var(--tg-text)] flex-1 outline-none"
								>
									<For each={groups()}>
										{(g) => (
											<option value={String(g.id)}>
												{g.title} ({g.remaining_label || `${g.credit_balance} روز`})
											</option>
										)}
									</For>
								</select>
							</Show>
							<input
								type="text"
								dir="ltr"
								value={manualTargetId()}
								onInput={(e) => setManualTargetId(e.currentTarget.value)}
								placeholder="Group ID / User ID"
								class="h-10 px-3 rounded-lg bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[12.5px] font-mono text-[var(--tg-text)] w-36 outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div class="flex flex-col gap-1">
							<label class="text-[11px] text-[var(--tg-hint)] font-medium">تعداد روز (+/-)</label>
							<input
								type="number"
								dir="ltr"
								value={manualDays()}
								onInput={(e) => setManualDays(Number(e.currentTarget.value) || 0)}
								class="h-10 px-3 rounded-lg bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[13px] font-mono font-bold text-[var(--tg-text)] outline-none"
							/>
						</div>
						<div class="flex flex-col gap-1">
							<label class="text-[11px] text-[var(--tg-hint)] font-medium">تعداد ساعت (+/-)</label>
							<input
								type="number"
								dir="ltr"
								value={manualHours()}
								onInput={(e) => setManualHours(Number(e.currentTarget.value) || 0)}
								class="h-10 px-3 rounded-lg bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[13px] font-mono font-bold text-[var(--tg-text)] outline-none"
							/>
						</div>
					</div>

					<div class="flex flex-col justify-end">
						<button
							type="button"
							disabled={busyId() !== ''}
							onClick={() =>
								handleAddCredit(manualTargetId(), manualDays(), manualHours(), manualTargetId())
							}
							class="tg-btn-primary h-10 px-4 text-[13px] font-bold flex items-center justify-center gap-1.5"
						>
							<span class="material-symbols-outlined text-[18px]">add_card</span>
							<span>اعمال اعتبار دستی</span>
						</button>
					</div>
				</div>

				{/* Quick Preset Chips */}
				<div class="flex flex-wrap items-center gap-1.5 pt-1">
					<span class="text-[11px] text-[var(--tg-hint)] ml-1">شارژ سریع:</span>
					{[
						{ label: '+۲۴ ساعت', d: 0, h: 24 },
						{ label: '+۳ روز', d: 3, h: 0 },
						{ label: '+۷ روز', d: 7, h: 0 },
						{ label: '+۳۰ روز (۱ ماه)', d: 30, h: 0 },
						{ label: '+۹۰ روز (۳ ماه)', d: 90, h: 0 },
						{ label: '+۳۶۵ روز (۱ سال)', d: 365, h: 0 },
						{ label: 'کسر ۱ روز (-۱)', d: -1, h: 0 },
					].map((preset) => (
						<button
							type="button"
							onClick={() => {
								setManualDays(preset.d);
								setManualHours(preset.h);
							}}
							class="px-2.5 py-1 rounded-lg bg-[var(--tg-secondary-bg)] hover:bg-[var(--tg-accent-soft)] text-[11.5px] font-semibold text-[var(--tg-link)] border border-[var(--tg-separator)] transition-colors"
						>
							{preset.label}
						</button>
					))}
				</div>
			</div>

			{/* Connected Groups List */}
			<Show when={!loading()}>
				<div class="tg-section divide-y divide-[var(--tg-separator)]">
					<For
						each={groups()}
						fallback={
							<div class="p-6 text-center text-[13px] text-[var(--tg-hint)]">
								هیچ گروهی ثبت نشده است.
							</div>
						}
					>
						{(gr) => (
							<div class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-11 h-11 rounded-full bg-[var(--tg-button)] flex items-center justify-center text-white font-bold text-[16px] shrink-0">
										{gr.title?.trim()?.[0]?.toUpperCase() || 'G'}
									</div>
									<div class="flex flex-col min-w-0 gap-0.5">
										<div class="flex items-center gap-2 flex-wrap">
											<span class="text-[15px] font-bold text-[var(--tg-text)] truncate">
												{gr.title}
											</span>
											<span
												class={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
													gr.status === 'active'
														? 'text-[#34C759] bg-[#34C759]/12'
														: 'text-[var(--tg-destructive)] bg-[var(--tg-destructive)]/12'
												}`}
											>
												{gr.status === 'active'
													? gr.subscription_status === 'paid'
														? '🌟 اشتراک ویژه'
														: '⏱ تست آزمایشی'
													: '⛔ منقضی / معلق'}
											</span>
											<span class="text-[11.5px] font-bold text-[#FF9500] bg-[#FF9500]/12 px-2 py-0.5 rounded-md">
												⏳ {gr.remaining_label || `${gr.credit_balance} روز مانده`}
											</span>
										</div>
										<span dir="ltr" class="text-[12px] text-[var(--tg-hint)] font-mono truncate">
											Chat ID: {gr.telegram_id} • Bot: @{gr.bot_username || 'MiniGuardBot'} • Owner: #
											{gr.owner_id} • 👥 {gr.members_count || 1}
										</span>
									</div>
								</div>

								<div class="flex flex-wrap items-center gap-1.5 shrink-0">
									<button
										disabled={busyId() === String(gr.id)}
										onClick={() => handleAddCredit(gr.id, 1, 0, gr.title)}
										class="h-8 px-2.5 rounded-lg bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[11.5px] font-semibold"
									>
										+۱ روز
									</button>
									<button
										disabled={busyId() === String(gr.id)}
										onClick={() => handleAddCredit(gr.id, 7, 0, gr.title)}
										class="h-8 px-2.5 rounded-lg bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[11.5px] font-semibold"
									>
										+۷ روز
									</button>
									<button
										disabled={busyId() === String(gr.id)}
										onClick={() => handleAddCredit(gr.id, 30, 0, gr.title)}
										class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-bold"
									>
										+۳۰ روز اعتبار
									</button>
									<button
										disabled={busyId() === String(gr.id)}
										onClick={() => handleToggleStatus(gr)}
										class={`h-8 px-2.5 rounded-lg text-[11.5px] font-semibold ${
											gr.status === 'active'
												? 'bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)]'
												: 'bg-[#34C759]/12 text-[#34C759]'
										}`}
									>
										{gr.status === 'active' ? 'تعلیق' : 'فعال‌سازی'}
									</button>
								</div>
							</div>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
};
export const OwnerEntitiesPage = OwnerEntities;
