'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export interface IBGEState {
	id: number
	sigla: string
	nome: string
}

export interface IBGECity {
	id: number
	nome: string
}

export interface UseIBGEReturn {
	states: IBGEState[]
	cities: IBGECity[]
	loadingStates: boolean
	loadingCities: boolean
	statesError: string | null
	citiesError: string | null
	setSelectedUF: (uf: string) => void
}

const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades'

export function useIBGE(initialUF = ''): UseIBGEReturn {
	const [states, setStates] = useState<IBGEState[]>([])
	const [cities, setCities] = useState<IBGECity[]>([])
	const [loadingStates, setLoadingStates] = useState(false)
	const [loadingCities, setLoadingCities] = useState(false)
	const [statesError, setStatesError] = useState<string | null>(null)
	const [citiesError, setCitiesError] = useState<string | null>(null)
	const [selectedUF, setSelectedUFState] = useState(initialUF)

	const fetchStates = useCallback(async () => {
		setLoadingStates(true)
		setStatesError(null)
		try {
			const res = await fetch(`${IBGE_BASE}/estados?orderBy=nome`)
			if (!res.ok) {
				setStatesError('Não foi possível carregar os estados.')
				return
			}
			const data: IBGEState[] = await res.json()
			setStates(data)
		} catch {
			setStatesError('Falha ao consultar a API do IBGE.')
		} finally {
			setLoadingStates(false)
		}
	}, [])

	const fetchCities = useCallback(async (uf: string) => {
		if (!uf) {
			setCities([])
			setCitiesError(null)
			return
		}
		setLoadingCities(true)
		setCitiesError(null)
		try {
			const res = await fetch(`${IBGE_BASE}/estados/${uf}/municipios?orderBy=nome`)
			if (!res.ok) {
				setCitiesError('Não foi possível carregar as cidades.')
				return
			}
			const data: IBGECity[] = await res.json()
			setCities(data)
		} catch {
			setCitiesError('Falha ao consultar a API do IBGE.')
		} finally {
			setLoadingCities(false)
		}
	}, [])

	useEffect(() => {
		fetchStates()
	}, [fetchStates])

	useEffect(() => {
		fetchCities(selectedUF)
	}, [selectedUF, fetchCities])

	const setSelectedUF = useCallback((uf: string) => {
		setSelectedUFState(uf)
	}, [])

	return useMemo(
		() => ({
			states,
			cities,
			loadingStates,
			loadingCities,
			statesError,
			citiesError,
			setSelectedUF,
		}),
		[states, cities, loadingStates, loadingCities, statesError, citiesError, setSelectedUF],
	)
}
