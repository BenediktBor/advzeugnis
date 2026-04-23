export function randomId(): string {
	const cryptoObj = globalThis.crypto
	if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID()

	// Fallback UUID v4 (best-effort) for environments without `randomUUID()`.
	const bytes = new Uint8Array(16)
	if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
		cryptoObj.getRandomValues(bytes)
	} else {
		for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
	}

	// Version 4: bits 12-15 of the time_hi_and_version field to 0100
	bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
	// Variant: bits 6-7 of the clock_seq_hi_and_reserved to 10
	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

