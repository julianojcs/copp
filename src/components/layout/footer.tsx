'use client'

import Link from 'next/link'
import { Linkedin } from 'lucide-react'
import { useAppSettings } from '@/hooks/use-app-settings'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const branding = useAppSettings()

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© {currentYear} {branding.brandName}. Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Desenvolvido por</span>
            <Link
              href={branding.developerLinkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
            >
              {branding.developerName}
              <Linkedin className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
