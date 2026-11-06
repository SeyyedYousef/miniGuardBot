/**
 * MiniGuard Real User Monitoring (RUM) & Core Web Vitals Tracker
 * Lightweight zero-dependency performance observer for LCP, CLS, INP, and TTFB.
 */

export interface PerformanceMetrics {
	ttfb: number;
	fcp: number;
	lcp: number;
	cls: number;
	inp: number;
}

const metrics: PerformanceMetrics = {
	ttfb: 0,
	fcp: 0,
	lcp: 0,
	cls: 0,
	inp: 0,
};

export function getRUMMetrics(): Readonly<PerformanceMetrics> {
	return { ...metrics };
}

export function initRUM(): void {
	if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
		return;
	}

	// 1. Navigation Timing (TTFB)
	try {
		const navEntry = performance.getEntriesByType('navigation')[0] as
			| PerformanceNavigationTiming
			| undefined;
		if (navEntry) {
			metrics.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
		}
	} catch {}

	// 2. Paint Timing (FCP)
	try {
		const paintObserver = new PerformanceObserver((entryList) => {
			for (const entry of entryList.getEntries()) {
				if (entry.name === 'first-contentful-paint') {
					metrics.fcp = Math.round(entry.startTime);
				}
			}
		});
		paintObserver.observe({ type: 'paint', buffered: true });
	} catch {}

	// 3. Largest Contentful Paint (LCP)
	try {
		const lcpObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries();
			const lastEntry = entries[entries.length - 1];
			if (lastEntry) {
				metrics.lcp = Math.round(lastEntry.startTime);
			}
		});
		lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
	} catch {}

	// 4. Cumulative Layout Shift (CLS)
	try {
		let clsValue = 0;
		const clsObserver = new PerformanceObserver((entryList) => {
			for (const entry of entryList.getEntries() as any[]) {
				if (!entry.hadRecentInput) {
					clsValue += entry.value;
					metrics.cls = Number(clsValue.toFixed(4));
				}
			}
		});
		clsObserver.observe({ type: 'layout-shift', buffered: true });
	} catch {}

	// 5. Interaction to Next Paint (INP) / First Input Delay
	try {
		const inpObserver = new PerformanceObserver((entryList) => {
			for (const entry of entryList.getEntries() as any[]) {
				const duration = entry.duration || entry.processingEnd - entry.startTime;
				if (duration > metrics.inp) {
					metrics.inp = Math.round(duration);
				}
			}
		});
		inpObserver.observe({ type: 'first-input', buffered: true });
	} catch {}

	// Log metrics in development for instant feedback
	if (import.meta.env.DEV) {
		window.addEventListener('load', () => {
			setTimeout(() => {
				console.info('[RUM / Web Vitals]:', {
					TTFB: `${metrics.ttfb}ms`,
					FCP: `${metrics.fcp}ms`,
					LCP: `${metrics.lcp}ms`,
					CLS: metrics.cls,
					INP: `${metrics.inp}ms`,
				});
			}, 3000);
		});
	}
}
