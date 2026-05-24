// src/components/dashboard/__tests__/recent-members-card.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
	RecentMembersCard,
	type RecentMember,
} from '@/components/dashboard/recent-members-card'

const members: RecentMember[] = [
	{
		_id: 'u1',
		name: 'João Silva',
		role: 'aluno',
		cargo: 'APF',
		lotacaoSigla: 'SR/PF/DF',
	},
	{
		_id: 'u2',
		name: 'Maria Souza',
		role: 'aluno',
		cargo: 'DPF',
		lotacaoSigla: 'SR/PF/SP',
	},
]

describe('RecentMembersCard', () => {
	it('renders empty state when no members are passed', () => {
		render(<RecentMembersCard members={[]} />)
		expect(screen.getByText(/Nenhum membro ainda/)).toBeTruthy()
	})

	it('renders both desktop and mobile views with each member', () => {
		render(<RecentMembersCard members={members} />)
		// Desktop list renders the full name; mobile rail renders only the first name.
		expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0)
		expect(screen.getAllByText('Maria Souza').length).toBeGreaterThan(0)
		expect(screen.getAllByText('João').length).toBeGreaterThan(0)
		expect(screen.getAllByText('Maria').length).toBeGreaterThan(0)
	})

	it('renders cargo · lotacao subtitle on the desktop card', () => {
		render(<RecentMembersCard members={members} />)
		expect(screen.getByText(/APF\s*·\s*SR\/PF\/DF/)).toBeTruthy()
	})

	it('links each member row to the colleague page', () => {
		render(<RecentMembersCard members={members} />)
		const links = screen.getAllByRole('link')
		expect(
			links.some((a) => a.getAttribute('href') === '/colleagues/u1'),
		).toBe(true)
		expect(
			links.some((a) => a.getAttribute('href') === '/colleagues/u2'),
		).toBe(true)
	})

	it('falls back to role when cargo is absent', () => {
		render(
			<RecentMembersCard
				members={[
					{ _id: 'u3', name: 'Admin Geral', role: 'admin' },
				]}
			/>,
		)
		expect(screen.getByText(/admin/)).toBeTruthy()
	})
})
