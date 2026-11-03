import { type Component, createSignal, For, Show } from 'solid-js';
import { ownerApi, type SearchedUser } from '@/shared/api/owner.js';
import { haptic } from '@/shared/lib/haptic.js';
import { DangerActionDialog } from '@/widgets/owner/DangerActionDialog.js';

export const OwnerUsers: Component = () => {
	const [query, setQuery] = createSignal('');
	const [users, setUsers] = createSignal<SearchedUser[]>([]);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal('');
	const [activeFilter, setActiveFilter] = createSignal<'all' | 'premium' | 'flagged' | 'banned'>(
		'all',
	);

	const [selectedUser, setSelectedUser] = createSignal<SearchedUser | null>(null);
	const [actionType, setActionType] = createSignal<'ban' | 'unban' | 'flag' | 'impersonate' | null>(
		null,
	);

	const [actionStep, setActionStep] = createSignal<'form' | 'confirm'>('confirm');
	const [banType, setBanType] = createSignal('full');
	const [banDuration, setBanDuration] = createSignal(86400);
	const [isFlaggedStatus, setIsFlaggedStatus] = createSignal(false);
	const [actionLoading, setActionLoading] = createSignal(false);

	let searchDebounceTimer: any;

	const handleSearchInput = (value: string) => {
		setQuery(value);
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		if (!value.trim()) {
			setUsers([]);
			setError('');
			return;
		}

		searchDebounceTimer = setTimeout(() => {
			executeSearch(value.trim());
		}, 300);
	};

	const executeSearch = async (searchStr: string) => {
		if (!searchStr) return;
		setError('');
		setLoading(true);

		try {
			const data = await ownerApi.searchUsers(searchStr);
			setUsers(data || []);
			if (!data || data.length === 0) {
				setError('هیچ مدیر گروهی با شناسه یا مشخصات وارد شده پیدا نشد.');
			}
		} catch (err: any) {
			setError(err.response?.data?.error || 'خطا در برقراری ارتباط با دیتابیس مدیران گروه.');
			try {
				haptic.notify('error');
			} catch {}
		} finally {
			setLoading(false);
		}
	};

	const openBanModal = (user: SearchedUser) => {
		setSelectedUser(user);
		setBanType('full');
		setBanDuration(86400);
		setActionStep('form');
		setActionType('ban');
	};

	const openUnbanModal = (user: SearchedUser) => {
		setSelectedUser(user);
		setActionStep('confirm');
		setActionType('unban');
	};

	const openFlagModal = (user: SearchedUser) => {
		setSelectedUser(user);
		setIsFlaggedStatus(!user.is_flagged);
		setActionStep('confirm');
		setActionType('flag');
	};

	const openImpersonateModal = (user: SearchedUser) => {
		setSelectedUser(user);
		setActionStep('confirm');
		setActionType('impersonate');
	};

	const closeActionModal = () => {
		setSelectedUser(null);
		setActionType(null);
		setActionStep('confirm');
	};

	const handleConfirmedAction = async (reason: string) => {
		const user = selectedUser();
		const currentAction = actionType();
		if (!user || !currentAction) return;

		setActionLoading(true);
		try {
			if (currentAction === 'ban') {
				const res = await ownerApi.banUser(user.telegram_id, banType(), reason, banDuration());
				if (res.success) {
					setUsers(
						users().map((u) =>
							u.telegram_id === user.telegram_id
								? { ...u, is_banned: true, ban_reason: reason }
								: u,
						),
					);
					haptic.notify('success');
				}
			} else if (currentAction === 'unban') {
				const res = await ownerApi.unbanUser(user.telegram_id);
				if (res.success) {
					setUsers(
						users().map((u) =>
							u.telegram_id === user.telegram_id
								? { ...u, is_banned: false, ban_reason: undefined }
								: u,
						),
					);
					haptic.notify('success');
				}
			} else if (currentAction === 'flag') {
				const res = await ownerApi.flagUser(user.telegram_id, isFlaggedStatus(), reason);
				if (res.success) {
					setUsers(
						users().map((u) =>
							u.telegram_id === user.telegram_id
								? { ...u, is_flagged: isFlaggedStatus(), fraud_reason: reason }
								: u,
						),
					);
					haptic.notify('success');
				}
			} else if (currentAction === 'impersonate') {
				const res = await ownerApi.impersonateUser(user.telegram_id);
				if (res.token) {
					sessionStorage.setItem('owner_impersonation_token', res.token);
					sessionStorage.setItem('impersonated_user_id', String(user.telegram_id));
					sessionStorage.setItem(
						'impersonated_username',
						user.username || String(user.telegram_id),
					);
					if (user.first_name) sessionStorage.setItem('impersonated_first_name', user.first_name);
					if (user.last_name) sessionStorage.setItem('impersonated_last_name', user.last_name);
					window.location.href = `${window.location.pathname}#/`;
					window.location.reload();
					return;
				}
			}
			closeActionModal();
		} catch (err: any) {
			setError(err.response?.data?.error || 'عملیات با خطا مواجه شد.');
			try {
				haptic.notify('error');
			} catch {}
		} finally {
			setActionLoading(false);
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

	const getDialogProps = () => {
		const user = selectedUser();
		const type = actionType();
		if (!user || !type || actionStep() !== 'confirm') return null;

		if (type === 'ban') {
			return {
				title: 'مسدودسازی دسترسی مدیر گروه (Ban)',
				description: `قطع دسترسی مدیر @${user.username || user.telegram_id} به پنل مدیریت ربات‌های گروه در MiniGuard.`,
				actionLabel: 'اعمال مسدودیت',
				confirmWord: 'BAN',
				riskLevel: 'critical' as const,
				details: [
					{ label: 'شناسه تلگرام', value: user.telegram_id },
					{
						label: 'نوع مسدودی',
						value: banType() === 'full' ? 'کامل (پنل و ربات‌ها)' : 'محدودیت ساخت ربات جدید',
					},
					{
						label: 'مدت زمان',
						value: banDuration() === 0 ? 'دائمی' : `${banDuration() / 3600} ساعت`,
					},
				],
			};
		}

		if (type === 'unban') {
			return {
				title: 'رفع مسدودیت مدیر گروه (Unban)',
				description: `رفع تمامی محدودیت‌های حساب مدیر @${user.username || user.telegram_id}.`,
				actionLabel: 'رفع مسدودیت',
				riskLevel: 'medium' as const,
				details: [{ label: 'شناسه تلگرام', value: user.telegram_id }],
			};
		}

		if (type === 'flag') {
			return {
				title: isFlaggedStatus() ? 'نشانگذاری به عنوان مشکوک' : 'حذف وضعیت مشکوک',
				description: `تغییر وضعیت نظارت امنیتی حساب @${user.username || user.telegram_id}.`,
				actionLabel: 'ثبت وضعیت جدید',
				riskLevel: 'medium' as const,
				details: [{ label: 'وضعیت جدید', value: isFlaggedStatus() ? 'نیازمند بررسی' : 'عادی' }],
			};
		}

		if (type === 'impersonate') {
			return {
				title: 'مشاهده پنل به جای مدیر گروه (Impersonation)',
				description: `ورود به پنل مدیریت گروه‌های @${user.username || user.telegram_id} جهت بررسی تنظیمات فایروال و پشتیبانی.`,
				actionLabel: 'آغاز مشاهده پشتیبانی',
				confirmWord: 'SIMULATE',
				riskLevel: 'high' as const,
				details: [{ label: 'حساب هدف', value: `@${user.username || user.telegram_id}` }],
			};
		}

		return null;
	};

	return (
		<div class="space-y-4">
			{/* Search Box & Header */}
			<div class="tg-section p-4 space-y-3.5">
				<div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
					<div>
						<h2 class="text-[15px] font-bold text-[var(--tg-text)]">مدیریت و جستجوی مدیران گروه</h2>
						<p class="text-[12px] text-[var(--tg-hint)] mt-0.5">
							جستجوی مالکین ربات‌های گروه بر اساس یوزرنیم یا آیدی عددی تلگرام
						</p>
					</div>

					<div class="flex items-center gap-1.5 overflow-x-auto">
						<button
							onClick={() => setActiveFilter('all')}
							class={`px-3 py-1 rounded-lg text-[11.5px] font-semibold transition-all ${
								activeFilter() === 'all'
									? 'bg-[var(--tg-button)] text-white'
									: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-hint)]'
							}`}
						>
							همه ({users().length})
						</button>
						<button
							onClick={() => setActiveFilter('premium')}
							class={`px-3 py-1 rounded-lg text-[11.5px] font-semibold transition-all ${
								activeFilter() === 'premium'
									? 'bg-[#34C759] text-white'
									: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-hint)]'
							}`}
						>
							دارای اشتراک فعال
						</button>
						<button
							onClick={() => setActiveFilter('flagged')}
							class={`px-3 py-1 rounded-lg text-[11.5px] font-semibold transition-all ${
								activeFilter() === 'flagged'
									? 'bg-[#FF9500] text-white'
									: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-hint)]'
							}`}
						>
							نشان‌دار
						</button>
						<button
							onClick={() => setActiveFilter('banned')}
							class={`px-3 py-1 rounded-lg text-[11.5px] font-semibold transition-all ${
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
							placeholder="جستجو (@username یا آیدی عددی تلگرام)..."
							value={query()}
							onInput={(e) => handleSearchInput(e.currentTarget.value)}
							class="w-full h-10 bg-transparent text-[13px] text-[var(--tg-text)] placeholder-[var(--tg-hint)] focus:outline-none"
						/>
					</div>
					<button
						onClick={() => executeSearch(query())}
						disabled={loading() || !query().trim()}
						class="h-10 px-5 tg-btn-primary text-[13px] disabled:opacity-40"
					>
						جستجو
					</button>
				</div>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)]">
					{error()}
				</div>
			</Show>

			<Show when={loading()}>
				<div class="tg-section p-8 flex flex-col items-center justify-center gap-2">
					<div class="w-6 h-6 border-2 border-[var(--tg-button)] border-t-transparent rounded-full animate-spin" />
					<span class="text-[12.5px] text-[var(--tg-hint)]">در حال جستجوی مدیران گروه...</span>
				</div>
			</Show>

			<Show when={!loading() && filteredUsers().length > 0}>
				<div class="space-y-3">
					<For each={filteredUsers()}>
						{(user) => (
							<div class="tg-section p-4 space-y-3">
								<div class="flex items-center justify-between gap-3">
									<div class="space-y-0.5">
										<div class="flex items-center gap-2 flex-wrap">
											<h3 class="text-[14.5px] font-bold text-[var(--tg-text)]">
												{user.first_name} {user.last_name}
											</h3>
											<Show when={user.is_premium}>
												<span class="px-2 py-0.5 rounded-md bg-[#34C759]/12 text-[10.5px] font-bold text-[#34C759]">
													اشتراک استارز فعال
												</span>
											</Show>
											<Show when={user.is_flagged}>
												<span class="px-2 py-0.5 rounded-md bg-[#FF9500]/12 text-[10.5px] font-bold text-[#FF9500]">
													نشان‌دار
												</span>
											</Show>
											<Show when={user.is_banned}>
												<span class="px-2 py-0.5 rounded-md bg-[var(--tg-destructive)]/12 text-[10.5px] font-bold text-[var(--tg-destructive)]">
													مسدود
												</span>
											</Show>
										</div>

										<div class="flex items-center gap-3 text-[12px]">
											<span dir="ltr" class="text-[var(--tg-link)] font-mono">
												@{user.username || 'no_username'}
											</span>
											<span dir="ltr" class="text-[var(--tg-hint)] font-mono">
												ID: {user.telegram_id}
											</span>
										</div>
									</div>

									<div class="text-end">
										<span class="text-[11px] text-[var(--tg-hint)] block">وضعیت کاربری</span>
										<span class="text-[13px] font-bold text-[var(--tg-text)]">مدیر گروه</span>
									</div>
								</div>

								<div class="pt-2.5 border-t border-[var(--tg-separator)] flex gap-2 flex-wrap">
									<button
										onClick={() => openImpersonateModal(user)}
										class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[11.5px] font-semibold flex items-center gap-1"
									>
										<span class="material-symbols-outlined text-[15px]">visibility</span>
										بررسی پنل کاربر
									</button>

									<button
										onClick={() => openBanModal(user)}
										class="h-8 px-3 rounded-lg bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)] text-[11.5px] font-semibold flex items-center gap-1"
									>
										<span class="material-symbols-outlined text-[15px]">block</span>
										مسدودسازی
									</button>

									<button
										onClick={() => openUnbanModal(user)}
										class="h-8 px-3 rounded-lg bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] text-[11.5px] font-semibold flex items-center gap-1"
									>
										<span class="material-symbols-outlined text-[15px]">lock_open</span>
										رفع مسدودیت
									</button>

									<button
										onClick={() => openFlagModal(user)}
										class="h-8 px-3 rounded-lg bg-[#FF9500]/12 text-[#FF9500] text-[11.5px] font-semibold flex items-center gap-1"
									>
										<span class="material-symbols-outlined text-[15px]">flag</span>
										{user.is_flagged ? 'حذف نشان' : 'نشانگذاری'}
									</button>
								</div>
							</div>
						)}
					</For>
				</div>
			</Show>

			<Show when={actionType() === 'ban' && actionStep() === 'form' && selectedUser()}>
				<div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
					<div class="w-full max-w-sm bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] rounded-2xl p-5 space-y-4">
						<h3 class="text-[15px] font-bold text-[var(--tg-text)]">تنظیم پارامترهای مسدودسازی</h3>
						<div>
							<label class="block text-[12px] text-[var(--tg-hint)] mb-1">سطح مسدودسازی</label>
							<select
								value={banType()}
								onChange={(e) => setBanType(e.currentTarget.value)}
								class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3 text-[13px] text-[var(--tg-text)] outline-none"
							>
								<option value="full">مسدودی کامل دسترسی به پلتفرم</option>
								<option value="bot_creation">محدودیت ثبت ربات جدید</option>
							</select>
						</div>
						<div>
							<label class="block text-[12px] text-[var(--tg-hint)] mb-1">مدت زمان</label>
							<select
								value={banDuration()}
								onChange={(e) => setBanDuration(Number(e.currentTarget.value))}
								class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3 text-[13px] text-[var(--tg-text)] outline-none"
							>
								<option value={3600}>۱ ساعت</option>
								<option value={86400}>۲۴ ساعت</option>
								<option value={604800}>۷ روز</option>
								<option value={0}>دائمی</option>
							</select>
						</div>
						<div class="flex gap-2">
							<button
								onClick={closeActionModal}
								class="flex-1 h-10 tg-btn-secondary text-[13px]"
							>
								انصراف
							</button>
							<button
								onClick={() => setActionStep('confirm')}
								class="flex-1 h-10 bg-[var(--tg-destructive)] text-white text-[13px] font-bold rounded-xl"
							>
								ادامه
							</button>
						</div>
					</div>
				</div>
			</Show>

			<Show when={getDialogProps()}>
				{(dialogProps) => (
					<DangerActionDialog
						isOpen={true}
						title={dialogProps().title}
						description={dialogProps().description}
						actionLabel={dialogProps().actionLabel}
						confirmWord={dialogProps().confirmWord}
						riskLevel={dialogProps().riskLevel}
						details={dialogProps().details}
						loading={actionLoading()}
						onConfirm={handleConfirmedAction}
						onClose={closeActionModal}
					/>
				)}
			</Show>
		</div>
	);
};
export const OwnerUsersPage = OwnerUsers;
