# VIAJA — Plataforma Inteligente de Mobilidade Rodoviária

Plataforma completa para pesquisa, compra simulada e gestão operacional de passagens rodoviárias, estruturada em **monorepo TypeScript** com **React Native (Expo)**, **Next.js**, **Node.js + Express**, **Prisma ORM** e **PostgreSQL**.

---

## Estrutura do Monorepo

```text
viaja/
├── apps/
│   ├── mobile/          # @viaja/mobile — App para passageiros (React Native + Expo)
│   └── web/             # @viaja/web    — Painel administrativo (Next.js)
├── packages/
│   └── shared/          # @viaja/shared — Tipos, constantes e schemas Zod compartilhados
├── backend/
│   └── api/             # @viaja/api    — API REST modular (Express + Prisma + PostgreSQL)
├── docs/                # Arquitetura, modelagem de dados, design system, protótipos e testes
├── .github/             # Templates de PR/Issues e workflows de CI/CD
├── docker-compose.yml   # Infraestrutura local PostgreSQL 16
└── pnpm-workspace.yaml  # Definição dos workspaces pnpm
```

---

## Pré-requisitos

- **Node.js** `>= 20`
- **pnpm** `>= 10`
- **Docker** e **Docker Compose**

---

## Como Executar o Ambiente Base

1. **Instalar dependências do monorepo:**

```bash
pnpm install
```

2. **Configurar variáveis de ambiente locais (opcional, já possui defaults de desenvolvimento):**

```bash
cp .env.example .env
cp backend/api/.env.example backend/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

3. **Iniciar o banco de dados PostgreSQL com um único comando:**

```bash
pnpm db:up
# equivalente a: docker compose up -d
```

4. **Validar tipagem, lint e formatação em todos os pacotes:**

```bash
pnpm typecheck
pnpm lint
pnpm format:check
```

---

## Documentação Técnica

- [Arquitetura, Escopo e ADRs](./docs/architecture.md)
- [Modelagem Relacional e Controle de Concorrência](./docs/database.md)
- [Especificação da API REST](./docs/api-documentation.md)
- [Estratégia de Testes Automatizados](./docs/testing-strategy.md)
- [Identidade Visual e Design System](./docs/design-system.md)
- [Protótipo Interativo (Mobile & Web)](./docs/prototypes/index.html)
- [Convenções de Desenvolvimento](./CONTRIBUTING.md)
- [Governança de Uso de IA](./docs/AI_DEVELOPMENT.md)
