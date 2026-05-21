# V COPP Refactor — Design

**Data:** 2026-05-21
**Autor:** Juliano Costa Silva (com assistência da Claude Code)
**Status:** Aprovado para implementação

## Contexto

O repositório `COPP` contém um app Next.js originalmente construído como "IBS London classmate registration system" (commit inicial `26b6a0e`). O sistema oferece autenticação, perfil de usuário, diretório de colegas e galeria de fotos.

Este documento descreve o refactor para transformar o app no **sistema da turma do V COPP** — 5º Curso de Operadores de Proteção a Pessoa, ministrado pela Academia Nacional de Polícia (ANP) da Polícia Federal.

## Objetivos

- Rebrand completo de "IBS London" para "V COPP / ANP"
- Idioma: PT-BR (atualmente EN)
- Coletar dos alunos: **nome completo, email, WhatsApp, Lotação** (texto livre)
- Suportar cargos da PF: APF, DPF, EPF, PPF
- Suportar funções no curso: Aluno, Instrutor, Coordenador, Admin
- Cadastro aberto com aprovação por administração
- Permitir (via configuração) que alunos aprovados aprovem novos cadastros (peer approval)
- Manter todas as funcionalidades existentes (diretório, galeria, perfil)
- Manter suporte multi-turma (apenas V COPP cadastrada inicialmente)

## Abordagem escolhida

**B — Refactor + camada de configuração no banco**, com `AppSettings` (singleton) gerenciando branding e turma ativa, e o model `Course` mantido para multi-turma.

## 1. Modelo de dados

### 1.1 Constantes

```ts
// src/lib/constants.ts
export const USER_ROLES = {
  ALUNO: 'aluno',
  INSTRUTOR: 'instrutor',
  COORDENADOR: 'coordenador',
  ADMIN: 'admin',
} as const
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

export const PF_CARGOS = {
  APF: 'APF',   // Agente de Polícia Federal
  DPF: 'DPF',   // Delegado de Polícia Federal
  EPF: 'EPF',   // Escrivão de Polícia Federal
  PPF: 'PPF',   // Papiloscopista de Polícia Federal
} as const
export type PFCargo = typeof PF_CARGOS[keyof typeof PF_CARGOS]

export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]
```

> O enum `USER_ROLES` é **reaproveitado**: tinha valores `student/teacher/advisor/coordinator` e passa a ter os valores PT-BR acima. Conceitualmente é o mesmo campo (papel no sistema), só com vocabulário atualizado.

### 1.2 Model `User` (modificações no schema existente)

Campos **mantidos**: `email`, `password`, `googleId`, `name`, `avatar`, `role` (com novos valores), `courseName`, `city`, `country`, `bio`, `company`, `linkedin`, `instagram`, `github`, `twitter`, `emailVerified`, `isActive`, `profileCompleted`, `createdAt`, `updatedAt`, tokens de verificação/reset.

Campos **modificados**:
- `whatsapp`: opcional → **obrigatório**
- `city`, `country`: obrigatórios → **opcionais**
- `role`: valores PT-BR (aluno/instrutor/coordenador/admin); default `aluno`
- `courseName`: **continua obrigatório** (snapshot textual da turma; o seed/registro preenche automaticamente com o `name` do `Course` ativo)

Campos **novos**:
- `cargo?: PFCargo` — obrigatório quando `role !== 'admin'`
- `lotacao: string` — obrigatório, texto livre, máx 200 chars
- `status: UserStatus` — default `pending`
- `rejectedReason?: string` — preenchido quando admin rejeita
- `courseId?: ObjectId` — FK para `Course`
- `approvedBy?: ObjectId` — FK para o `User` que aprovou (auditoria)
- `approvedAt?: Date` — timestamp da aprovação

### 1.3 Model `AppSettings` (novo, singleton)

```ts
interface IAppSettings extends Document {
  brandName: string                    // "V COPP"
  brandFullName: string                // "5º Curso de Operadores de Proteção a Pessoa"
  institutionName: string              // "ANP"
  institutionFullName: string          // "Academia Nacional de Polícia — Polícia Federal"
  description: string                  // texto descritivo do hero/home
  activeCourseId: Types.ObjectId       // FK → Course atual
  peerApprovalEnabled: boolean         // default false
  developerName: string                // "Juliano Costa Silva"
  developerLinkedinUrl: string         // URL do LinkedIn do dev
  updatedAt: Date
}
```

Convenção: **um único documento** por deploy. Acesso via `AppSettings.findOne()`. Acesso na aplicação via helper com cache (ver §3.1).

### 1.4 Model `Course` (mantido)

Sem mudanças estruturais. Permanece com `name`, `code`, `description`, `startDate`, `endDate`, `location`, `isActive`. O seed cria a turma V COPP e o `AppSettings.activeCourseId` aponta para ela.

### 1.5 Validações (Zod, em `src/lib/validations.ts`)

- `name`: 5–100 chars; obriga pelo menos um espaço interno (nome + sobrenome)
- `email`: formato email
- `password`: 8+ chars com maiúscula, minúscula e número
- `whatsapp`: regex aceitando `(11) 99999-9999`, `11999999999`, `+55 11 99999-9999`
- `lotacao`: 1–200 chars
- `cargo`: enum PF_CARGOS — obrigatório se `role !== 'admin'`, opcional para admin
- `role`: enum USER_ROLES — no endpoint público de registro o backend força `aluno` (cliente não escolhe)
- `bio`: opcional, máx 500 chars
- Campos opcionais (linkedin, github, etc.): mantidos do app atual

### 1.6 Índices

- `email` (único — já existe)
- `googleId` (único + sparse — já existe)
- `courseId + role` (composto, novo — listagem do diretório)
- `status` (novo — filtro de pendentes no admin)
- text index em `name + lotacao` (atualizado — substitui o text só em `name`)

## 2. Fluxo de cadastro e aprovação

### 2.1 Estados de status

```
[register] → pending → (moderador) → approved → pode logar
                                  ↘ rejected   → bloqueado
```

### 2.2 Fluxo do aluno (cadastro padrão)

1. Acessa `/register` e preenche: nome, email, senha, WhatsApp, Lotação, Cargo (APF/DPF/EPF/PPF).
2. Backend cria o usuário com `role: 'aluno'`, `status: 'pending'`, `courseId: <V COPP>`, `courseName: 'V COPP'`.
3. Email de boas-vindas: "Cadastro recebido. Sua conta está em análise pela coordenação."
4. Se tentar logar antes da aprovação, NextAuth lança erro `STATUS_PENDING` e a página `/login` redireciona para `/aguardando-aprovacao` com mensagem explicativa.
5. Após aprovação, recebe email "Conta liberada" e o login funciona normalmente.
6. Se rejeitado, recebe email com `rejectedReason` (se preenchido) e tentativas de login mostram mensagem específica.

### 2.3 Fluxo de moderação

Listagem em `/admin/usuarios` com filtro padrão `status=pending`. Ações por linha: **Aprovar**, **Rejeitar** (modal opcional para motivo), **Reativar** (em rejeitados), **Editar**, **Desativar**.

Ações em lote: seleção múltipla → **Aprovar selecionados**.

### 2.4 Mudanças no NextAuth (`src/lib/auth.ts`)

Após verificar `isActive`, adicionar:

```ts
if (user.status !== 'approved') {
  throw new Error(`STATUS_${user.status.toUpperCase()}`)
}
```

A página `/login` mapeia os erros para mensagens PT-BR:
- `STATUS_PENDING` → "Sua conta está aguardando aprovação."
- `STATUS_REJECTED` → "Seu cadastro foi rejeitado. Entre em contato com a coordenação."

Também atualizar `Session` / `User` / `JWT` types para incluir os novos campos (`cargo`, `lotacao`, `status`, `courseId`).

### 2.5 Bootstrap do primeiro admin

O script `scripts/seed.ts` cria o admin inicial lendo do `.env.local`:

```
SEED_ADMIN_EMAIL=...
SEED_ADMIN_PASSWORD=...
SEED_ADMIN_NAME="Coordenador V COPP"
```

Esse admin nasce com `status: 'approved'`, `role: 'admin'`, `cargo: undefined`, `lotacao: 'ANP'`. Sem ele, ninguém pode aprovar os primeiros alunos.

## 3. Configuração e permissões

### 3.1 Helper `AppSettings`

```ts
// src/lib/app-settings.ts
let cached: { value: IAppSettings; expiresAt: number } | null = null
const TTL_MS = 60_000

export async function getAppSettings(): Promise<IAppSettings> {
  if (cached && cached.expiresAt > Date.now()) return cached.value
  await connectDB()
  const doc = await AppSettings.findOne()
  if (!doc) return DEFAULT_APP_SETTINGS  // fallback em PT-BR
  cached = { value: doc, expiresAt: Date.now() + TTL_MS }
  return doc
}

export function invalidateAppSettingsCache() {
  cached = null
}
```

Toda mutação em `/api/admin/settings` invalida o cache.

### 3.2 Permissões (`src/lib/permissions.ts`)

```ts
export async function canApprove(actor: IUser): Promise<boolean> {
  if (['admin', 'coordenador', 'instrutor'].includes(actor.role)) return true
  if (actor.role === 'aluno' && actor.status === 'approved') {
    const settings = await getAppSettings()
    return settings.peerApprovalEnabled
  }
  return false
}

export function canReject(actor: IUser): boolean {
  return ['admin', 'coordenador', 'instrutor'].includes(actor.role)
}

export function canEditUser(actor: IUser): boolean {
  return ['admin', 'coordenador'].includes(actor.role)
}

// Apenas admin pode atribuir/remover a role 'admin'
export function canAssignAdminRole(actor: IUser): boolean {
  return actor.role === 'admin'
}

export function canEditSettings(actor: IUser): boolean {
  return actor.role === 'admin'
}

export function canManageCourses(actor: IUser): boolean {
  return ['admin', 'coordenador'].includes(actor.role)
}
```

### 3.3 Matriz de permissões

| Ação                        | Admin | Coordenador | Instrutor | Aluno (peer ON) | Aluno (peer OFF) |
| --------------------------- | :---: | :---------: | :-------: | :-------------: | :--------------: |
| Aprovar pendente            |  ✅   |     ✅      |    ✅     |       ✅        |        ❌        |
| Rejeitar pendente           |  ✅   |     ✅      |    ✅     |       ❌        |        ❌        |
| Reativar rejeitado          |  ✅   |     ✅      |    ❌     |       ❌        |        ❌        |
| Editar role/cargo de outros |  ✅   |     ✅      |    ❌     |       ❌        |        ❌        |
| Desativar usuário           |  ✅   |     ✅      |    ❌     |       ❌        |        ❌        |
| Editar `AppSettings`        |  ✅   |     ❌      |    ❌     |       ❌        |        ❌        |
| Ver lista de pendentes      |  ✅   |     ✅      |    ✅     |       ✅        |        ❌        |
| Promover a `admin`          |  ✅   |     ❌      |    ❌     |       ❌        |        ❌        |

> Coordenador é admin "light": tudo de moderação exceto editar configurações globais e promover a admin.

## 4. Painel admin

### 4.1 Rotas

```
src/app/(admin)/
└── admin/
    ├── page.tsx                    # redirect → /admin/usuarios
    ├── usuarios/
    │   ├── page.tsx                # lista + filtros + ações
    │   └── [id]/page.tsx           # edição detalhada
    ├── configuracoes/page.tsx      # AppSettings
    └── turmas/
        ├── page.tsx
        └── [id]/page.tsx
```

`(admin)/layout.tsx` é server component que chama `auth()` e redireciona para `/dashboard` se o usuário não tiver role admin/coordenador/instrutor.

### 4.2 `/admin/usuarios` — capacidades

- **Filtros:** status, role, cargo, turma (`courseId`), busca por texto (nome/email/lotação)
- **Tabela:** avatar, nome, email, role, cargo, lotação, status, criado em
- **Badges visuais** para status
- **Ações por linha:** Aprovar / Rejeitar / Reativar / Editar / Desativar
- **Ações em lote:** Aprovar selecionados
- **Contador no topo:** "X pendentes aguardando aprovação"

### 4.3 `/admin/usuarios/[id]` — edição

Formulário com todos os campos do User. Admin/Coordenador podem alterar `role`, `cargo`, `courseId`, `status`, `isActive` e todos os campos opcionais. Promover a `admin` exige confirmação explícita.

### 4.4 `/admin/configuracoes`

Form para editar `brandName`, `brandFullName`, `institutionName`, `institutionFullName`, `description`, `activeCourseId` (select), `peerApprovalEnabled` (switch), `developerName`, `developerLinkedinUrl`.

Salvar → invalida cache do `AppSettings`.

### 4.5 `/admin/turmas`

CRUD básico para gerenciar `Course` (nome, código, datas, local, ativa). Permite cadastrar VI COPP no futuro.

### 4.6 Peer approval — `/aprovar-colegas`

- Rota acessível por alunos aprovados **somente quando `peerApprovalEnabled = true`**
- Tabela de pendentes com botão único **Aprovar** por linha
- Sem rejeitar, sem editar, sem desativar
- Item de menu condicional no header (some quando flag está off)

### 4.7 APIs novas

```
GET    /api/admin/users                     — lista paginada com filtros
PATCH  /api/admin/users/[id]                — guarda: canEditUser
PATCH  /api/admin/users/[id]/approve        — guarda: canApprove
PATCH  /api/admin/users/[id]/reject         — guarda: canReject
POST   /api/admin/users/bulk-approve        — guarda: canApprove

GET    /api/admin/settings                  — guarda: canEditSettings
PATCH  /api/admin/settings                  — guarda: canEditSettings (invalida cache)

GET    /api/admin/courses                   — guarda: canManageCourses
POST   /api/admin/courses                   — guarda: canManageCourses
PATCH  /api/admin/courses/[id]              — guarda: canManageCourses

GET    /api/peer/pending                    — guarda: canApprove
PATCH  /api/peer/users/[id]/approve         — guarda: canApprove
```

### 4.8 Middleware

`src/middleware.ts` estendido para proteger:
- `/admin/*` — exige role admin/coordenador/instrutor
- `/aprovar-colegas` — exige `canApprove` (decisão final feita no layout server-side; middleware faz só o redirect baseado em role + flag)

## 5. i18n / textos PT-BR

### 5.1 Estratégia

- Sem biblioteca de i18n (app monolíngue).
- **Textos editáveis pelo admin** (marca, descrição, instituição) → `AppSettings`.
- **Textos fixos da UI** (labels, mensagens de erro, botões) → `src/lib/i18n.ts`.

### 5.2 `src/lib/i18n.ts` (estrutura)

Constantes `MESSAGES` (validações, auth, sucesso), `CARGO_LABELS`, `ROLE_LABELS`, `STATUS_LABELS`. Detalhes em §1 e §3 do design (apresentado no brainstorming).

### 5.3 Templates de email (PT-BR)

`src/lib/email.ts` ganha:
- `welcomeEmail` (após cadastro, status pending)
- `accountApprovedEmail`
- `accountRejectedEmail` (com `rejectedReason` opcional)
- `passwordResetEmail` (existente, traduzir)

Todos puxam `brandName` e `institutionName` do `AppSettings` no momento do envio.

## 6. Limpeza e bootstrap do banco

### 6.1 Scripts

```
scripts/
├── reset-db.ts     # dropa users, photos, courses, appsettings
└── seed.ts         # cria AppSettings + Course V COPP + admin inicial
```

`reset-db.ts` exige confirmação interativa digitando o nome do DB para evitar acidente.

### 6.2 `package.json`

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "db:reset": "tsx scripts/reset-db.ts",
  "db:seed": "tsx scripts/seed.ts",
  "db:bootstrap": "npm run db:reset && npm run db:seed"
}
```

`tsx` adicionado como devDependency.

### 6.3 `.env.local`

Variáveis novas:
```
SEED_ADMIN_EMAIL=...
SEED_ADMIN_PASSWORD=...
SEED_ADMIN_NAME="Coordenador V COPP"
```

## 7. Sequência de implementação

1. **Fundação** — constants, types, validações, model `AppSettings`, model `User` atualizado
2. **Camada de leitura** — `lib/app-settings.ts`, `lib/permissions.ts`, `lib/i18n.ts`
3. **Auth + middleware** — `auth.ts`, `middleware.ts`, fluxo de status, types da session
4. **Cadastro + aprovação** — `/register`, `/aguardando-aprovacao`, `/login`, emails
5. **Painel admin** — rotas `(admin)/*` + APIs `/api/admin/*`
6. **Peer approval** — `/aprovar-colegas` + APIs `/api/peer/*`
7. **UI pública** — home, dashboard, colleagues, gallery, profile, header, footer (PT-BR + branding dinâmica)
8. **Scripts + bootstrap** — `reset-db.ts`, `seed.ts`, `package.json`, `.env.local`
9. **Smoke test manual** — `db:bootstrap`, cadastro de teste, aprovação, navegação completa

## 8. Pontos de atenção

### 8.1 Duplicação em `auth.ts`

O arquivo declara campos do usuário em 3 lugares (Session, User, JWT) e replica nos callbacks. Cada campo novo exige 6+ alterações. Vou extrair um tipo compartilhado `SessionUser` em `src/types/index.ts` para reduzir essa repetição.

### 8.2 Cache do `AppSettings`

TTL de 60s + invalidação em PATCH. Suficiente para o volume do app (1 turma, poucas dezenas de usuários). Se virar bottleneck no futuro, considerar Redis ou Edge Config.

### 8.3 Guards em layouts vs middleware

Middleware faz check rápido por cookie/JWT; layouts server-side fazem o check definitivo com `auth()` + leitura do DB. Mesma estratégia já existente no app.

### 8.4 Promoção a admin

Apenas admin pode promover outro usuário a admin. Enforcement:
- **Backend** (`PATCH /api/admin/users/[id]`): se o payload muda `role` para `admin` (ou de `admin` para outro), exige `canAssignAdminRole(actor)` além de `canEditUser(actor)`. Coordenador que tentar promover a admin recebe 403.
- **UI**: select de `role` no form de edição esconde a opção `admin` quando o ator não é admin. Quando aparece, exige confirmação modal.

### 8.5 Coexistência de `courseName` (string) e `courseId` (FK)

`courseName` permanece como snapshot textual (compatibilidade + facilita display sem populate). `courseId` é a referência canônica usada nos filtros/joins. O seed garante consistência.

## 9. Fora de escopo

- Cadastro por convite (admin pré-cadastra emails)
- Export CSV / Excel no admin
- Notificações em tempo real (websocket)
- Multi-idioma além de PT-BR
- Mobile app
- Integração com sistemas internos da PF
- Auditoria completa (log de quem alterou o quê)
- 2FA / login com certificado digital
