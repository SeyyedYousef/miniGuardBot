import { hapticFeedback } from '@tma.js/sdk-solid';
import { type Component, createSignal, For, Show } from 'solid-js';
import { isRtl, t } from '@/shared/i18n/index.js';

// Native Telegram / iOS Switch Component
export const ToggleSwitch: Component<{ checked: boolean; onChange: (v: boolean) => void }> = (
	props,
) => {
	return (
		<button
			dir="ltr"
			role="switch"
			aria-checked={props.checked}
			aria-label={t('common.toggle')}
			onClick={() => {
				try {
					hapticFeedback.impactOccurred('light');
				} catch {}
				props.onChange(!props.checked);
			}}
			class={`relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
				props.checked ? 'bg-[#34c759]' : 'bg-[var(--tg-input-bg)]'
			}`}
		>
			<span
				class={`inline-block h-[26px] w-[26px] transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
					props.checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
				}`}
			/>
		</button>
	);
};

// Reusable Select Field (Telegram Native Row Style)
export const SelectField: Component<{
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
	description?: string;
}> = (props) => {
	const id = `select-${Math.random().toString(36).slice(2, 9)}`;
	return (
		<div class="flex flex-col gap-1.5 w-full">
			<div class="tg-section">
				<div class="tg-cell">
					<label for={id} class="text-[14px] font-medium text-[var(--tg-text)]">
						{props.label}
					</label>
					<select
						id={id}
						value={props.value}
						onChange={(e) => {
							try {
								hapticFeedback.selectionChanged();
							} catch {}
							props.onChange(e.currentTarget.value);
						}}
						class="bg-transparent text-[var(--tg-link)] text-[14px] font-semibold focus:outline-none cursor-pointer text-end"
					>
						<For each={props.options}>
							{(opt) => (
								<option value={opt.value} class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
									{opt.label}
								</option>
							)}
						</For>
					</select>
				</div>
			</div>
			<Show when={props.description}>
				<span class="tg-section-footer">{props.description}</span>
			</Show>
		</div>
	);
};

// Reusable Number Input Field
export const NumberInputField: Component<{
	label: string;
	value: number;
	onChange: (v: number) => void;
	description?: string;
	placeholder?: string;
	min?: number;
	max?: number;
}> = (props) => {
	const id = `number-${Math.random().toString(36).slice(2, 9)}`;
	return (
		<div class="flex flex-col gap-1.5 w-full">
			<div class="tg-section">
				<div class="tg-cell">
					<label for={id} class="text-[14px] font-medium text-[var(--tg-text)]">
						{props.label}
					</label>
					<input
						id={id}
						type="number"
						inputMode="numeric"
						min={props.min}
						max={props.max}
						value={props.value === 0 ? '' : props.value}
						placeholder={props.placeholder || '0'}
						onInput={(e) => {
							const val = parseInt(e.currentTarget.value, 10) || 0;
							props.onChange(val);
						}}
						class="w-24 bg-[var(--tg-input-bg)] text-[var(--tg-text)] text-[14px] font-mono font-semibold rounded-lg py-1.5 px-3 text-center focus:outline-none"
						dir="ltr"
					/>
				</div>
			</div>
			<Show when={props.description}>
				<span class="tg-section-footer">{props.description}</span>
			</Show>
		</div>
	);
};

// Reusable String List Field
export const StringListField: Component<{
	label: string;
	items: string[];
	onAdd: (item: string) => void;
	onRemove: (item: string) => void;
	placeholder?: string;
	description?: string;
}> = (props) => {
	const [inputValue, setInputValue] = createSignal('');

	const handleAdd = () => {
		const val = inputValue().trim();
		if (val && !props.items.includes(val)) {
			try {
				hapticFeedback.impactOccurred('light');
			} catch {}
			props.onAdd(val);
			setInputValue('');
		}
	};

	return (
		<div class="flex flex-col gap-2 w-full">
			<span class="tg-section-label">{props.label}</span>
			<div class="tg-section p-3 flex flex-col gap-2.5">
				<div class="flex gap-2">
					<input
						type="text"
						value={inputValue()}
						onInput={(e) => setInputValue(e.currentTarget.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								handleAdd();
							}
						}}
						placeholder={props.placeholder || '...'}
						class="flex-1 tg-input text-[14px] px-3.5 py-2.5 focus:outline-none"
					/>
					<button
						onClick={handleAdd}
						disabled={!inputValue().trim()}
						class="px-4 tg-btn-primary disabled:opacity-40 text-xs flex items-center justify-center"
					>
						<span class="material-symbols-outlined text-[20px]">add</span>
					</button>
				</div>

				<Show when={props.items.length > 0}>
					<div class="flex flex-wrap gap-1.5 pt-1">
						<For each={props.items}>
							{(item) => (
								<div class="bg-[var(--tg-input-bg)] rounded-lg px-2.5 py-1 flex items-center gap-1.5">
									<span class="text-[13px] text-[var(--tg-text)]">{item}</span>
									<button
										onClick={() => props.onRemove(item)}
										class="text-[var(--tg-hint)] hover:text-[var(--tg-destructive)] flex items-center"
									>
										<span class="material-symbols-outlined text-[15px]">close</span>
									</button>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>
			<Show when={props.description}>
				<span class="tg-section-footer">{props.description}</span>
			</Show>
		</div>
	);
};

// Reusable Inline Button Field
export const InlineButtonField: Component<{
	label: string;
	buttons: { id: string; title: string; url: string }[];
	onAdd: (btn: { id: string; title: string; url: string }) => void;
	onRemove: (id: string) => void;
	description?: string;
}> = (props) => {
	const [title, setTitle] = createSignal('');
	const [url, setUrl] = createSignal('');

	const handleAdd = () => {
		const tVal = title().trim();
		const uVal = url().trim();
		if (tVal && uVal) {
			try {
				hapticFeedback.impactOccurred('light');
			} catch {}
			props.onAdd({ id: Date.now().toString(), title: tVal, url: uVal });
			setTitle('');
			setUrl('');
		}
	};

	return (
		<div class="flex flex-col gap-2 w-full">
			<span class="tg-section-label">{props.label}</span>
			<div class="tg-section p-3 flex flex-col gap-2.5">
				<input
					type="text"
					value={title()}
					onInput={(e) => setTitle(e.currentTarget.value)}
					placeholder="عنوان دکمه"
					class="w-full tg-input text-[14px] px-3.5 py-2 focus:outline-none"
				/>
				<div class="flex gap-2">
					<input
						type="url"
						value={url()}
						onInput={(e) => setUrl(e.currentTarget.value)}
						placeholder="https://t.me/..."
						dir="ltr"
						class="flex-1 tg-input text-[14px] px-3.5 py-2 focus:outline-none"
					/>
					<button
						onClick={handleAdd}
						disabled={!title().trim() || !url().trim()}
						class="px-4 tg-btn-primary disabled:opacity-40 flex items-center justify-center"
					>
						<span class="material-symbols-outlined text-[20px]">add</span>
					</button>
				</div>

				<Show when={props.buttons.length > 0}>
					<div class="flex flex-col divide-y divide-[var(--tg-separator)] pt-1">
						<For each={props.buttons}>
							{(btn) => (
								<div class="py-2 flex items-center justify-between gap-2">
									<div class="flex flex-col min-w-0">
										<span class="text-[13px] font-semibold text-[var(--tg-text)] truncate">
											{btn.title}
										</span>
										<span class="text-[11px] text-[var(--tg-link)] truncate" dir="ltr">
											{btn.url}
										</span>
									</div>
									<button
										onClick={() => props.onRemove(btn.id)}
										class="text-[var(--tg-destructive)] p-1"
									>
										<span class="material-symbols-outlined text-[18px]">delete</span>
									</button>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>
			<Show when={props.description}>
				<span class="tg-section-footer">{props.description}</span>
			</Show>
		</div>
	);
};

// Native Telegram Settings Section
export const SettingsSection: Component<{
	title: string;
	description: string;
	enabled: boolean;
	onToggle: (v: boolean) => void;
	hasWindow?: boolean;
	windowVal?: string;
	onWindowChange?: (v: string) => void;
	customStart?: string;
	onCustomStart?: (v: string) => void;
	customEnd?: string;
	onCustomEnd?: (v: string) => void;
	hasPenalty?: boolean;
	penaltyVal?: string;
	onPenaltyChange?: (v: string) => void;
	hasEditText?: boolean;
	onEditText?: () => void;
}> = (props) => {
	return (
		<div class="tg-section" dir={isRtl() ? 'rtl' : 'ltr'}>
			<div class="tg-cell">
				<div class="flex flex-col flex-1 min-w-0 py-0.5">
					<span class="text-[14px] font-semibold text-[var(--tg-text)]">{props.title}</span>
					<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
						{props.description}
					</span>
				</div>
				<ToggleSwitch checked={props.enabled} onChange={props.onToggle} />
			</div>

			<Show when={props.enabled && (props.hasWindow || props.hasPenalty || props.hasEditText)}>
				<Show when={props.hasWindow}>
					<div class="tg-cell">
						<span class="text-[13px] text-[var(--tg-text)]">
							{t('generalSettings.activeWindow')}
						</span>
						<select
							value={props.windowVal!}
							onChange={(e) => props.onWindowChange?.(e.currentTarget.value)}
							class="bg-transparent text-[var(--tg-link)] text-[13px] font-semibold focus:outline-none"
						>
							<option value="Always" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.optAlways')}
							</option>
							<option value="Daytime" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.optDaytime')}
							</option>
							<option value="Custom" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.optCustom')}
							</option>
						</select>
					</div>
				</Show>

				<Show when={props.hasPenalty}>
					<div class="tg-cell">
						<span class="text-[13px] text-[var(--tg-text)]">{t('generalSettings.penalty')}</span>
						<select
							value={props.penaltyVal!}
							onChange={(e) => props.onPenaltyChange?.(e.currentTarget.value)}
							class="bg-transparent text-[var(--tg-link)] text-[13px] font-semibold focus:outline-none"
						>
							<option value="default" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.defaultPenalty')}
							</option>
							<option value="delete" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.optDelete')}
							</option>
							<option value="mute_1h" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.optMute1h')}
							</option>
							<option value="mute_24h" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.optMute24h')}
							</option>
							<option value="kick" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.optKick')}
							</option>
							<option value="ban" class="bg-[var(--tg-section-bg)] text-[var(--tg-text)]">
								{t('generalSettings.optBan')}
							</option>
						</select>
					</div>
				</Show>

				<Show when={props.hasEditText}>
					<button
						onClick={() => props.onEditText?.()}
						class="tg-cell w-full text-[var(--tg-link)] text-[13px] font-semibold"
					>
						<span>{t('generalSettings.editText')}</span>
						<span class="material-symbols-outlined text-[18px] rtl:rotate-180">chevron_right</span>
					</button>
				</Show>
			</Show>
		</div>
	);
};
