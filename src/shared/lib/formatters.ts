/**
 * Shared formatting utilities (Ponytail - Single Source of Truth)
 */

/** Clean leading `@` symbols from Telegram username */
export function cleanTelegramUsername(username: string): string {
	if (!username) return '';
	return username.replace(/^@+/, '').trim();
}

/** Format numbers into compact score notation (e.g. 1.2M, 50K, 1,234) */
export function formatScore(score?: number | null): string {
	const safe = Number(score || 0);
	if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(2)}M`;
	if (safe >= 1_000) return `${(safe / 1_000).toFixed(0)}K`;
	return safe.toLocaleString('en-US');
}
