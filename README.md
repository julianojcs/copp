# V COPP — Sistema da Turma

Sistema da turma do **5º Curso de Operadores de Proteção a Pessoa (V COPP)**, ministrado pela **Academia Nacional de Polícia (ANP)** da Polícia Federal.

## Stack

- Next.js 16 (App Router) + React 19
- MongoDB / Mongoose
- NextAuth v5 (credentials)
- Tailwind v4 + shadcn/ui
- Cloudinary (uploads)

## Setup

1. Copie `.env.local.example` para `.env.local` e preencha as variáveis (`MONGODB_URI`, `NEXTAUTH_SECRET`, `CLOUDINARY_*`, `EMAIL_*`, `SEED_ADMIN_*`).
2. Instale dependências:
   ```bash
   npm install
   ```
3. Inicialize o banco (apaga collections + cria turma V COPP + admin):
   ```bash
   npm run db:bootstrap
   ```
4. Suba o dev server:
   ```bash
   npm run dev
   ```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev`           | dev server |
| `npm run build`         | build de produção |
| `npm run start`         | servidor de produção |
| `npm run lint`          | ESLint |
| `npm test`              | Vitest (unit) |
| `npm run db:reset`      | drop das collections (com confirmação) |
| `npm run db:seed`       | cria turma V COPP + AppSettings + admin |
| `npm run db:bootstrap`  | reset + seed em sequência |

## Roles e cargos

- **Funções (`role`):** Aluno, Instrutor, Coordenador, Admin
- **Cargos PF (`cargo`):** APF, DPF, EPF, PPF

## Fluxo de aprovação

Novos cadastros entram com `status: pending`. Admin/Coordenador/Instrutor aprovam pelo `/admin/usuarios`. Quando `AppSettings.peerApprovalEnabled = true`, alunos aprovados também podem aprovar via `/aprovar-colegas`.
