import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Lotacao } from '@/models/lotacao'
import { VALID_UFS } from '@/lib/constants/brazilian-states'

const MAX_LIMIT = 200

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url)
		const uf = (searchParams.get('uf') || '').trim().toUpperCase()
		const q = (searchParams.get('q') || '').trim()
		const tipo = (searchParams.get('tipo') || '').trim()
		const limitParam = Number.parseInt(searchParams.get('limit') || '200', 10)
		const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitParam) ? limitParam : 200))

		const filter: Record<string, unknown> = {}
		if (uf) {
			if (!VALID_UFS.has(uf)) {
				return NextResponse.json({ error: 'UF inválida' }, { status: 400 })
			}
			filter.uf = uf
		}
		if (tipo) filter.tipo = tipo
		if (q) {
			const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			filter.$or = [
				{ sigla: { $regex: safe, $options: 'i' } },
				{ nome: { $regex: safe, $options: 'i' } },
			]
		}

		await connectDB()
		const items = await Lotacao.find(filter)
			.select('sigla nome tipo uf cidade')
			.sort({ uf: 1, sigla: 1 })
			.limit(limit)
			.lean()

		return NextResponse.json({
			items: items.map((l) => ({
				id: l._id.toString(),
				sigla: l.sigla,
				nome: l.nome,
				tipo: l.tipo,
				uf: l.uf,
				cidade: l.cidade,
			})),
			total: items.length,
		})
	} catch (err) {
		console.error('GET /api/lotacoes error:', err)
		return NextResponse.json(
			{ error: 'Erro ao listar lotações.' },
			{ status: 500 }
		)
	}
}
