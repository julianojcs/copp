import { Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function TimelinePlaceholder() {
	return (
		<Card className="min-h-[400px]">
			<CardContent className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
				<div className="rounded-full bg-muted p-4">
					<Sparkles
						className="h-8 w-8 text-muted-foreground"
						aria-hidden="true"
					/>
				</div>
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">Em breve: sua timeline</h2>
					<p className="max-w-md text-sm text-muted-foreground">
						Aqui você verá em tempo real novos membros, fotos publicadas,
						mensagens e comentários da turma.
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
