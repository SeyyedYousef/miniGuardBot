/**
 * Branded Telegram Mini App Splash Controller
 * Guarantees fonts, SVG icons, translations, and initial UI are 100% ready before reveal.
 */

let alreadyHidden = false;

export function updateSplashProgress(percent: number, statusText?: string): void {
	if (typeof document === 'undefined' || alreadyHidden) return;
	const bar = document.getElementById('splash-progress-bar');
	if (bar) {
		const clamped = Math.max(5, Math.min(100, percent));
		bar.style.width = `${clamped}%`;
	}
	if (statusText) {
		const statusEl = document.getElementById('splash-status-text');
		if (statusEl) {
			statusEl.textContent = statusText;
		}
	}
}

export function hideSplash(immediate = false): void {
	if (alreadyHidden) return;
	alreadyHidden = true;

	const el = document.getElementById('app-splash');
	if (!el) return;

	updateSplashProgress(100);

	const doRemove = () => {
		el.classList.add('splash-hidden');
		window.setTimeout(() => {
			try {
				el.remove();
			} catch {}
		}, 340);
	};

	if (immediate) {
		doRemove();
		return;
	}

	const elapsed = getBootDuration();
	const minDisplayMs = 420;
	const remaining = Math.max(0, minDisplayMs - elapsed);

	window.setTimeout(doRemove, remaining);
}

export function getBootDuration(): number {
	const startedAt = (window as unknown as { __SPLASH_START__?: number }).__SPLASH_START__;
	return startedAt ? Date.now() - startedAt : 0;
}
