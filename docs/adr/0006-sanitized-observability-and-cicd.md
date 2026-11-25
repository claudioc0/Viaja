# ADR-0006: Observabilidade Sanitizada (`Sentry` + `Crashlytics`) e Pipeline CI/CD

- **Status:** Aceito
- **Data:** 2026-11-25

## Contexto

Aplicações de mobilidade e checkout precisam diagnosticar rapidamente falhas de rede, erros `5xx` e _crashes_ nativos em dispositivos móveis, mas lidam com credenciais (`password`, tokens `JWT`), dados de pagamento simulado e dados pessoais (`email`, IP) que **jamais devem ser vazados** para plataformas externas de telemetria. Além disso, o monorepo exige verificação automatizada contínua a cada Pull Request.

## Decisão

1. **Camada Centralizada de Sanitização (`@viaja/shared/telemetry`):**
   - Criamos `sanitizeSentryEvent` e `sanitizeTelemetryData` compartilhados entre Backend, Web e Mobile.
   - Antes do envio (`beforeSend`), chaves sensíveis são substituídas por `[REDACTED]`, tokens `Bearer`/JWT são filtrados em URLs e mensagens, e o escopo do usuário retém exclusivamente `{ id, role }`.
2. **Observabilidade Multiplataforma:**
   - **Sentry** integrado em `@viaja/api` (`@sentry/node` + correlação por `x-request-id`), `@viaja/web` (`@sentry/nextjs` + Error Boundaries) e `@viaja/mobile` (`@sentry/react-native` + `MobileErrorBoundary`).
   - **Firebase Crashlytics** integrado em `@viaja/mobile` via configuração dinâmica Expo (`app.config.ts`), injetando plugins nativos em builds EAS via segredos de ambiente e oferecendo fallback seguro em memória para validação em desenvolvimento/testes (`Jest` / Expo Go).
3. **Pipeline CI/CD com PostgreSQL Real (`.github/workflows/ci.yml`):**
   - Executa em Pull Requests e pushes na `main` com filtro de alterações por pacote, checando `tsc`, `eslint`, `prettier`, testes unitários/componentes, **testes de integração e concorrência contra um container `postgres:16-alpine` efêmero** e `next build`.

## Consequências

- **Positivas:**
  - Conformidade com princípios _Privacy by Design_ validada por testes automatizados (`telemetry.test.ts` e `monitoring.test.tsx`).
  - Rastreabilidade fim a fim entre cliente e API através do cabeçalho `x-request-id`.
  - Bloqueio automático de regressões de tipagem, lint, build ou concorrência antes do merge na `main`.
