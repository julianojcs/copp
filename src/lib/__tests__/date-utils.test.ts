// src/lib/__tests__/date-utils.test.ts
import { describe, it, expect } from 'vitest'
import {
	formatInTimezone,
	formatDateOnly,
	formatRelativeTime,
} from '@/lib/date-utils'

describe('formatInTimezone', () => {
	it('formats in America/Sao_Paulo by default', () => {
		// 2026-05-24T14:00:00Z = 2026-05-24 11:00 in São Paulo (UTC-3)
		const out = formatInTimezone('2026-05-24T14:00:00Z')
		expect(out).toMatch(/24\/05\/2026/)
		expect(out).toMatch(/11:00/)
	})

	it('accepts custom Intl options', () => {
		const out = formatInTimezone('2026-05-24T14:00:00Z', {
			day: '2-digit',
			month: '2-digit',
		})
		expect(out).toBe('24/05')
	})

	it('handles Date instances and numeric timestamps', () => {
		const d = new Date('2026-05-24T14:00:00Z')
		expect(formatInTimezone(d)).toMatch(/24\/05\/2026/)
		expect(formatInTimezone(d.getTime())).toMatch(/24\/05\/2026/)
	})
})

describe('formatDateOnly', () => {
	it('formats a UTC date-only value without timezone shift', () => {
		// 2026-05-24 UTC must render as 24/05/2026 regardless of host TZ.
		expect(formatDateOnly('2026-05-24T00:00:00Z')).toMatch(/24\/05\/2026/)
	})

	it('respects custom format options', () => {
		const out = formatDateOnly('2026-12-01T00:00:00Z', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
		expect(out).toMatch(/01/)
		expect(out).toMatch(/2026/)
	})
})

describe('formatRelativeTime', () => {
	const NOW = new Date('2026-05-24T12:00:00Z')

	it('returns "agora há pouco" for very recent (< 30s) or future dates', () => {
		expect(formatRelativeTime(NOW, NOW)).toBe('agora há pouco')
		expect(
			formatRelativeTime(new Date(NOW.getTime() + 5_000), NOW),
		).toBe('agora há pouco')
		expect(
			formatRelativeTime(new Date(NOW.getTime() - 10_000), NOW),
		).toBe('agora há pouco')
	})

	it('returns seconds when between 30s and 1 min', () => {
		const t = new Date(NOW.getTime() - 45_000)
		expect(formatRelativeTime(t, NOW)).toBe('há 45 s')
	})

	it('returns minutes when between 1 min and 1 h', () => {
		const t = new Date(NOW.getTime() - 30 * 60_000)
		expect(formatRelativeTime(t, NOW)).toBe('há 30 min')
	})

	it('returns hours when between 1 h and 24 h', () => {
		const t = new Date(NOW.getTime() - 5 * 3_600_000)
		expect(formatRelativeTime(t, NOW)).toBe('há 5 h')
	})

	it('returns days when between 1 day and 7 days (singular vs plural)', () => {
		expect(
			formatRelativeTime(new Date(NOW.getTime() - 24 * 3_600_000), NOW),
		).toBe('há 1 dia')
		expect(
			formatRelativeTime(new Date(NOW.getTime() - 3 * 24 * 3_600_000), NOW),
		).toBe('há 3 dias')
	})

	it('falls back to absolute pt-BR date after 7 days', () => {
		const t = new Date(NOW.getTime() - 10 * 24 * 3_600_000)
		const out = formatRelativeTime(t, NOW)
		expect(out).toMatch(/2026/) // year present
		expect(out).not.toMatch(/^há /) // not a relative phrase
	})
})
