/**
 * Ultra-fast Telegram Mini App Splash Controller (Zero artificial delay)
 */

let alreadyHidden = false;

export function hideSplash(_immediate = false): void {
	if (alreadyHidden) return;
	alreadyHidden = true;

	const el = document.getElementById('app-splash');
	if (!el) return;

	el.classList.add('splash-hidden');
	window.setTimeout(() => el.remove(), 120);
}

export function getBootDuration(): number {
	const startedAt = (window as unknown as { __SPLASH_START__?: number }).__SPLASH_START__;
	return startedAt ? Date.now() - startedAt : 0;
}
