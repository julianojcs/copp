// src/lib/date-utils.ts

const TIMEZONE = 'America/Sao_Paulo'

/**
 * Format a timestamp (date + time) in the system timezone (America/Sao_Paulo).
 * Use for createdAt, deadlines, scheduled times.
 */
export function formatInTimezone(
	date: Date | string | number,
	options: Intl.DateTimeFormatOptions = {
		dateStyle: 'short',
		timeStyle: 'short',
	},
): string {
	return new Intl.DateTimeFormat('pt-BR', {
		...options,
		timeZone: TIMEZONE,
	}).format(new Date(date))
}

/**
 * Format a date-only value as UTC.
 * Use for event dates, birthdays, day-of-activity (no time component).
 */
export function formatDateOnly(
	date: Date | string | number,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'short' },
): string {
	return new Intl.DateTimeFormat('pt-BR', {
		...options,
		timeZone: 'UTC',
	}).format(new Date(date))
}

/**
 * Format a relative timestamp in pt-BR, e.g. "há 3 min", "há 2 h", "há 5 dias".
 * Returns the absolute date in `formatInTimezone` for anything older than 7 days.
 */
export function formatRelativeTime(
	date: Date | string | number,
	now: Date = new Date(),
): string {
	const target = new Date(date)
	const diffMs = now.getTime() - target.getTime()

	if (diffMs < 0) return 'agora há pouco'

	const seconds = Math.floor(diffMs / 1000)
	if (seconds < 30) return 'agora há pouco'
	if (seconds < 60) return `há ${seconds} s`

	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `há ${minutes} min`

	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `há ${hours} h`

	const days = Math.floor(hours / 24)
	if (days < 7) return days === 1 ? 'há 1 dia' : `há ${days} dias`

	return formatInTimezone(target, { day: '2-digit', month: 'short', year: 'numeric' })
}
