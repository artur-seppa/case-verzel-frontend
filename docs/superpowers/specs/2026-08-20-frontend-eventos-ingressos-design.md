# Frontend — Plataforma de Eventos e Ingressos

Data: 2026-08-20
Status: aprovado, pronto para plano de implementação

## Contexto

O backend (`../case-verzel-api`, repositório irmão) já está implementado: NestJS + Fastify + TypeORM/PostgreSQL, Clean Architecture, autenticação por cookies httpOnly (`access_token`/`refresh_token`), pagamento assíncrono via fila (BullMQ) + SSE, assentos com lock pessimista, ingresso com QR assinado por HMAC. Este documento cobre só o frontend (`case-verzel-web`, Next.js App Router, já scaffolded com as rotas mas sem as telas implementadas).

Origem do escopo: `Desafio-Elite-Dev-2026.pdf` (case da Verzel). Pontos do brief que guiam decisões daqui pra frente:
- "Fuja do AI slop" — interface não pode ter a cara padrão de ferramenta geradora.
- "Prefira o fluxo inteiro simples e completo a um pedaço sofisticado com telas pela metade."
- Dados de teste devem estar semeados (já estão, via `npm run seed` no backend).

## Escopo confirmado

- Catálogo: só TMDb (filmes), não Ticketmaster (shows) — é o que o backend implementa.
- Reserva: só mapa de assentos numerados (cinema/teatro), não fluxo de quantidade/pista.
- **Uma reserva = um assento = um ingresso = um pagamento.** `POST /reservations` aceita só um `seatId`; não há carrinho nem seleção múltipla. Isso é uma leitura do contrato existente, não uma limitação imposta por nós — está alinhado com "reserva seu lugar" (singular) no brief.

Todas as rotas necessárias já existem em `src/app/` (scaffold do commit `80c7463`) e mapeiam 1:1 pros fluxos exigidos — não há rota nova a criar, só telas a implementar:

| Rota | Papel | Fluxo |
|---|---|---|
| `(public)/` | público | listagem de eventos |
| `(public)/eventos/[id]` | público | detalhe do evento + mapa de assentos |
| `(auth)/login`, `(auth)/registro` | público | autenticação |
| `checkout/[reservationId]` | cliente | pagamento simulado |
| `meus-ingressos` | cliente | ingressos do usuário |
| `ingressos/[shareToken]` | público | ingresso compartilhado |
| `organizador/eventos`, `organizador/eventos/novo` | organizador | gestão de eventos |
| `portaria` | portaria | validação de ingresso |

## Arquitetura

### Estrutura de pastas (feature-based, já iniciada)

```
src/
  app/                      → rotas (App Router), só composição de páginas
  features/
    auth/                   → login/registro, useCurrentUser, RoleGate
    events/                 → catálogo público (lista+detalhe), lista/criação do organizador
    catalog/                → picker de filme TMDb (criação de evento)
    reservations/           → mapa de assentos, seleção, mutation de criar reserva
    payments/                → formulário de cartão, useSSEPaymentStatus
    tickets/                 → meus ingressos, detalhe, QR, página de compartilhamento
    gatekeeper/               → scanner, entrada manual, resultado da validação
  shared/
    api-client/              → wrapper fetch (existente) + interceptor de refresh em 401
    theme/                   → tema MUI customizado
    ui/                      → primitivos compartilhados que não vêm prontos do MUI
    hooks/
```

Cada feature expõe `components/`, `api/` (query keys + funções + hooks React Query) e `types.ts`. Páginas em `app/` ficam finas, só compondo componentes de feature.

### Stack de estilo: Material UI, tema customizado — sem Tailwind

Decisão: `@mui/material` + `@emotion/react` + `@emotion/styled`, com `ThemeProvider` próprio (paleta, tipografia e overrides de componente customizados, definidos com a skill `frontend-design` na hora de implementar). Motivo de trocar: MUI de fábrica é o exemplo mais reconhecível de "cara de ferramenta" que o brief pede pra evitar — por isso o tema não pode ficar no default, tem que ser realmente customizado (paleta, tipografia, `MuiButton`/`MuiCard`/etc. via `components` no theme).

Tailwind (`tailwindcss`, `@tailwindcss/postcss`, `postcss.config.mjs`, diretivas em `globals.css`) sai do projeto para não ter dois sistemas de estilo coexistindo. `globals.css` passa a só ter reset mínimo complementar ao `CssBaseline` do MUI.

Uso do MUI: componentes de comportamento complexo (`Dialog`, `Select`/`Autocomplete` no picker de filme, `Stepper` no checkout, `Snackbar` para toasts de erro) ficam por conta do MUI. Peças muito específicas do domínio (grid de assentos, stub de ingresso) são construídas à mão dentro de `features/*/components`, estilizadas via `sx`/`styled` do MUI pra herdar o tema.

### Busca de dados: split Server Components / TanStack Query

- **Público, não-interativo** (`/`, `/eventos/[id]`): Server Components com `fetch` nativo contra os endpoints públicos — sem JS de cliente, primeira pintura rápida. Já é o que o README do projeto define.
- **Protegido/interativo** (seleção de assento, checkout, meus ingressos, organizador, portaria): Client Components com TanStack Query — precisam de mutation, polling, SSE ou câmera.

## Autenticação

- Cookies `access_token` (15 min) / `refresh_token` (7 dias), httpOnly, mesmo site (`localhost:3001` ↔ `localhost:3000`, `sameSite=lax` funciona sem proxy).
- `src/proxy.ts` mantém a checagem otimista atual (presença do cookie `access_token` nas rotas protegidas) — sem mudança necessária ali.
- **Refresh transparente**: interceptor no `api-client` — em `401`, chama `POST /auth/refresh` uma vez (deduplicado se várias requisições caírem em 401 ao mesmo tempo), reexecuta a requisição original; se o refresh falhar, redireciona pra `/login?redirectTo=`.
- **Gate de papel**: só no client, via `useCurrentUser()` (`GET /auth/me`, cacheado) + `<RoleGate role="organizer">` por página protegida. O `403` do backend é a fonte de verdade real; o gate é só UX pra não piscar a tela errada.

## Reserva e checkout

O backend vai ganhar `GET /reservations/:id` (fora do escopo já implementado, adicionado pelo usuário em paralelo). Contrato assumido pelo frontend:

```ts
GET /api/reservations/:id   role: client, dono apenas → 404 caso contrário
→ {
  id: string
  status: "pending_payment" | "processing" | "confirmed" | "cancelled" | "declined"
  expiresAt: string
  createdAt: string
  event: { id: string; title: string; posterUrl: string | null; date: string; location: string; price: string }
  seat: { id: string; label: string }
}
```

Fluxo: clique num assento disponível no detalhe do evento → `POST /reservations` → `router.push('/checkout/'+id)` → checkout faz `useQuery(['reservation', id], ...)` contra o novo endpoint. Funciona tanto em navegação client-side quanto em refresh/link direto, sem precisar de `sessionStorage`.

Contagem regressiva até `expiresAt` desabilita o botão de pagar preventivamente; a expiração real continua sendo garantida pelo backend (lazy + `pg_cron`), a contagem no cliente é só UX.

## Pagamento (SSE)

1. Envia cartão → `POST /reservations/:id/payment` (`202`, `status: "processing"`).
2. Abre `new EventSource(url, { withCredentials: true })` — obrigatório pra cookie viajar cross-origin (portas diferentes).
3. Trata o evento único: `confirmed` → redireciona pro ingresso; `declined` → erro inline, permite tentar de novo (reserva continua `pending_payment`, alinhado com o design do backend); `error` ou timeout de cliente (~30s sem evento) → falha genérica com botão "tentar novamente".

## Mapa de assentos

Grid agrupado por linha (letra), até 10 assentos por linha / 26 linhas (`generateSeatGrid`, capacidade máx. 260). Legenda: disponível / reservado (held) / vendido. Seleção única (não é multi-select — reforça a regra de "um assento por reserva"). CSS Grid simples, sem necessidade de canvas/virtualização nesse volume.

## Ingressos e compartilhamento

`meus-ingressos`, detalhe e página de compartilhamento só renderizam `ticket.qrToken` via `qrcode.react` como veio do backend — nenhuma lógica de geração/decodificação no cliente (o token já vem assinado com HMAC).

## Portaria

Leitura por câmera (`html5-qrcode`) com entrada manual do código como alternativa (ambos já nas dependências).

**Gap real do backend**: `POST /gatekeeper/validate` não recebe `eventId` e não compara contra nenhum — só retorna o evento a que o ingresso pertence. Não existe "evento errado" no backend. Solução client-side: a tela de portaria pede pro operador selecionar/confirmar o evento antes de escanear (dropdown via `GET /events`). Depois da resposta `200`, compara `response.event.id` com o evento selecionado:

- combina → **válido** (verde)
- não combina → **evento errado** (âmbar) — com aviso explícito de que o ingresso já foi marcado `used` no backend mesmo assim, já que não dá pra escopar a validação por evento sem mudar o backend
- `401`/`404` → **inválido** (vermelho)
- `409` → **já utilizado** (vermelho)

## Tratamento de erro

Mapeamento central de `ApiError.error` → mensagem por contexto (ex.: `CONFLICT` ao reservar assento → "esse assento acabou de ser reservado por outra pessoa"), em vez de expor a mensagem crua do backend. `VALIDATION_ERROR` (`message: string[]`, um item por campo Zod) mapeia pra erros de campo no react-hook-form quando o prefixo bate com um nome de campo conhecido; senão, toast genérico via `Snackbar`.

## Testes

Vitest + Testing Library (já configurado). Foco no que tem ramificação real e quebra silenciosamente: interceptor de refresh do `api-client`, lógica de seleção/grid de assentos, mapeamento de resultado da portaria, lógica de expiração/contagem regressiva. Sem e2e (Playwright não está nas dependências, não compensa adicionar pro escopo do case).

## Identidade visual

Definida em detalhe com a skill `frontend-design` na hora de implementar, não neste documento. Direção preliminar: estética ligada ao domínio de cinema (pôster como imagem hero, motivo de canhoto de ingresso), evitando o visual clean/SaaS genérico — inclusive porque é o que justifica trocar Tailwind por um tema MUI customizado em vez de manter o default.

## Ordem de construção

Seguindo a própria dica do brief ("faça o básico rodar de ponta a ponta e só depois agregue valor"):

- **Fase 1**: todo o fluxo feliz ponta a ponta (navegar → reservar → pagar → ver ingresso → validar na portaria) com estilo mínimo, cada tela funcional mas não polida.
- **Fase 2**: identidade visual (tema MUI definitivo via `frontend-design`), estados de erro/borda, testes.
