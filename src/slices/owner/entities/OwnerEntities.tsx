import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { type OwnerEntityItem, ownerApi } from '@/shared/api/owner.js';
import { haptic } from '@/shared/lib/haptic.js';

export const OwnerEntities: Component = () => {
	const [groups, setGroups] = createSignal<OwnerEntityItem[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal('');

	const fetchData = async () => {
		setLoading(true);
		setError('');
		try {
			const allEntities = await ownerApi.listEntities();
			setGroups(allEntities.filter((e) => e.type === 'group') || []);
		} catch (e: any) {
			setError(e.response?.data?.error || 'خطا در دریافت لیست گروه‌های متصل');
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		fetchData();
	});

	const handleAddCredit = async (entity: OwnerEntityItem) => {
		haptic.impact('medium');
		try {
			await ownerApi.addEntityCredit(entity.id, 30, 'Owner manual extension');
			haptic.notify('success');
			fetchData();
		} catch {
			haptic.notify('error');
		}
	};

	return (
		<div class="space-y-4">
			<div class="tg-section p-4 flex items-center justify-between">
				<div class="flex flex-col">
					<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
						مدیریت گروه‌ها و بات‌های اختصاصی ({groups().length})
					</h2>
					<span class="text-[12px] text-[var(--tg-hint)]">
						نظارت بر گروه‌های متصل و تمدید اشتراک بات‌های تک‌گروهی
					</span>
				</div>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)]">
					{error()}
				</div>
			</Show>

			<Show when={!loading()}>
				<div class="tg-section">
					<For
						each={groups()}
						fallback={
							<div class="p-6 text-center text-[13px] text-[var(--tg-hint)]">
								هیچ گروهی ثبت نشده است.
							</div>
						}
					>
						{(gr) => (
							<div class="tg-cell justify-between">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-10 h-10 rounded-full bg-[var(--tg-button)] flex items-center justify-center text-white font-bold text-[15px] shrink-0">
										{gr.title?.trim()?.[0]?.toUpperCase() || 'G'}
									</div>
									<div class="flex flex-col min-w-0">
										<span class="text-[15px] font-semibold text-[var(--tg-text)] truncate">
											{gr.title}
										</span>
										<span class="text-[12px] text-[var(--tg-hint)] font-mono truncate">
											ID: {gr.telegram_id} • Owner: @{gr.owner_username || gr.owner_id}
										</span>
									</div>
								</div>

								<div class="flex items-center gap-2 shrink-0">
									<span class="text-[12px] font-semibold text-[#34C759] px-2 py-0.5 rounded-md bg-[#34C759]/10">
										فعال
									</span>
									<button
										onClick={() => handleAddCredit(gr)}
										class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-semibold"
									>
										+۳۰ روز اعتبار
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
