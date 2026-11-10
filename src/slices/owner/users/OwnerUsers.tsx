import { type Component, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { ownerApi, type SearchedUser } from '@/shared/api/owner.js';
import { haptic } from '@/shared/lib/haptic.js';

export const OwnerUsers: Component = () => {
	const [query, setQuery] = createSignal('');
	const [users, setUsers] = createSignal<SearchedUser[]>([]);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal('');
	const [successMsg, setSuccessMsg] = createSignal('');
	const [busyUserId, setBusyUserId] = createSignal<number | null>(null);
	const [activeFilter, setActiveFilter] = createSignal<'all' | 'premium' | 'flagged' | 'banned'>(
		'all',
	);

	let searchDebounceTimer: any;
	let searchAbortController: AbortController | null = null;

	const showFlash = (msg: string) => {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 4000);
	};

	const executeSearch = async (searchStr: string) => {
		const targetQuery = searchStr.trim() || '*';
		if (searchAbortController) {
			searchAbortController.abort();
		}
		searchAbortController = new AbortController();
		const signal = searchAbortController.signal;

		setError('');
		setLoading(true);

		try {
			const data = await ownerApi.searchUsers(targetQuery, { signal });
			if (signal.aborted) return;
			setUsers(data || []);
		} catch (err: any) {
			if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
				return;
			}
			setError(err.response?.data?.error || 'خطا در دریافت لیست مدیران گروه');
		} finally {
			if (!signal.aborted) {
				setLoading(false);
			}
		}
	};

	onMount(() => {
		executeSearch('*');
	});

	onCleanup(() => {
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		if (searchAbortController) searchAbortController.abort();
	});

	const handleSearchInput = (value: string) => {
		setQuery(value);
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		if (!value.trim()) {
			executeSearch('*');
			return;
		}
		searchDebounceTimer = setTimeout(() => {
			executeSearch(value.trim());
		}, 300);
	};

	const handleAddUserCredit = async (user: SearchedUser, days: number) => {
		haptic.impact('medium');
		setBusyUserId(user.telegram_id);
		setError('');
		try {
			const res = await ownerApi.addEntityCredit(
				user.telegram_id,
				days,
				`شارژ دستی حساب مدیر #${user.telegram_id}`,
				0,
				'add',
			);
			haptic.notify('success');
			showFlash(
				`✅ ${days} روز اعتبار به گروه‌های «${user.first_name || user.telegram_id}» اضافه شد (${res.remaining_label || `${days} روز`}).`,
			);
			await executeSearch(query() || '*');
		} catch (e: any) {
			haptic.notify('error');
			setError(e.response?.data?.error || 'خطا در افزودن اعتبار به کاربر');
		} finally {
			setBusyUserId(null);
		}
	};

	const handleToggleBan = async (user: SearchedUser) => {
		haptic.impact('medium');
		setBusyUserId(user.telegram_id);
		setError('');
		try {
			if (user.is_banned) {
				await ownerApi.unbanUser(user.telegram_id);
				showFlash(`✅ مسدودیت حساب #${user.telegram_id} برطرف شد.`);
			} else {
				await ownerApi.banUser(user.telegram_id, 'full', 'مسدودسازی توسط مالک پلتفرم', 0);
				showFlash(`🚫 حساب #${user.telegram_id} مسدود شد.`);
			}
			haptic.notify('success');
			await executeSearch(query() || '*');
		} catch {
			haptic.notify('error');
			setError('خطا در تغییر وضعیت مسدودیت کاربر');
		} finally {
			setBusyUserId(null);
		}
	};

	const handleToggleFlag = async (user: SearchedUser) => {
		haptic.impact('light');
		setBusyUserId(user.telegram_id);
		setError('');
		try {
			const nextFlag = !user.is_flagged;
			await ownerApi.flagUser(
				user.telegram_id,
				nextFlag,
				nextFlag ? 'نشان‌گذاری جهت بررسی' : '',
			);
			haptic.notify('success');
			showFlash(
				nextFlag
					? `🚩 حساب #${user.telegram_id} نشان‌دار شد.`
					: `✅ نشان حساب #${user.telegram_id} حذف شد.`,
			);
			await executeSearch(query() || '*');
		} catch {
			haptic.notify('error');
		} finally {
			setBusyUserId(null);
		}
	};

	const handleImpersonate = async (user: SearchedUser) => {
		haptic.impact('medium');
		setBusyUserId(user.telegram_id);
		try {
			const res = await ownerApi.impersonateUser(user.telegram_id);
			const token = res.token || res.access_token;
			if (token) {
				sessionStorage.setItem('owner_impersonation_token', token);
				sessionStorage.setItem(
					'owner_impersonation_expires_at',
					String(Date.now() + 3600 * 1000),
				);
				sessionStorage.setItem('impersonated_user_id', String(user.telegram_id));
				sessionStorage.setItem(
					'impersonated_username',
					user.username || String(user.telegram_id),
				);
				if (user.first_name) sessionStorage.setItem('impersonated_first_name', user.first_name);
				if (user.last_name) sessionStorage.setItem('impersonated_last_name', user.last_name);
				window.location.href = `${window.location.pathname}#/`;
				window.location.reload();
			}
		} catch {
			haptic.notify('error');
			setError('خطا در ورود پشتیبانی به پنل کاربر');
		} finally {
			setBusyUserId(null);
		}
	};

	const filteredUsers = () => {
		const filter = activeFilter();
		return users().filter((u) => {
			if (filter === 'premium') return u.is_premium;
			if (filter === 'flagged') return u.is_flagged;
			if (filter === 'banned') return u.is_banned;
			return true;
		});
	};

	return (
		<div class="space-y-4">
			{/* Search Box & Filter Pills */}
			<div class="tg-section p-4 space-y-3.5">
				<div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
					<div>
						<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
							مدیریت مدیران گروه و صاحبان بات ({users().length})
						</h2>
						<p class="text-[12px] text-[var(--tg-hint)] mt-0.5">
							مشاهده بات‌های متصل هر مدیر، شارژ مستقیم اعتبار و مدیریت دسترسی
						</p>
					</div>

					<div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
						<button
							onClick={() => setActiveFilter('all')}
							class={`px-3 py-1 rounded-lg text-[11.5px] font-semibold shrink-0 transition-all ${
								activeFilter() === 'all'
									? 'bg-[var(--tg-button)] text-white'
									: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-hint)]'
							}`}
						>
							همه ({users().length})
						</button>
						<button
							onClick={() => setActiveFilter('premium')}
							class={`px-3 py-1 rounded-lg text-[11.5px] font-semibold shrink-0 transition-all ${
								activeFilter() === 'premium'
									? 'bg-[#34C759] text-white'
									: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-hint)]'
							}`}
						>
							اشتراک فعال
						</button>
						<button
							onClick={() => setActiveFilter('flagged')}
							class={`px-3 py-1 rounded-lg text-[11.5px] font-semibold shrink-0 transition-all ${
								activeFilter() === 'flagged'
									? 'bg-[#FF9500] text-white'
									: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-hint)]'
							}`}
						>
							نشان‌دار
						</button>
						<button
							onClick={() => setActiveFilter('banned')}
							class={`px-3 py-1 rounded-lg text-[11.5px] font-semibold shrink-0 transition-all ${
								activeFilter() === 'banned'
									? 'bg-[var(--tg-destructive)] text-white'
									: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-hint)]'
							}`}
						>
							مسدود
						</button>
					</div>
				</div>

				<div class="flex gap-2">
					<div class="flex-1 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3.5 flex items-center gap-2">
						<span class="material-symbols-outlined text-[var(--tg-hint)] text-[19px]">search</span>
						<input
							type="text"
							placeholder="جستجو بر اساس نام، @username یا آیدی عددی تلگرام..."
							value={query()}
							onInput={(e) => handleSearchInput(e.currentTarget.value)}
							class="w-full h-10 bg-transparent text-[13px] text-[var(--tg-text)] placeholder-[var(--tg-hint)] focus:outline-none"
						/>
					</div>
					<button
						onClick={() => executeSearch(query() || '*')}
						disabled={loading()}
						class="h-10 px-4 tg-btn-primary text-[12.5px] font-bold shrink-0"
					>
						بروزرسانی
					</button>
				</div>
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

			<Show when={loading()}>
				<div class="tg-section p-8 flex flex-col items-center justify-center gap-2">
					<div class="w-6 h-6 border-2 border-[var(--tg-button)] border-t-transparent rounded-full animate-spin" />
					<span class="text-[12.5px] text-[var(--tg-hint)]">در حال دریافت لیست مدیران...</span>
				</div>
			</Show>

			<Show when={!loading()}>
				<div class="space-y-3">
					<For
						each={filteredUsers()}
						fallback={
							<div class="tg-section p-8 text-center text-[13px] text-[var(--tg-hint)]">
								کاربری با این مشخصات یافت نشد.
							</div>
						}
					>
						{(user) => {
							const isBusy = () => busyUserId() === user.telegram_id;
							return (
								<div class="tg-section p-4 space-y-3">
									{/* User Header */}
									<div class="flex items-start justify-between gap-3">
										<div class="flex items-center gap-3 min-w-0">
											<div class="w-11 h-11 rounded-full bg-[var(--tg-button)] flex items-center justify-center text-white font-bold text-[16px] shrink-0">
												{(user.first_name || 'U').trim()[0]?.toUpperCase()}
											</div>
											<div class="flex flex-col min-w-0">
												<div class="flex items-center gap-1.5 flex-wrap">
													<h3 class="text-[14.5px] font-bold text-[var(--tg-text)] truncate">
														{user.first_name} {user.last_name}
													</h3>
													<span class="px-2 py-0.5 rounded-md bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[10.5px] font-bold">
														{user.role_label || '🛡️ مدیر گروه'}
													</span>
												</div>
												<div class="flex items-center gap-2.5 text-[12px] mt-0.5">
													<Show when={user.username}>
														<span dir="ltr" class="text-[var(--tg-link)] font-mono">
															@{user.username}
														</span>
													</Show>
													<span dir="ltr" class="text-[var(--tg-hint)] font-mono">
														ID: {user.telegram_id}
													</span>
												</div>
											</div>
										</div>

										<div class="flex flex-col items-end gap-1 shrink-0">
											<Show when={user.is_premium}>
												<span class="px-2 py-0.5 rounded-md bg-[#34C759]/12 text-[10.5px] font-bold text-[#34C759]">
													🟢 اشتراک فعال
												</span>
											</Show>
											<Show when={user.is_flagged}>
												<span class="px-2 py-0.5 rounded-md bg-[#FF9500]/12 text-[10.5px] font-bold text-[#FF9500]">
													🚩 نشان‌دار
												</span>
											</Show>
											<Show when={user.is_banned}>
												<span class="px-2 py-0.5 rounded-md bg-[var(--tg-destructive)]/12 text-[10.5px] font-bold text-[var(--tg-destructive)]">
													🚫 مسدود
												</span>
											</Show>
										</div>
									</div>

									{/* Connected Bots & Groups of this User */}
									<Show when={user.bots_list && user.bots_list.length > 0}>
										<div class="p-3 rounded-xl bg-[var(--tg-secondary-bg)] space-y-2">
											<span class="text-[11px] font-bold text-[var(--tg-hint)] block">
												بات‌ها و گروه‌های تحت مدیریت ({user.bots_list?.length}):
											</span>
											<For each={user.bots_list}>
												{(b) => (
													<div class="flex items-center justify-between gap-2 text-[12px]">
														<div class="flex items-center gap-1.5 min-w-0">
															<span class="font-bold text-[var(--tg-text)] truncate">
																{b.group_title}
															</span>
															<span dir="ltr" class="text-[var(--tg-link)] font-mono text-[11px]">
																(@{b.username})
															</span>
														</div>
														<span class="text-[11px] font-bold text-[#FF9500] shrink-0">
															⏳ {b.remaining_label}
														</span>
													</div>
												)}
											</For>
										</div>
									</Show>

									{/* Action Buttons */}
									<div class="pt-2 border-t border-[var(--tg-separator)] flex items-center gap-2 flex-wrap">
										<button
											disabled={isBusy()}
											onClick={() => handleAddUserCredit(user, 7)}
											class="h-8 px-2.5 rounded-lg bg-[#34C759]/12 text-[#34C759] text-[11.5px] font-bold flex items-center gap-1"
										>
											<span>+۷ روز</span>
										</button>

										<button
											disabled={isBusy()}
											onClick={() => handleAddUserCredit(user, 30)}
											class="h-8 px-3 rounded-lg bg-[#34C759]/12 text-[#34C759] text-[11.5px] font-bold flex items-center gap-1"
										>
											<span class="material-symbols-outlined text-[15px]">add_card</span>
											<span>+۳۰ روز اعتبار</span>
										</button>

										<button
											disabled={isBusy()}
											onClick={() => handleImpersonate(user)}
											class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[11.5px] font-semibold flex items-center gap-1"
										>
											<span class="material-symbols-outlined text-[15px]">visibility</span>
											<span>ورود به پنل کاربر</span>
										</button>

										<button
											disabled={isBusy()}
											onClick={() => handleToggleFlag(user)}
											class="h-8 px-2.5 rounded-lg bg-[#FF9500]/12 text-[#FF9500] text-[11.5px] font-semibold flex items-center gap-1"
										>
											<span class="material-symbols-outlined text-[15px]">flag</span>
											<span>{user.is_flagged ? 'حذف نشان' : 'نشان'}</span>
										</button>

										<Show when={user.telegram_id !== 5076130392}>
											<button
												disabled={isBusy()}
												onClick={() => handleToggleBan(user)}
												class={`h-8 px-2.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1 ${
													user.is_banned
														? 'bg-[#34C759]/12 text-[#34C759]'
														: 'bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)]'
												}`}
											>
												<span class="material-symbols-outlined text-[15px]">
													{user.is_banned ? 'lock_open' : 'block'}
												</span>
												<span>{user.is_banned ? 'رفع مسدودیت' : 'مسدودسازی'}</span>
											</button>
										</Show>
									</div>
								</div>
							);
						}}
					</For>
				</div>
			</Show>
		</div>
	);
};
export const OwnerUsersPage = OwnerUsers;
