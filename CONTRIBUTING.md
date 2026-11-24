# Convenções de Desenvolvimento — VIAJA

Este guia define os padrões de versionamento, branches, commits, revisão de código e gestão de entregas adotados no monorepo **VIAJA**.

---

## 1. Fluxo de Branches

A branch `main` permanece sempre íntegra, tipada e executável. Novas entregas seguem branches semânticas curtas:

- `feature/<escopo-curto>` — novas funcionalidades (ex.: `feature/seat-selection`, `feature/trip-filters`)
- `fix/<escopo-curto>` — correções de defeitos (ex.: `fix/prevent-duplicate-reservations`)
- `test/<escopo-curto>` — adição/evolução de suítes automatizadas (ex.: `test/reservation-concurrency`)
- `refactor/<escopo-curto>` — melhorias internas sem alterar comportamento externo
- `docs/<escopo-curto>` — documentação técnica, ADRs e diagramas
- `chore/<escopo-curto>` — infraestrutura, CI/CD, Docker e dependências

---

## 2. Conventional Commits

Todos os commits seguem a especificação **Conventional Commits** em inglês, com mensagens atômicas e imperativas:

```text
<type>(<optional-scope>): <short imperative description>
```

### Tipos permitidos

- `feat`: nova funcionalidade de produto ou API
- `fix`: correção de bug ou condição de corrida
- `test`: criação ou ajuste de testes automatizados
- `refactor`: refatoração de código existente
- `docs`: documentação e ADRs
- `chore`: configuração de build, lint, Docker ou CI/CD
- `style`: ajustes puramente estéticos/formatação

### Exemplos oficiais

```text
feat: implement travel search
feat: add seat selection
fix: prevent duplicate reservations
test: add reservation integration tests
refactor: improve booking service
```

---

## 3. Issues e Milestones por Fase

O acompanhamento no GitHub organiza-se em **Milestones** alinhados às fases do plano:

1. `M0 — Planejamento e Design`
2. `M1 — Configuração do Ambiente`
3. `M2 — Modelagem do Banco de Dados`
4. `M3 — Backend e API REST`
5. `M4 — Aplicação Mobile`
6. `M5 — Aplicação Web Administrativa`
7. `M6 — Testes Automatizados`
8. `M7 — Monitoramento e CI/CD`
9. `M8 — Documentação e Portfólio`

Cada Issue deve descrever contexto, critérios de aceitação objetivos e camada impactada (`mobile`, `web`, `api`, `shared`, `infra`).

---

## 4. Pull Requests, Code Review e Definition of Done

Toda entrega deve ser validada contra os seguintes critérios antes de ser considerada pronta:

- [ ] `pnpm typecheck` executando sem erros em todos os pacotes.
- [ ] `pnpm lint` e `pnpm format:check` aprovados.
- [ ] Validação de entradas aplicada no frontend e no backend (`Zod`).
- [ ] Tratamento explícito de erros (nenhum erro silencioso).
- [ ] Testes automatizados cobrindo as regras críticas alteradas.
- [ ] Nenhuma credencial ou segredo exposto no histórico Git.
- [ ] Documentação atualizada quando houver mudança de contrato ou decisão técnica.
