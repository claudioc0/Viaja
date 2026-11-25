# Architecture Decision Records (ADRs) — VIAJA

Este diretório registra as decisões arquiteturais estruturantes adotadas durante o ciclo de engenharia da plataforma **VIAJA**, documentando o contexto do problema, as alternativas avaliadas, a decisão tomada e seus _trade-offs_.

## Índice de Decisões

| ID                                                        | Título                                                                             | Status | Escopo                     |
| :-------------------------------------------------------- | :--------------------------------------------------------------------------------- | :----- | :------------------------- |
| [ADR-0001](./0001-monorepo-pnpm-shared-contracts.md)      | Monorepo com `pnpm` Workspaces e Contratos Compartilhados (`@viaja/shared`)        | Aceito | Repositório & Tipagem      |
| [ADR-0002](./0002-postgresql-relational-persistence.md)   | Persistência Relacional com PostgreSQL 16, Prisma ORM e `DECIMAL(10,2)`            | Aceito | Banco de Dados             |
| [ADR-0003](./0003-transactional-booking-workflow.md)      | Orquestração Transacional ACID no Fluxo de Reservas, Pagamentos e Cancelamentos    | Aceito | Backend & Domínio          |
| [ADR-0004](./0004-seat-concurrency-and-expiration.md)     | Controle de Concorrência de Assentos em Duas Camadas e Expiração de Reservas       | Aceito | Concorrência & Banco       |
| [ADR-0005](./0005-tanstack-query-and-state-separation.md) | Separação entre Estado de Servidor (`TanStack Query`) e Estado Efêmero (`Zustand`) | Aceito | Mobile & Web               |
| [ADR-0006](./0006-sanitized-observability-and-cicd.md)    | Observabilidade Sanitizada (`Sentry` + `Crashlytics`) e Pipeline CI/CD             | Aceito | Infraestrutura & Segurança |
