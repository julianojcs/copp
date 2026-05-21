// src/app/aguardando-aprovacao/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAppSettings } from '@/lib/app-settings'

export default async function AguardandoAprovacaoPage() {
  const settings = await getAppSettings()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center text-white">
        <h1 className="text-2xl font-bold mb-2">Cadastro recebido</h1>
        <p className="text-slate-300 mb-2">
          Sua conta no <strong>{settings.brandName}</strong> está aguardando
          aprovação da coordenação do curso.
        </p>
        <p className="text-slate-400 text-sm mb-6">
          Você receberá um email assim que sua conta for liberada.
        </p>
        <Link href="/login">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Voltar ao login
          </Button>
        </Link>
      </div>
    </div>
  )
}
