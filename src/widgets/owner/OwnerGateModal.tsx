import { useNavigate } from '@solidjs/router';
import { retrieveLaunchParams } from '@tma.js/sdk-solid';
import { type Component, createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { apiClient } from '@/shared/api/axios.js';
import { isRtl, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';

interface OwnerGateModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
}

export const OwnerGateModal: Component<OwnerGateModalProps> = (props) => {
	const navigate = useNavigate();
	const [password, setPassword] = createSignal('');
	const [errorMsg, setErrorMsg] = createSignal('');
	const [loading, setLoading] = createSignal(false);
	let inputRef: HTMLInputElement | undefined;

	createEffect(() => {
		if (props.isOpen) {
			setErrorMsg('');
			setPassword('');
			setTimeout(() => inputRef?.focus(), 50);
		}
	});

	const handleGlobalKeyDown = (e: KeyboardEvent) => {
		if (!props.isOpen) return;
		if (e.key === 'Escape') {
			props.onClose();
		}
	};

	if (typeof window !== 'undefined') {
		window.addEventListener('keydown', handleGlobalKeyDown);
		onCleanup(() => window.removeEventListener('keydown', handleGlobalKeyDown));
	}

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && password().trim() !== '') {
			handleSubmit();
		}
	};

	const handleSubmit = async () => {
		if (loading() || !password()) return;
		setErrorMsg('');
		setLoading(true);
		haptic.impact('medium');

		let tgUser: any = { id: 99281932 };
		let initDataStr = 'mock_init_data';

		try {
			const tg = (window as any).Telegram?.WebApp;
			if (tg?.initData) initDataStr = tg.initData;
			if (tg?.initDataUnsafe?.user) tgUser = tg.initDataUnsafe.user;
		} catch {}

		try {
			const lp = retrieveLaunchParams() as any;
			if (lp.tgWebAppData) initDataStr = String(lp.tgWebAppData);
			else if (lp.initDataRaw) initDataStr = String(lp.initDataRaw);
		} catch {}

		try {
			const cleanPassword = password().trim();
			const resp = await apiClient.post('/owner/auth/totp', {
				init_data: initDataStr,
				password: cleanPassword,
			});

			const token = resp?.data?.token || 'mock-owner-jwt-token';
			const ownerUid = String(resp?.data?.user?.id || tgUser?.id || 5076130392);
			haptic.notify('success');
			try {
				sessionStorage.setItem('owner_token', token);
				sessionStorage.setItem('owner_telegram_id', ownerUid);
				localStorage.setItem('owner_token', token);
				localStorage.setItem('owner_telegram_id', ownerUid);
			} catch {}
			if (props.onSuccess) {
				props.onSuccess();
			} else {
				props.onClose();
				navigate('/owner/dashboard');
			}
		} catch (err: any) {
			haptic.notify('error');
			setErrorMsg(err.response?.data?.error || t('ownerGate.errorAuth') || 'Authentication failed');
			setPassword('');
			inputRef?.focus();
		} finally {
			setLoading(false);
		}
	};

	return (
		<Show when={props.isOpen}>
			<div
				onClick={(e) => {
					if (e.target === e.currentTarget) props.onClose();
				}}
				class="fixed inset-0 z-[99999] flex items-center justify-center p-5 bg-black/55 backdrop-blur-[2px]"
				dir={isRtl() ? 'rtl' : 'ltr'}
			>
				<div
					role="dialog"
					aria-modal="true"
					class="w-full max-w-sm bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] rounded-[20px] p-5 shadow-2xl relative flex flex-col gap-4"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<div class="w-9 h-9 rounded-[10px] bg-[var(--tg-accent-soft)] text-[var(--tg-button)] flex items-center justify-center">
								<span class="material-symbols-outlined text-[20px]">admin_panel_settings</span>
							</div>
							<h2 class="text-[16px] font-bold text-[var(--tg-text)]">
								{t('ownerGate.title') || 'Owner Access'}
							</h2>
						</div>

						<button
							onClick={props.onClose}
							class="w-7 h-7 rounded-full bg-[var(--tg-secondary-bg)] flex items-center justify-center text-[var(--tg-hint)]"
						>
							<span class="material-symbols-outlined text-[18px]">close</span>
						</button>
					</div>

					<p class="text-[13px] text-[var(--tg-hint)] leading-relaxed">
						{t('ownerGate.desc') || 'Enter your owner security key to open the platform console.'}
					</p>

					<input
						type="password"
						placeholder={t('ownerGate.placeholder') || 'Security Key...'}
						value={password()}
						ref={inputRef}
						onInput={(e) => setPassword(e.currentTarget.value)}
						onKeyDown={handleKeyDown}
						class="w-full h-11 px-3.5 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] focus:border-[var(--tg-button)] text-[var(--tg-text)] text-[14px] rounded-[10px] focus:outline-none"
						disabled={loading()}
					/>

					<Show when={errorMsg()}>
						<div class="p-2.5 bg-[var(--tg-destructive)]/10 rounded-lg text-[12px] text-[var(--tg-destructive)] font-medium">
							{errorMsg()}
						</div>
					</Show>

					<button
						onClick={handleSubmit}
						disabled={loading() || !password()}
						class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center"
					>
						<Show
							when={!loading()}
							fallback={
								<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
							}
						>
							<span>{t('ownerGate.submit') || 'Continue'}</span>
						</Show>
					</button>
				</div>
			</div>
		</Show>
	);
};
