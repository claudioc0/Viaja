# ADR-0001: Monorepo com `pnpm` Workspaces e Contratos Compartilhados (`@viaja/shared`)

- **Status:** Aceito
- **Data:** 2026-11-24

## Contexto

O ecossistema **VIAJA** compreende três aplicações independentes escritas em TypeScript:

1. **Mobile (`@viaja/mobile`)** em React Native + Expo para passageiros.
2. **Web (`@viaja/web`)** em Next.js para administração operacional e portal web.
3. **Backend (`@viaja/api`)** em Node.js + Express para regras de negócio e persistência.

Em repositórios separados (_polyrepo_), regras de validação (como formato de senha, limites de assentos por reserva, restrição `origin !== destination` e enums de status) tendem a ser duplicadas ou divergir ao longo do tempo, gerando bugs sutis de integração entre cliente e servidor.

## Alternativas Consideradas

1. **Múltiplos repositórios independentes (_Polyrepo_):** isolamento simples de deploy, porém exige publicar versões NPM privadas a cada alteração de DTO ou duplicar schemas manualmente.
2. **Monorepo com `npm` ou `yarn` clássico:** unifica o código, mas sofre com _hoisting_ implícito (_phantom dependencies_) entre React Native (Metro bundler) e Next.js.
3. **Monorepo com `pnpm workspaces` + pacote `@viaja/shared`:** isolamento estrito de dependências via symlinks endereçáveis por conteúdo e compartilhamento imediato de contratos TypeScript + `Zod`.

## Decisão

Adotamos um **monorepo gerenciado por `pnpm` (`pnpm-workspace.yaml`)** contendo `apps/mobile`, `apps/web`, `backend/api` e `packages/shared`.

Todos os DTOs, constantes de domínio, utilitários de sanitização de telemetria e schemas `Zod` residem em `@viaja/shared` e são consumidos tanto pelos formulários (`react-hook-form` no Mobile e Web) quanto pelo middleware `validate` na API Express.

## Consequências

- **Positivas:**
  - _Single Source of Truth_ para tipos e validações em todo o projeto.
  - Mudanças de contrato quebram imediatamente no `pnpm typecheck` antes de chegar à produção.
  - Pipeline de CI único com detecção granular de escopo (`dorny/paths-filter`).
- **Trade-offs / Mitigações:**
  - O Metro Bundler (Expo) e o Next.js exigem configuração explícita de resolução do workspace (`metro.config.js` e `transpilePackages: ['@viaja/shared']` em `next.config.mjs`), devidamente configurados desde a Fase 1.
