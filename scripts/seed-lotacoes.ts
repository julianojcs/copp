// Seed Lotacao collection from docs/siglas_lotacoes_pf.csv
// Executar com: npx tsx scripts/seed-lotacoes.ts

import { readFileSync } from 'fs'
import path from 'path'
import { config } from 'dotenv'
import mongoose from 'mongoose'

config({ path: path.resolve(process.cwd(), '.env.local') })

import { Lotacao, LOTACAO_TIPOS, type LotacaoTipo } from '../src/models/lotacao'
import { VALID_UFS } from '../src/lib/constants/brazilian-states'

const CSV_PATH = path.resolve(process.cwd(), 'docs/siglas_lotacoes_pf.csv')

interface CsvRow {
	sigla: string
	nome: string
	tipo: LotacaoTipo
	uf: string
	cidade: string
}

const TIPO_VALUES = new Set<string>(Object.values(LOTACAO_TIPOS))

function normalizeSigla(sigla: string): string {
	return sigla.trim().toUpperCase()
}

function normalizeNome(nome: string): string {
	// Defensive fix for the known typo on the source CSV
	return nome.trim().replace(/\bRegional al em\b/i, 'Regional em')
}

function parseCSV(content: string): CsvRow[] {
	const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
	const [header, ...rows] = lines
	const expected = ['Sigla', 'Nome', 'Tipo', 'UF', 'Cidade']
	const headerCols = header.split(';').map((c) => c.trim())
	if (!expected.every((c, i) => headerCols[i] === c)) {
		throw new Error(`CSV header mismatch. Got: ${headerCols.join(',')}`)
	}

	const parsed: CsvRow[] = []
	for (const [idx, raw] of rows.entries()) {
		const cols = raw.split(';').map((c) => c.trim())
		if (cols.length !== 5) {
			throw new Error(`Line ${idx + 2}: expected 5 columns, got ${cols.length}: "${raw}"`)
		}
		const [sigla, nome, tipo, uf, cidade] = cols
		if (!TIPO_VALUES.has(tipo)) {
			throw new Error(`Line ${idx + 2}: invalid tipo "${tipo}"`)
		}
		const ufUpper = uf.toUpperCase()
		if (!VALID_UFS.has(ufUpper)) {
			throw new Error(`Line ${idx + 2}: invalid UF "${uf}"`)
		}
		parsed.push({
			sigla: normalizeSigla(sigla),
			nome: normalizeNome(nome),
			tipo: tipo as LotacaoTipo,
			uf: ufUpper,
			cidade: cidade.trim(),
		})
	}
	return parsed
}

async function seed(): Promise<void> {
	const MONGODB_URI = process.env.MONGODB_URI
	if (!MONGODB_URI) {
		console.error('❌ MONGODB_URI not set in .env.local')
		process.exit(1)
	}

	const content = readFileSync(CSV_PATH, 'utf8')
	const rows = parseCSV(content)
	console.log(`📋 Parsed ${rows.length} rows from CSV`)

	console.log('🔌 Connecting to MongoDB…')
	await mongoose.connect(MONGODB_URI)

	let inserted = 0
	let updated = 0
	for (const r of rows) {
		const res = await Lotacao.updateOne(
			{ sigla: r.sigla, uf: r.uf },
			{ $set: r },
			{ upsert: true }
		)
		if (res.upsertedCount > 0) inserted++
		else if (res.modifiedCount > 0) updated++
	}

	const total = await Lotacao.countDocuments()
	console.log(`✅ Seed concluído. Inseridos: ${inserted}, atualizados: ${updated}, total: ${total}`)

	await mongoose.disconnect()
}

seed().catch((err) => {
	console.error('❌ Seed failed:', err)
	process.exit(1)
})
