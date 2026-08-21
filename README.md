# Case Verzel — Web

Frontend da Plataforma de Eventos e Ingressos. Next.js (App Router), organizado por feature.

## Stack

- Next.js (App Router) + React
- TanStack Query para dados client-side, `fetch` nativo em Server Components pra páginas públicas
- Zod + React Hook Form para formulários
- `qrcode.react` (geração de QR) + `html5-qrcode` (leitura pela câmera na portaria)
- Vitest + Testing Library

## Configuração local

1. Copie o arquivo de ambiente:
   ```bash
   cp .env.example .env.local
   ```
2. Garanta que a [API](../case-verzel-api) esteja rodando em `NEXT_PUBLIC_API_URL`.
3. Instale as dependências e rode em modo dev:
   ```bash
   npm install
   npm run dev
   ```

A aplicação sobe em `http://localhost:3001` (ajuste a porta se necessário, precisa bater com `FRONTEND_URL` configurado na API para o CORS funcionar).

## Testes

```bash
npm test
npm run test:watch
npm run test:cov
```

Verificação de tipos e build de produção:

```bash
npx tsc --noEmit
npm run build
```

## Estrutura

```
src/
  app/            → rotas (App Router), só composição de páginas
  features/       → uma pasta por feature (components, api)
  shared/         → api-client, ui, hooks, types
  proxy.ts        → checagem otimista de rotas autenticadas
```

## Dados de teste (seed)

Os dados de teste são semeados pelo backend (`npm run seed` em `../case-verzel-api`) — este projeto não tem seed próprio, é só o consumidor da API. Senha `senha123` para todos:

| E-mail | Papel |
|---|---|
| `organizador@verzel.com` | Organizador |
| `cliente1@verzel.com` | Cliente |
| `cliente2@verzel.com` | Cliente |
| `portaria@verzel.com` | Portaria |

Evento semeado: "Homem-Aranha: Um Novo Dia", Cinema Verzel - Sala 3, 24 assentos disponíveis.

## Decisões técnicas

**Autenticação via cookie `httpOnly`, sem token no cliente.** O backend seta `access_token`/`refresh_token` como cookies `httpOnly` no login — o frontend nunca lê nem armazena o JWT em JS (nada de `localStorage`/`sessionStorage` pra token). Todo `fetch` (`src/shared/api-client/index.ts`) vai com `credentials: "include"`. Consequência prática: o `proxy.ts` (middleware) só consegue checar *presença* do cookie (`request.cookies.has("access_token")`) pra redirecionar otimisticamente pra `/login` antes da página carregar — ele não decodifica nem valida o token, porque `httpOnly` o esconde do JS por design. A validação de verdade (token válido, role correta) acontece em dois lugares: no backend, em cada request; e no cliente, via `RoleGate` (`src/features/auth/components/role-gate.tsx`), que consulta `GET /auth/me` e redireciona se a role não bater. O `proxy.ts` é só uma otimização de UX (evita o flash da página protegida antes do redirect), não a barreira de segurança.

**Refresh de sessão automático e deduplicado em 401.** `api-client/index.ts` intercepta qualquer 401 (exceto nas próprias rotas de auth) e dispara `POST /auth/refresh` antes de repetir a request original uma única vez. Chamadas concorrentes que tomam 401 ao mesmo tempo compartilham a mesma promise de refresh (`refreshPromise` module-level) — evita disparar `/auth/refresh` em paralelo pra cada request que falhou junto. Se o refresh falhar, o 401 original é propagado (o `RoleGate`/`useCurrentUser` tratam isso como "sem sessão" e mandam pro login).

**SSE para o pagamento simulado, com timeout no cliente.** O checkout (`use-payment-sse.ts`) abre um `EventSource(url, { withCredentials: true })` pra escutar o resultado do pagamento simulado. `withCredentials: true` é obrigatório aqui especificamente porque frontend (`:3001`) e API (`:3000`) são origens diferentes — sem essa flag o `EventSource` não manda o cookie de auth na conexão SSE (diferente de `fetch`, onde isso é `credentials: "include"`). Como o backend simula um resultado assíncrono sem SLA garantido, o hook aplica um timeout próprio de 30s: se nenhum evento chegar nesse intervalo, a conexão é fechada e a UI cai num estado `"timeout"` com opção de tentar de novo, em vez de deixar o usuário numa tela de "aguardando" indefinida.

**TanStack Query: fresh por padrão, com uma exceção deliberada.** A maioria das queries (lista de eventos, assentos, ingressos, fila da portaria) não define `staleTime`, então o padrão do TanStack Query (`0`) vale: toda montagem/foco de aba refaz a request. Isso é proposital — disponibilidade de assento, status de ingresso (`valid`/`used`) e a lista de eventos do organizador são dados que mudam por ação de terceiros (outro comprador, o gatekeeper de outro turno), então cache "stale" seria uma fonte de bug, não uma otimização. A única exceção é `useCurrentUser` (`src/features/auth/api/use-current-user.ts`), com `staleTime: 60_000` — o usuário logado não muda sozinho a cada navegação, então vale poupar uma request de `GET /auth/me` por minuto. O retry global (`query-provider.tsx`) também é deliberado: erros 4xx (`statusCode < 500`) nunca são re-tentados (retentar um 404/422 não muda o resultado), erros 5xx/rede tentam até 2 vezes.

## Limitações conhecidas

- **"Evento errado" na portaria**: o backend (`POST /gatekeeper/validate`) não recebe nem valida contra um `eventId` — só retorna o evento a que o ingresso pertence. A tela de portaria pede pro operador selecionar o evento antes de escanear e compara o resultado no cliente; se o ingresso for de outro evento, ele já foi marcado como `used` no backend mesmo assim (não há como escopar a validação por evento sem mudar o backend).
- **Timeout de pagamento**: se a stream SSE de pagamento não emitir nenhum evento em 30s, a tela de checkout mostra uma falha genérica com opção de tentar de novo, em vez de aguardar indefinidamente.
- **`GET /reservations/:id`**: endpoint adicionado ao backend depois da primeira versão implementada, especificamente para a tela de checkout conseguir recuperar os dados da reserva em caso de F5/link direto (sem ele, esse contexto só existiria em memória do lado do cliente).
- **Verificação manual não realizada**: a leitura de QR code pela câmera (`Scanner`, feature portaria) e a checagem visual do tema em um navegador real (contraste, overflow, "lê como intencional") não foram verificadas neste ciclo de implementação — dependem de hardware de câmera e de um navegador real, indisponíveis no ambiente onde o frontend foi construído. Pendente de verificação manual antes de considerar a portaria e o tema visual prontos para produção.

## Uso de IA

Ferramenta: Claude Code (Anthropic), do design ao código.

- **Design e planejamento**: a arquitetura deste frontend (split Server Components/TanStack Query, feature-based folders, troca de Tailwind por um tema MUI customizado, o workaround client-side pro "evento errado" na portaria, a decisão de adicionar `GET /reservations/:id`) foi discutida e decidida em sessão de brainstorming, documentada em `docs/superpowers/specs/2026-08-20-frontend-eventos-ingressos-design.md`. O contrato exato da API (endpoints, DTOs, enums, cookies, seed) foi extraído lendo o código-fonte do backend (`../case-verzel-api`), não inventado.
- **Plano de implementação**: `docs/superpowers/plans/2026-08-20-frontend-eventos-ingressos.md` quebra o trabalho em tarefas com TDD (teste antes da implementação) tarefa a tarefa — cada uma com testes reais rodados e passando antes do commit.
- **Decisões humanas explícitas ao longo do processo**: escopo restrito a filmes/assentos (não generalizar pra "shows"/pista); manter só TanStack Query (não trocar React Hook Form por TanStack Form); trocar Tailwind por Material UI com tema customizado a fundo, especificamente pra não cair na cara padrão de MUI que o case pede pra evitar; adicionar `GET /reservations/:id` no backend em vez de depender de `sessionStorage`.
- **O que não teve IA envolvida**: execução real dos testes/build (`npm test`, `npm run build`), verificação manual do fluxo de câmera na portaria (a IA não consegue testar hardware de câmera), e a decisão final de aprovar cada etapa do design/plano antes da implementação prosseguir.
- **Divergência do processo planejado**: a sessão de implementação original foi interrompida por um desligamento inesperado da máquina no meio da Tarefa 15 (o commit já tinha sido feito, mas o relatório do subagente que a implementou nunca chegou a ser escrito). A retomada recuperou o trabalho a partir do worktree Git (nada foi perdido) e, antes de continuar para a Tarefa 16, corrigiu três problemas pré-existentes que só o `npm run build` — não rodado desde a Tarefa 7 — expunha: falta de `<Suspense>` em `/login` (`useSearchParams`), páginas públicas de dado ao vivo (catálogo, detalhe do evento, ingresso compartilhado) sem `export const dynamic = "force-dynamic"` (seriam estaticamente pré-renderizadas em build, congelando disponibilidade de assento/status do ingresso), e uma função passada de Server para Client Component em `/organizador/eventos`. Essas correções, e uma limpeza de `className` morto do Tailwind (pré-Tarefa 1) em `meus-ingressos`/`portaria`, não estavam no plano original.

_Atualizar esta seção se o processo real de implementação divergir do planejado aqui._
