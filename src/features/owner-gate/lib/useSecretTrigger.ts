import { createSignal, onCleanup } from 'solid-js';
import { haptic } from '@/shared/lib/haptic.js';

export function useSecretTrigger() {
	const [tapCount, setTapCount] = createSignal(0);
	const [showGate, setShowGate] = createSignal(false);
	let tapTimeout: any = null;
	let pressTimeout: any = null;

	onCleanup(() => {
		if (tapTimeout) clearTimeout(tapTimeout);
		if (pressTimeout) clearTimeout(pressTimeout);
	});

	const onVersionTap = () => {
		try {
			haptic.impact('light');
		} catch {}

		setTapCount((c) => c + 1);

		if (tapTimeout) clearTimeout(tapTimeout);
		tapTimeout = setTimeout(() => {
			setTapCount(0);
		}, 2500);

		if (tapCount() >= 3) {
			try {
				haptic.notify('success');
			} catch {}
			setShowGate(true);
			setTapCount(0);
		}
	};

	const onLogoPressStart = () => {
		if (pressTimeout) clearTimeout(pressTimeout);
		pressTimeout = setTimeout(() => {
			try {
				haptic.notify('success');
			} catch {}
			setShowGate(true);
		}, 1500);
	};

	const onLogoPressEnd = () => {
		if (pressTimeout) {
			clearTimeout(pressTimeout);
			pressTimeout = null;
		}
	};

	return {
		onVersionTap,
		onLogoPressStart,
		onLogoPressEnd,
		showGate,
		setShowGate,
	};
}
