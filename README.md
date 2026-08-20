# Case Verzel — Web

Frontend da Plataforma de Eventos e Ingressos. Next.js (App Router), organizado por feature.

> Projeto em desenvolvimento — este README será expandido conforme as features forem implementadas.

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

## Estrutura

```
src/
  app/            → rotas (App Router), só composição de páginas
  features/       → uma pasta por feature (components, api)
  shared/         → api-client, ui, hooks, types
  proxy.ts        → checagem otimista de rotas autenticadas
```
