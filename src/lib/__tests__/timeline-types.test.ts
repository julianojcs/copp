// src/lib/__tests__/timeline-types.test.ts
import { describe, it, expect } from 'vitest'
import { computeScore } from '@/lib/timeline-types'

describe('computeScore', () => {
	const NOW = new Date('2026-05-24T12:00:00Z')

	it('returns 0 for a brand-new item with no engagement', () => {
		expect(computeScore({ createdAt: NOW, now: NOW })).toBe(0)
	})

	it('decays linearly with age when there is no engagement', () => {
		const oneHourAgo = new Date(NOW.getTime() - 3_600_000)
		// hoursOld = 1 → decay = 1/12 ≈ -0.0833
		expect(computeScore({ createdAt: oneHourAgo, now: NOW })).toBeCloseTo(
			-1 / 12,
			5,
		)
	})

	it('boosts engaged items above unengaged ones of the same age', () => {
		const t = new Date(NOW.getTime() - 3_600_000)
		const unengaged = computeScore({ createdAt: t, now: NOW })
		const engaged = computeScore({
			createdAt: t,
			reactionsCount: 10,
			commentsCount: 5,
			now: NOW,
		})
		expect(engaged).toBeGreaterThan(unengaged)
	})

	it('weights comments twice as heavily as reactions', () => {
		const t = NOW
		const reactionsOnly = computeScore({
			createdAt: t,
			reactionsCount: 10,
			commentsCount: 0,
			now: NOW,
		})
		const commentsOnly = computeScore({
			createdAt: t,
			reactionsCount: 0,
			commentsCount: 5, // 5 * 2 = 10, same engagement total
			now: NOW,
		})
		expect(commentsOnly).toBeCloseTo(reactionsOnly, 5)

		const commentsHeavy = computeScore({
			createdAt: t,
			reactionsCount: 0,
			commentsCount: 10,
			now: NOW,
		})
		expect(commentsHeavy).toBeGreaterThan(reactionsOnly)
	})

	it('an engaged but old item can lose to a fresh unengaged one (decay dominates)', () => {
		// Fresh unengaged: score = 0
		// 36h-old item with 5 reactions: log10(6) ≈ 0.778, decay = 36/12 = 3 → score ≈ -2.22
		const score = computeScore({
			createdAt: new Date(NOW.getTime() - 36 * 3_600_000),
			reactionsCount: 5,
			now: NOW,
		})
		expect(score).toBeLessThan(0)
	})

	it('defaults `now` to the current time when omitted', () => {
		// Smoke check — just ensures it doesn't throw and returns a finite number.
		const score = computeScore({ createdAt: new Date() })
		expect(Number.isFinite(score)).toBe(true)
	})

	it('treats reactionsCount/commentsCount as 0 when omitted', () => {
		const t = new Date(NOW.getTime() - 3_600_000)
		const a = computeScore({ createdAt: t, now: NOW })
		const b = computeScore({
			createdAt: t,
			reactionsCount: 0,
			commentsCount: 0,
			now: NOW,
		})
		expect(a).toBe(b)
	})
})
