import { hapticFeedback } from '@tma.js/sdk-solid';
import { type Component, Show } from 'solid-js';
import { isRtl, t } from '@/shared/i18n/index.js';

interface UnsavedChangesSheetProps {
	isOpen: boolean;
	changedCount?: number;
	onSave: () => void;
	onDiscard: () => void;
	onClose: () => void;
	saving?: boolean;
}

export const UnsavedChangesSheet: Component<UnsavedChangesSheetProps> = (props) => {
	const handleSave = () => {
		try {
			hapticFeedback.impactOccurred('medium');
		} catch {}
		props.onSave();
	};

	const handleDiscard = () => {
		try {
			hapticFeedback.notificationOccurred('warning');
		} catch {}
		props.onDiscard();
	};

	return (
		<Show when={props.isOpen}>
			<div
				onClick={(e) => {
					if (e.target === e.currentTarget) props.onClose();
				}}
				class="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-[2px] flex items-end justify-center p-0 md:p-6"
				dir={isRtl() ? 'rtl' : 'ltr'}
			>
				<div
					role="dialog"
					aria-modal="true"
					class="w-full max-w-md bg-[var(--tg-section-bg)] border-t border-[var(--tg-separator)] rounded-t-[20px] p-5 pb-8 shadow-2xl space-y-4"
				>
					<div class="w-9 h-1 rounded-full bg-[var(--tg-hint)]/30 mx-auto -mt-1 mb-1" />

					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-[12px] bg-[#FF9500]/15 text-[#FF9500] flex items-center justify-center shrink-0">
							<span class="material-symbols-outlined text-[22px]">warning</span>
						</div>
						<div class="flex flex-col">
							<h3 class="text-[16px] font-bold text-[var(--tg-text)]">
								{t('common.unsavedChangesConfirm') || 'Unsaved Changes'}
							</h3>
							<p class="text-[13px] text-[var(--tg-hint)] mt-0.5">
								{t('generalSettings.saveSettings')}?
							</p>
						</div>
					</div>

					<div class="flex items-center gap-2.5 pt-2">
						<button
							onClick={handleDiscard}
							class="flex-1 h-11 rounded-[10px] bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)] text-[14px] font-semibold transition-opacity active:opacity-75"
						>
							{t('common.cancel')}
						</button>
						<button
							onClick={handleSave}
							disabled={props.saving}
							class="flex-1 h-11 rounded-[10px] bg-[var(--tg-button)] text-white text-[14px] font-semibold transition-opacity active:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50"
						>
							<Show
								when={!props.saving}
								fallback={
									<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								}
							>
								<span>{t('common.save')}</span>
							</Show>
						</button>
					</div>
				</div>
			</div>
		</Show>
	);
};
