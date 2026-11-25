# VIAJA — Roteiro de Demonstração em Vídeo (2 a 3 Minutos)

Este guia estrutura a gravação do vídeo de apresentação técnica do projeto **VIAJA** para portfólio, LinkedIn e processos seletivos, cobrindo de forma objetiva a dor de negócio, as duas interfaces integradas, o controle transacional de concorrência e a engenharia de qualidade.

---

## 1. Preparação Rápida antes de Gravar (2 min)

1. **Subir o banco e garantir dados limpos de demonstração:**
   ```bash
   pnpm db:up
   pnpm --filter @viaja/api run db:migrate:deploy
   pnpm db:seed
   ```
2. **Deixar 3 terminais prontos:**
   - **Terminal 1 (API):** `pnpm dev:api` (`http://localhost:3333` · Swagger em `http://localhost:3333/api/docs`)
   - **Terminal 2 (Web Admin):** `pnpm dev:web` (`http://localhost:3000`)
   - **Terminal 3 (Mobile / Testes):** `pnpm dev:mobile` (emulador Android/iOS lado a lado na tela) + aba extra pronta para rodar `pnpm test`.
3. **Resolução recomendada (OBS Studio / Loom):** `1920x1080` a `60fps`, com o emulador Mobile posicionado à esquerda (35% da tela) e o navegador Web Admin / Editor / Terminal à direita (65% da tela).

---

## 2. Roteiro Cronometrado Passo a Passo (2m45s)

### [0:00 – 0:20] 1. Apresentar o Problema

- **Visual na tela:** `README.md` aberto no diagrama de arquitetura ou tela inicial lado a lado (Mobile + Web Admin).
- **Fala sugerida:**
  > _"Olá! Este é o **VIAJA**, uma plataforma completa de mobilidade rodoviária que desenvolvi em um monorepo TypeScript. O projeto resolve dois desafios reais da venda de passagens: oferecer uma experiência fluida de compra e embarque digital para o passageiro no celular, e garantir no servidor que dois usuários simultâneos nunca consigam comprar a mesma poltrona."_

### [0:20 – 0:35] 2. Mostrar a Aplicação Mobile e Autenticação

- **Visual na tela:** App Mobile em React Native + Expo Router (`apps/mobile`).
- **Ação:** Entrar com a conta `passageiro@viaja.app` / `Viaja@123` (sessão salva com criptografia no `Expo SecureStore`).
- **Fala sugerida:**
  > _"No aplicativo React Native com Expo Router, a autenticação utiliza JWT com refresh automático persistido no SecureStore nativo, compartilhando os mesmos schemas Zod do backend através do pacote `@viaja/shared`."_

### [0:35 – 0:55] 3. Pesquisar uma Viagem e Filtrar Resultados

- **Ação:** Pesquisar **São Paulo → Rio de Janeiro**, exibir a listagem retornada por `GET /api/trips` e alternar a ordenação entre **Menor preço** e **Menor duração**.
- **Fala sugerida:**
  > _"Ao pesquisar entre São Paulo e Rio de Janeiro, o TanStack Query consulta a API REST com filtros reais de rota, horário e disponibilidade, tratando estados de carregamento, lista vazia e erro."_

### [0:55 – 1:20] 4. Selecionar Assento no Mapa do Ônibus

- **Ação:** Abrir uma viagem e interagir com o mapa 2x2 de poltronas (tentar tocar em uma poltrona ocupada bloqueada e selecionar as poltronas livres `15` e `16`, observando o cálculo imediato do subtotal).
- **Fala sugerida:**
  > _"No mapa visual do ônibus, a disponibilidade nunca confia apenas no estado local: o app consulta os assentos em tempo real na API, impede seleção de lugares ocupados, respeita o limite por compra e sincroniza automaticamente caso outro passageiro reserve primeiro."_

### [1:20 – 1:40] 5. Finalizar Reserva e Pagamento Simulado

- **Ação:** Avançar para o **Checkout**, escolher **PIX Simulado** e confirmar.
- **Fala sugerida:**
  > _"Ao concluir o checkout, o backend abre uma transação ACID no PostgreSQL com `SELECT ... FOR UPDATE` ordenado nos assentos e um índice único parcial para reservas ativas, cria a reserva com janela de expiração de 15 minutos e processa o pagamento simulado promovendo o bilhete para confirmado."_

### [1:40 – 1:55] 6. Mostrar a Passagem Digital

- **Ação:** Exibir a tela de **Passagem Digital** recém-emitida com código localizador (`VJ-...`), rota, horários, poltronas e **QR Code de embarque**, além da carteira **Minhas Passagens**.
- **Fala sugerida:**
  > _"Imediatamente após a aprovação, o passageiro recebe sua passagem digital com código localizador único e QR Code pronto para embarque."_

### [1:55 – 2:20] 7. Mostrar o Painel Administrativo Web

- **Visual na tela:** Painel Next.js (`apps/web` em `http://localhost:3000/admin`) autenticado como `admin@viaja.app`.
- **Ação:** Mostrar os KPIs atualizados e gráficos `Recharts` no **Dashboard**, passar rapidamente por **Gerenciar Rotas** e **Gerenciar Viagens**, e abrir **Consultar Reservas** mostrando a reserva recém-criada no Mobile já visível em tempo real (com opção de cancelamento administrativo e estorno automático).
- **Fala sugerida:**
  > _"No painel administrativo em Next.js, protegido por RBAC para o perfil `ADMIN`, acompanhamos em tempo real a receita aprovada, taxa de ocupação com Recharts, gestão de rotas e viagens, e a reserva que acabamos de comprar no celular já aparece integrada aqui."_

### [2:20 – 2:45] 8. Demonstrar Testes de Concorrência, CI/CD e Arquitetura

- **Visual na tela:** Terminal executando `pnpm test` (ou `pnpm test:integration` + Swagger `/api/docs` + `.github/workflows/ci.yml`).
- **Fala sugerida:**
  > _"Para comprovar a consistência, a suíte automatizada cobre testes unitários, componentes Mobile e Web, E2E com Playwright e um teste de concorrência com Supertest onde 10 passageiros tentam reservar a mesma poltrona exatamente ao mesmo tempo — aprovando apenas 1 e bloqueando as outras 9 com HTTP 409. Tudo roda no GitHub Actions com PostgreSQL 16 em cada Pull Request e telemetria sanitizada no Sentry e Crashlytics."_

---

## 3. Pontos-Chave para Destacar em Entrevistas Técnicas

1. **Por que índice único parcial (`WHERE is_active = true`) em vez de `UNIQUE(trip_id, seat_id)` comum?**
   - Porque `UNIQUE` simples impediria revender uma poltrona após um cancelamento legítimo sem apagar o registro histórico da reserva cancelada. O índice parcial garante unicidade absoluta para assentos ativos mantendo 100% de rastreabilidade de auditoria.
2. **Como você evitou _deadlocks_ em reservas com múltiplos assentos?**
   - Ordenando lexicograficamente os `seatIds` antes do `SELECT ... FOR UPDATE`, garantindo que transações concorrentes adquiram locks de linha sempre na mesma ordem canônica.
3. **Como garantiu segurança e LGPD no monitoramento de erros?**
   - Através de um sanitizador compartilhado (`@viaja/shared`) testado unitariamente que remove senhas, tokens `Bearer`/JWT, cartões, cookies, IP e e-mails antes do envio ao Sentry e Firebase Crashlytics, retendo apenas `userId`, `role` e `x-request-id`.
