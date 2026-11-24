# VIAJA — Identidade Visual, Design System e Prototipação

## 1. Conceito e Diretrizes Visuais

A identidade visual do **VIAJA** combina **precisão operacional**, **clareza de leitura em movimento** e **minimalismo funcional**. O passageiro frequentemente utiliza o aplicativo em trânsito ou em terminais rodoviários, exigindo contraste elevado, alvos de toque generosos (`>= 44x44px`) e hierarquia imediata para horários, poltronas e valores.

### Princípios de Interface

1. **Hierarquia sem ruído**: horários de partida/chegada, cidade e preço são os elementos primários de qualquer card de viagem.
2. **Semântica consistente de cores**: cada cor possui significado funcional unificado no Mobile e na Web (ex.: verde exclusivamente para disponibilidade/confirmação).
3. **Feedback imediato e prevenção de erro**: botões em submissão exibem spinner e bloqueiam cliques repetidos; formulários validam entradas em tempo real.
4. **Cobertura completa de estados**: toda tela orientada a dados implementa obrigatoriamente os 4 estados (`Loading`, `Empty`, `Error`, `Success`).

---

## 2. Tokens de Design

### 2.1. Paleta de Cores

| Token Semântico       | Hex (Light) | Hex (Dark) | Aplicação Principal                                          |
| :-------------------- | :---------- | :--------- | :----------------------------------------------------------- |
| `brand-primary`       | `#1D4ED8`   | `#3B82F6`  | CTAs principais, poltrona selecionada, navegação ativa.      |
| `brand-primary-hover` | `#1E40AF`   | `#2563EB`  | Estados `hover`/`pressed` de ações primárias.                |
| `brand-subtle`        | `#EFF6FF`   | `#1E293B`  | Fundos de destaque suave, badges informativas.               |
| `surface-bg`          | `#F8FAFC`   | `#090D16`  | Plano de fundo geral das aplicações.                         |
| `surface-card`        | `#FFFFFF`   | `#111827`  | Cards de viagens, tabelas, modais e bilhete digital.         |
| `border-default`      | `#E2E8F0`   | `#1F2937`  | Divisores sutis, contornos de inputs e poltronas livres.     |
| `text-primary`        | `#0F172A`   | `#F8FAFC`  | Títulos, horários, preços e dados principais.                |
| `text-secondary`      | `#475569`   | `#94A3B8`  | Rótulos auxiliares, duração estimada, legendas.              |
| `status-available`    | `#10B981`   | `#34D399`  | Poltrona disponível, pagamento aprovado, reserva confirmada. |
| `status-warning`      | `#F59E0B`   | `#FBBF24`  | Reserva pendente (contagem regressiva), poucos assentos.     |
| `status-danger`       | `#EF4444`   | `#F87171`  | Erros de validação/API, cancelamento, pagamento recusado.    |
| `seat-occupied`       | `#CBD5E1`   | `#334155`  | Poltrona ocupada (desabilitada com ícone/hachura).           |

### 2.2. Tipografia

- **Família Primária (UI & Textos)**: `Inter` (Web via `next/font`, Mobile via `@expo-google-fonts/inter` ou fonte nativa do sistema com métricas equivalentes).
- **Família Monoespaçada (Dados Tabulares)**: `JetBrains Mono` / `tabular-nums` para **horários (`08:30`)**, **preços (`R$ 129,90`)**, **placas (`VJA-1B04`)**, **poltronas (`14`)** e **localizadores (`VJ-8F4K92`)**.

| Nível             | Tamanho / Peso                 | Uso                                                |
| :---------------- | :----------------------------- | :------------------------------------------------- |
| `Display / KPI`   | `28px–32px` · `Bold (700)`     | Indicadores do dashboard, valor total no checkout. |
| `Heading 1`       | `22px–24px` · `SemiBold (600)` | Títulos de tela e seções principais.               |
| `Heading 2`       | `18px` · `SemiBold (600)`      | Cabeçalhos de cards, horários em destaque.         |
| `Body`            | `14px–16px` · `Regular/Medium` | Conteúdo padrão, inputs e tabelas.                 |
| `Caption / Badge` | `12px` · `Medium (500)`        | Status, legendas do mapa de assentos, metadados.   |

### 2.3. Espaçamento, Bordas e Elevação

- **Escala espacial base `4px`**: `4, 8, 12, 16, 24, 32, 48px`.
- **Border Radius**:
  - Inputs e botões: `10px` (`rounded-lg` / `rounded-xl`).
  - Cards e painéis: `14px–16px` (`rounded-2xl`).
  - Passagem digital: card com recorte lateral estilo _boarding pass_ e linha tracejada separando o QR Code.
- **Sombras**: discretas, priorizando bordas de `1px` (`border-slate-200`) para estética limpa estilo `shadcn/ui`.

---

## 3. Padronização dos Estados de Interface

| Estado               | Comportamento no Mobile (`apps/mobile`)                                                                                                              | Comportamento na Web (`apps/web`)                                                                                           |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Loading**          | Skeletons animados no formato exato dos cards de viagem e do grid 2x2 do ônibus; botão com `ActivityIndicator`.                                      | Skeletons nas métricas e linhas de tabela (`shadcn Skeleton`); barra sutil de revalidação.                                  |
| **Empty State**      | Ícone ilustrativo minimalista + mensagem contextual (_"Nenhuma viagem encontrada para esta data"_) + botão _"Alterar filtros"_.                      | Card centralizado na tabela com CTA direto (ex.: _"+ Cadastrar primeira rota"_).                                            |
| **Error State**      | Mensagem amigável sem jargão técnico + botão _"Tentar novamente"_; em conflito de assento (`409`), toast explicativo e atualização imediata do mapa. | `Alert` destrutivo ou `Toast` contextual detalhando o motivo (ex.: _"Não é possível excluir rota com viagens vinculadas"_). |
| **Feedback de Ação** | Feedback tátil leve (`expo-haptics` opcional) ao selecionar poltrona + barra inferior fixa atualizando subtotal instantaneamente.                    | Confirmação em `AlertDialog` para ações destrutivas (exclusão/cancelamento) + toast de confirmação.                         |

---

## 4. Especificação das Telas e Protótipos

Um **protótipo navegável interativo** contemplando todas as telas abaixo encontra-se versionado em [`docs/prototypes/index.html`](./prototypes/index.html).

### 4.1. Aplicação Mobile — Passageiro (`apps/mobile`)

1. **Autenticação (Login / Cadastro / Recuperação)**
   - Cabeçalho com marca **VIAJA**, campos validados (`e-mail`, `senha`), alternância rápida entre _Entrar_ e _Criar conta_, e fluxo demonstrativo de recuperação de senha.
2. **Pesquisa de Viagens (Home Tab)**
   - Seletor de Origem e Destino com botão de inversão rápida (`⇄`), seletor de data com atalhos (_Hoje_, _Amanhã_, calendário) e buscas recentes.
3. **Resultados e Ordenação**
   - Chips de ordenação (_Menor preço_, _Menor duração_, _Partida mais cedo_) + filtro por classe/turno.
   - Cards contendo: horários (`partida → chegada`), duração, classe do ônibus (_Executivo_, _Semi-Leito_, _Leito_), assentos restantes e tarifa.
4. **Seleção de Assentos (Mapa do Ônibus)**
   - Frente do ônibus identificada (_Motorista_), corredor central dividindo colunas `2 x 2`.
   - Legenda fixa no topo: **Livre** (borda esmeralda/neutra), **Selecionado** (azul primário preenchido), **Ocupado** (cinza bloqueado).
   - Rodapé fixo mostrando poltronas escolhidas (ex.: `13, 14`), contador `2/4` e valor total dinâmico + CTA _Continuar para pagamento_.
5. **Checkout**
   - Resumo compacto do trecho e assentos + timer de reserva pendente (`14:59`).
   - Escolha do método simulado: **PIX** (aprovação instantânea com código copia-e-cola simulado) ou **Cartão de Crédito** (formulário de demonstração).
6. **Confirmação e Passagem Digital (Minhas Viagens Tab)**
   - Bilhete estilo cartão de embarque com código localizador (`VJ-8F4K92`), status `CONFIRMADA`, QR Code escaneável, dados do passageiro, plataforma/horário, placa do ônibus e assentos.
   - Aba _Minhas Passagens_ separando **Próximas viagens** e **Histórico / Canceladas**.

### 4.2. Aplicação Web — Painel Administrativo (`apps/web`)

1. **Login Administrativo**
   - Layout split-screen ou card central minimalista com identificação institucional _VIAJA Control_ e aviso de acesso restrito a operadores.
2. **Dashboard Operacional**
   - 4 cards de KPI no topo: **Total de Viagens**, **Total de Reservas**, **Receita Simulada**, **Taxa Média de Ocupação**.
   - Gráfico principal (`Recharts`) de receita/reservas por período + gráfico/ranking das **Rotas Mais Procuradas**.
3. **Gerenciamento de Rotas**
   - Barra de pesquisa por origem/destino + botão _Nova Rota_.
   - Tabela com origem, destino, distância (`km`), duração formatada (`6h 00m`) e menu de ações (_Editar_, _Excluir_).
4. **Gerenciamento de Viagens**
   - Filtros por rota, data e status + modal/drawer _Nova Viagem_ (seleção de Rota, Ônibus, data/hora de partida e chegada, preço base).
   - Barra visual de ocupação em cada linha (ex.: `32/40 assentos · 80%`).
5. **Gerenciamento de Reservas**
   - Filtros por viagem, código localizador e status (`CONFIRMED`, `PENDING`, `CANCELLED`).
   - Drawer de detalhes exibindo passageiro, assentos alocados, status/referência do pagamento simulado e botão de **Cancelamento Administrativo** com confirmação.
