// src/components/dashboard/__tests__/stats-rail.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsRail } from '@/components/dashboard/stats-rail'

describe('StatsRail', () => {
	it('renders the user count card with the value', () => {
		render(<StatsRail totalUsers={42} totalPhotos={7} />)
		expect(screen.getByText('Total de colegas')).toBeTruthy()
		expect(screen.getByText('42')).toBeTruthy()
	})

	it('renders the photo count card with the value', () => {
		render(<StatsRail totalUsers={42} totalPhotos={7} />)
		expect(screen.getByText('Fotos compartilhadas')).toBeTruthy()
		expect(screen.getByText('7')).toBeTruthy()
	})

	it('renders the quick-actions card with the upload shortcut', () => {
		render(<StatsRail totalUsers={42} totalPhotos={7} />)
		expect(screen.getByText('Ações rápidas')).toBeTruthy()
		expect(screen.getByRole('button', { name: /Enviar foto/ })).toBeTruthy()
	})

	it('links the count cards to /colleagues and /gallery respectively', () => {
		render(<StatsRail totalUsers={1} totalPhotos={1} />)
		const colleaguesLink = screen.getAllByRole('link').find(
			(a) => a.getAttribute('href') === '/colleagues',
		)
		const galleryLink = screen.getAllByRole('link').find(
			(a) => a.getAttribute('href') === '/gallery',
		)
		expect(colleaguesLink).toBeTruthy()
		expect(galleryLink).toBeTruthy()
	})

	it('renders zero values without crashing', () => {
		render(<StatsRail totalUsers={0} totalPhotos={0} />)
		expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2)
	})
})
