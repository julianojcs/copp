# V COPP - System Documentation

> Sistema de gerenciamento de turma do V COPP (5o Curso de Operadores de Protecao a Pessoa).
> Single source of truth para a documentacao tecnica.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind 4 + shadcn/ui (Radix) |
| Linguagem | TypeScript 5 (strict, sem `any`) |
| Banco | MongoDB + Mongoose 9 |
| Auth | NextAuth 5 beta (Credentials + Google) |
| Form/validacao | react-hook-form + Zod 4 |
| Email | Nodemailer (SMTP) |
| Storage | Cloudinary (avatar, fotos) |
| Tests | Vitest 4 + happy-dom + Testing Library |

## Modelos (MongoDB)

### User (`src/models/user.ts`)

| Campo | Tipo | Notas |
|-------|------|-------|
| email | String, unique, lowercase | Obrigatorio |
| password | String, select:false | Opcional (OAuth-only nao tem senha) |
| emailVerified | Boolean | Habilitado por padrao (verify-email desligado neste app) |
| verificationToken / verificationTokenExpires | String / Date | Reset/verificacao |
| resetPasswordToken / resetPasswordTokenExpires | String / Date | Reset de senha |
| name | String | Obrigatorio (nome completo) |
| avatar | String | URL Cloudinary |
| role | enum(aluno, instrutor, coordenador, admin) | Default: `aluno` |
| cargo | enum(APF, DPF, EPF, PPF) | Obrigatorio exceto para `admin` |
| whatsapp | String | Obrigatorio (validado por regex BR) |
| courseId | ObjectId<Course> | Opcional |
| courseName | String | Resolvido em register a partir do AppSettings.activeCourseId |
| lotacaoId | ObjectId<Lotacao> | Obrigatorio - referencia a unidade da PF (collection `Lotacao`) |
| lotacaoSigla / lotacaoNome / lotacaoTipo | String | Denormalizados a partir da `Lotacao` selecionada para listagens rapidas |
| state | String, uppercase | Obrigatorio - derivado de `lotacao.uf` (nao editavel pelo usuario) |
| city | String, max 100 | Obrigatorio - derivado de `lotacao.cidade` (nao editavel pelo usuario) |
| status | enum(pending, approved, rejected) | Default: `pending` (requer aprovacao) |
| rejectedReason | String | Preenchido por moderador ao rejeitar |
| approvedBy / approvedAt | ObjectId<User> / Date | Auditoria de aprovacao |
| linkedin / instagram / twitter / bio | String | Perfil publico |
| googleId | String, unique, sparse | Conta OAuth |
| isActive / profileCompleted | Boolean | Flags de conta |

Indices:
- `{ courseId, role }`
- `{ status }`
- `{ state, city }`
- `{ lotacaoId }`
- `text: name + lotacaoSigla + lotacaoNome`

Pre-validate hook: invalida `cargo` quando `role !== admin` e cargo ausente.

### Lotacao (`src/models/lotacao.ts`)

Unidades oficiais da Policia Federal, alimentadas pelo CSV `docs/siglas_lotacoes_pf.csv` via `scripts/seed-lotacoes.ts`.

| Campo | Tipo | Notas |
|-------|------|-------|
| sigla | String, uppercase, trim | Obrigatorio (ex.: `SR/PF/DF`, `DPF/JFA/MG`) |
| nome | String, trim | Obrigatorio (ex.: "Superintendencia Regional no Distrito Federal") |
| tipo | enum(LOTACAO_TIPOS) | Obrigatorio - ver `src/models/lotacao.ts` |
| uf | String, uppercase | Obrigatorio - validado contra `VALID_UFS` |
| cidade | String, trim | Obrigatorio - sede da unidade |

Tipos (`LOTACAO_TIPOS`):
- `Unidade Central`, `Superintendencia Regional`, `Delegacia Regional`, `Delegacia de Fronteira`, `Delegacia Regional / Portuaria`

Indices:
- `{ sigla, uf }` unique - garante unicidade mesmo se siglas se repetem entre estados
- `{ uf }`, `{ tipo }`
- `text: nome + sigla`

### Course (`src/models/course.ts`)
Turma/edicao. Campos: name, code (unique), description, startDate, endDate, location, isActive.

### AppSettings (`src/models/app-settings.ts`)
Singleton de configuracao da aplicacao: brandName, brandFullName, institutionName, institutionFullName, description, activeCourseId, peerApprovalEnabled, developerName, developerLinkedinUrl. Lido via cache em `src/lib/app-settings.ts` (TTL 60s, fallback de 5s quando o DB esta indisponivel).

### Photo (`src/models/photo.ts`)
Foto da galeria: uploadedBy, url, publicId, thumbnailUrl, title, description, location, takenAt, taggedUsers[], likes[], isPublic. Indices: createdAt desc, taggedUsers, text(location+title+description). O campo `likes[]` e legado e sera removido na issue #6 quando a galeria migrar para o ReactionPicker; o sistema de reacoes oficial e a colecao `Reaction` (polimorfica).

### Reaction (`src/models/reaction.ts`)
Reacao emoji polimorfica (estilo Facebook) em fotos e mensagens. Campos: userId, targetType (`photo` | `message`), targetId, type (`like` | `love` | `laugh` | `wow` | `sad` | `angry`). Indices: unico em `(userId, targetType, targetId)` (1 reacao por usuario por alvo - trocar emoji e substituicao via upsert) + listagem em `(targetType, targetId, createdAt desc)`.

### Comment (`src/models/comment.ts`)
Comentario polimorfico em fotos e mensagens. Campos: userId, targetType (`photo` | `message`), targetId, body (1-1000 chars, trim), editedAt, deletedAt (soft delete), timestamps. Indices: `(targetType, targetId, createdAt desc)` para listagem por alvo + `(userId, createdAt desc)` para historico de autor. Soft delete preserva a posicao na thread; o body e mascarado como "Comentario removido" quando listado.

### Message (`src/models/message.ts`)
Post de texto (1-2000 chars, trim) com imagem opcional anexada (Cloudinary). Campos: authorId, body, image (`{ url, publicId, width, height }`), editedAt, deletedAt (soft delete), timestamps. Indices: `{ createdAt desc }` para feed, `{ authorId, createdAt desc }` para historico de autor, `{ body: text }` para busca futura. Soft delete mantem o documento (reactions e comments ficam validos) mas mascara body como "Mensagem removida" e descarta a imagem na serializacao.

## Reacoes (sistema)

API REST em `/api/reactions`:
- `POST` body `{ targetType, targetId, type }` - upsert (substituicao por chave unica)
- `DELETE` body `{ targetType, targetId }` - idempotente (no-op se nao existir)
- `GET ?targetType=&targetId=` - retorna `{ counts: Record<ReactionType, number>, total, userReaction: ReactionType | null }`

Status: `401` nao autenticado, `400` payload invalido (Zod), `404` alvo inexistente, `200` sucesso, `500` falha generica. Mensagens em pt-BR.

Migracao do legado `Photo.likes`: `npx tsx scripts/migrate-photo-likes-to-reactions.ts` (suporta `--dry-run`). Idempotente via indice unico - re-execucoes pulam duplicatas. O campo `Photo.likes` e o endpoint `POST /api/photos/[id]/like` ficam funcionais ate a issue #6 retroceder a galeria.

Suporte a `targetType: 'message'` esta declarado no enum, mas o lookup retorna 404 ate a issue #10 introduzir o modelo `Message`.

## Comentarios (sistema)

API REST em `/api/comments`:
- `POST` body `{ targetType, targetId, body }` - cria comentario (201)
- `GET ?targetType=&targetId=&cursor=&limit=&includeDeleted=` - lista paginado cursor-based (createdAt desc); `limit` 1-50 (default 20); `cursor` ISO datetime do ultimo item da pagina anterior; `includeDeleted=true` inclui soft-deleted com body mascarado
- `PATCH /api/comments/[id]` body `{ body }` - edita; **apenas autor** (admin nao pode reescrever); atualiza `editedAt`
- `DELETE /api/comments/[id]` - soft delete (autor ou admin); idempotente

Population do autor: apenas `name avatar cargo lotacaoSigla` - dados sensiveis (email, whatsapp) sao excluidos. Status: `401`, `400`, `403` (nao autor / nao admin), `404`, `410` (editar comentario removido), `200`/`201` sucesso, `500`.

Suporte a `targetType: 'message'` ativado: o lookup verifica que a mensagem existe e nao esta soft-deletada.

## Mensagens (sistema)

API REST em `/api/messages`:
- `POST` body `{ body, image? }` - cria mensagem (201). Texto obrigatorio mesmo com imagem; imagem `{ url, publicId, width, height }` obrigatoria nos 4 campos quando presente
- `GET ?cursor=&limit=` - feed paginado cursor-based (`createdAt` desc); `limit` 1-50 (default 20). Resposta inclui autor populado (campos seguros) e contagens agregadas de `reactionsCount`/`commentsCount` em uma unica pipeline `$lookup` (sem N+1). Soft-deletadas voltam com body mascarado e `image: null`
- `GET /api/messages/[id]` - detalhe com autor populado
- `PATCH /api/messages/[id]` body `{ body }` - edita; apenas autor; atualiza `editedAt`. Imagem nao e editavel por aqui
- `DELETE /api/messages/[id]` - soft delete (autor ou admin); idempotente

Status: `401`, `400` (Zod), `403` (nao autor / nao admin), `404`, `410` (editar removida), `200`/`201`, `500`. Mensagens em pt-BR.

### Componentes sociais (`src/components/social/`)

Quatro componentes reutilizaveis criados na issue #10, consumidos pela timeline (#11) e pela retroatividade da galeria (#12):

- `<ReactionPicker targetType targetId initialCounts? initialUserReaction?>` - botao + popover dos 6 emojis; toggle (POST/DELETE) com atualizacao otimista e rollback em erro
- `<CommentThread targetType targetId initialItems? initialNextCursor? totalCount? defaultCollapsed?>` - lista paginada + form de novo comentario; carrega primeira pagina ao expandir quando nao pre-carregada
- `<MessageCard message>` - header autor + body + imagem opcional (modal full-screen) + footer com ReactionPicker e CommentThread embutidos
- `<MessageComposer onSuccess?>` - textarea + anexar imagem opcional + submit; faz upload via `/api/upload` e cria via `POST /api/messages`

Date helper compartilhado: `formatRelativeTime` em `src/lib/date-utils.ts` retorna "agora ha pouco", "ha 3 min", "ha 2 h", "ha 5 dias" e cai para data absoluta pt-BR apos 7 dias.

## Autenticacao

- Provider: NextAuth Credentials (email/senha bcrypt) + Google OAuth (via complete-profile)
- Estrategia: JWT (`session.strategy = 'jwt'`, `maxAge = 30d`)
- Helpers: `auth()` exportado de `@/lib/auth`
- Sessao tipada em `SessionUser` (`src/types/index.ts`); inclui `lotacaoId`, `lotacaoSigla`, `lotacaoNome`, `lotacaoTipo` denormalizados para listagens sem lookup. `SESSION_KEYS` define os campos espelhados em JWT
- Login bloqueia se `!isActive` ou `status !== approved` lancando erros com prefixo `STATUS_*`

## RBAC (`src/lib/permissions.ts`)

| Helper | Quem pode |
|--------|-----------|
| canApprove(actor) | admin, coordenador, instrutor; aluno aprovado apenas se `peerApprovalEnabled=true` |
| canReject(actor) | admin, coordenador, instrutor |
| canEditUser(actor) | admin, coordenador |
| canEditSettings(actor) | admin |
| canManageCourses(actor) | admin, coordenador |
| canAssignAdminRole(actor) | admin |

## Localizacao

A localizacao geografica do usuario e **derivada da lotacao** (unidade da PF) selecionada. O usuario nunca digita `state` ou `city` diretamente; ambos sao copiados do registro `Lotacao` no servidor.

### Lotacao (PF units) - fonte primaria

O usuario escolhe a unidade via `LotacaoSelect`, que consome `GET /api/lotacoes`. Ao persistir, o backend copia `lotacao.uf` para `User.state` e `lotacao.cidade` para `User.city`, alem dos campos denormalizados (`lotacaoSigla`/`lotacaoNome`/`lotacaoTipo`). Forms exibem o resultado derivado em um bloco read-only de confirmacao.

### Componentes

- `src/components/profile/lotacao-select.tsx` - combobox em Dialog do shadcn com busca client-side por sigla, nome, UF ou cidade; debounce de 200ms; estados Loading/Empty/Error/Disabled; carrega a lista uma vez via `fetch('/api/lotacoes?limit=200')`. Inclui `DialogDescription` para acessibilidade.
- `src/hooks/use-ibge.ts` - mantido para fluxos que ainda precisem do IBGE (`StateSelect`/`CitySelect`). Apos a refatoracao para `Lotacao`, registracao/perfil nao usam mais este hook.
- `src/components/profile/state-select.tsx` / `city-select.tsx` - mantidos como utilitarios reutilizaveis. Atualmente o sistema os usa apenas para exibir state/city derivados (disabled).
- `src/lib/constants/brazilian-states.ts` - mapa estatico `BRAZILIAN_STATES` (UF -> nome), `VALID_UFS` (Set) e `getStateName(uf)`. Usado para validacao server-side de `state` (no proprio User e na Lotacao).

### Validacao

`src/lib/validations.ts`:
- `stateSchema`: string nao vazia, normalizada para uppercase, deve estar em `VALID_UFS`.
- `citySchema`: opcional, max 100 chars.
- `lotacaoIdSchema`: string 24-hex (ObjectId valido). Erro: "Lotacao invalida".
- `objectIdSchema`: helper generico para validacao de ObjectId.
- `registerSchema` e `profileSchema` exigem `lotacaoId` (NUNCA `state`/`city` diretos do cliente).

### Endpoints afetados

| Route | Mudancas |
|-------|----------|
| POST `/api/auth/register` | Recebe `lotacaoId`. Servidor faz `Lotacao.findById(lotacaoId)`, rejeita id inexistente (400), e copia `uf`/`cidade` + denormalizados para o User |
| POST `/api/auth/complete-profile` | Idem (fluxo OAuth) |
| PUT `/api/users/[id]` | Idem - resolve lotacaoId e atualiza state/city/lotacaoSigla/lotacaoNome/lotacaoTipo no User |
| PATCH `/api/admin/users/[id]` | Whitelist inclui `lotacaoId`; resolucao server-side garante consistencia. NUNCA aceita `state`/`city` diretos |
| GET `/api/users` | `.select(...)` retorna `lotacaoId, lotacaoSigla, lotacaoNome, lotacaoTipo, state, city` |
| GET `/api/lotacoes` | Endpoint publico para popular o combobox. Suporta filtros `uf`, `tipo`, `q` (busca em sigla/nome) e `limit` (max 200). Aplica escape de regex em `q` |

## Mudanca de senha

Endpoint: `POST /api/users/[id]/change-password`

- Auth obrigatoria (401 se nao logado)
- Usuario so pode trocar a propria senha (403 se `session.user.id !== id`)
- Valida payload com `changePasswordSchema` (currentPassword, newPassword, confirmPassword; newPassword != currentPassword; newPassword === confirmPassword)
- Compara `currentPassword` com hash via bcrypt; retorna 400 em caso de senha incorreta
- Contas OAuth-only (sem password) retornam 400 com mensagem dedicada
- Sucesso: rehash com `bcrypt.hash(newPassword, 12)` e `user.save()`

UI: card "Alterar Senha" em `src/app/(dashboard)/profile/page.tsx` consumindo o endpoint via `fetch`.

## Testes

- Runner: Vitest 4 com `projects` em `vitest.config.ts`
  - Projeto `node`: `*.test.ts` em ambiente Node (logica pura + route handlers via `vi.mock`)
  - Projeto `dom`: `*.test.tsx` em ambiente happy-dom com Testing Library; setup em `src/test/setup-dom.ts`
- Convencoes: as asserts seguem o convencional Vitest (`toBe`, `toMatchObject`, `toHaveBeenCalledTimes`, `toBeTruthy`); `toBeInTheDocument`/`toBeDisabled` (jest-dom) NAO sao usados - prefira `screen.queryByText(...)` e `element.hasAttribute(...)` para a11y/state.

### Cobertura atual (162 testes em 15 arquivos)

**Unit (logica pura)**
- `src/lib/__tests__/validations.test.ts` - whatsapp, fullName, state, city, lotacaoId, password, register, profile, changePassword (24 testes)
- `src/lib/constants/__tests__/brazilian-states.test.ts` - BRAZILIAN_STATES, VALID_UFS, getStateName
- `src/lib/__tests__/permissions.test.ts` - canApprove/canReject/canEdit*/canAssignAdminRole
- `src/lib/__tests__/app-settings.test.ts` - cache + invalidate + fallback quando DB falha
- `src/models/__tests__/lotacao.test.ts` - validacao do schema (sigla uppercase, uf contra VALID_UFS, tipo enum, todos os tipos validos, campos required)

**Integration (rotas de API com mocks)**
- `src/app/api/auth/register/__tests__/route.test.ts` - validacao, criacao com lotacao normalizada, conflito de email, falha de email opcional
- `src/app/api/auth/complete-profile/__tests__/route.test.ts` - validacao, role=admin sem cargo, resolucao de lotacao, conflitos
- `src/app/api/users/[id]/__tests__/route.test.ts` - 401/403, owner vs admin, validacao, resolucao de lotacao, profileCompleted, troca de email com token e envio
- `src/app/api/users/[id]/change-password/__tests__/route.test.ts` - 401/403/404, OAuth-only, senha incorreta, sucesso
- `src/app/api/admin/users/[id]/__tests__/route.test.ts` - 401/403, whitelist de campos (state/city dropados), resolucao de lotacaoId, validacao de id, regra de admin role
- `src/app/api/lotacoes/__tests__/route.test.ts` - listagem padrao, filtro por uf (uppercased + UF invalida 400), filtro por tipo, busca q em sigla/nome com escape de regex, limit clamping, erro 500

**UI (componentes React)**
- `src/hooks/__tests__/use-ibge.test.tsx` - fetch states/cities, errors, init UF, clear UF
- `src/components/profile/__tests__/state-select.test.tsx` - estados Default/Loading/Disabled/Empty
- `src/components/profile/__tests__/city-select.test.tsx` - estados Default/Loading/Disabled/Empty + dependencia em hasState
- `src/components/profile/__tests__/lotacao-select.test.tsx` - placeholder, label do selecionado, abertura do dialog, filtro por sigla, selecao, clear, erro, empty state, disabled

### Principios aplicados (F.I.R.S.T.)

- **Fast**: testes unitarios em milissegundos; sem rede real (`fetch` e `bcrypt` mockados); models usam `validateSync()` sem conexao com Mongo
- **Independent**: cada `it()` faz reset de mocks em `beforeEach`; nenhuma fixture compartilhada mutavel
- **Repeatable**: sem dependencia de hora/rede; uso de fixtures determinadas (`VALID_ID`, `sampleLotacao`)
- **Self-checking**: assertivas explicitas (`toBe`, `toMatch`, `toMatchObject`, `toHaveBeenCalledTimes`, `hasAttribute`)
- **Timely**: novos testes acompanham o refator no mesmo PR/commit; CSV corrections em `seed-lotacoes` cobertos via testes do model + integracao

## Scripts

| Script | Funcao |
|--------|--------|
| `npm run dev` | Next dev server |
| `npm run build` | Build de producao |
| `npm run lint` | ESLint |
| `npm test` | Vitest run (todos os projetos) |
| `npm run test:watch` | Vitest watch |
| `npm run db:reset` | Limpa o banco (`scripts/reset-db.ts`) |
| `npm run db:seed` | Popula AppSettings + Course V COPP + admin bootstrap |
| `npm run db:bootstrap` | reset + seed |
| `npx tsx scripts/seed-lotacoes.ts` | Importa as 121 unidades da PF do CSV `docs/siglas_lotacoes_pf.csv` (idempotente; normaliza siglas para uppercase e corrige defensivamente o typo "Regional al em") |

## Convencoes

- Idioma: codigo/variaveis em ingles; UI/mensagens em pt-BR com acentuacao correta; commits em ingles sem referencia ao Claude
- Datas: usar `formatInTimezone` / `formatDateOnly` de `@/lib/date-utils` (timezone `America/Sao_Paulo`)
- TypeScript: proibido `any`; use `unknown` ou interfaces especificas
- Early return para falhas e validacoes; `async/await` com `try/catch`
- Mongoose models: padrao `models.X || model<...>(...)` para evitar recompilacao em hot-reload
- Lint: zero erros/warnings em `main`; suppressions inline sao OK quando bem documentadas (ex.: `react-hooks/set-state-in-effect` em padroes de hidratacao/fetch-on-mount intencional)
- `state`/`city` no `User` sao DERIVADOS - server-side somente; clientes NUNCA enviam esses campos
