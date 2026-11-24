# VIAJA — Modelagem do Banco de Dados e Integridade

## 1. Visão Geral

O banco de dados do **VIAJA** utiliza **PostgreSQL 16** com **Prisma ORM**. A modelagem prioriza:

- **Integridade referencial estrita** entre usuários, frota, malha rodoviária, viagens, reservas e pagamentos.
- **Precisão financeira** utilizando `DECIMAL(10, 2)` (nunca ponto flutuante `FLOAT`) para tarifas e totais.
- **Padronização temporal** com `TIMESTAMPTZ` em UTC em todos os registros de auditoria e horários de viagem.
- **Prevenção definitiva de *double booking*** diretamente no motor do banco de dados para reservas ativas.

---

## 2. Diagrama Entidade-Relacionamento (ERD)

```mermaid
erDiagram
    USER ||--o{ RESERVATION : "realiza"
    ROUTE ||--o{ TRIP : "define trajeto"
    BUS ||--o{ SEAT : "possui"
    BUS ||--o{ TRIP : "opera"
    TRIP ||--o{ RESERVATION : "recebe"
    TRIP ||--o{ RESERVATION_SEAT : "controla ocupacao"
    RESERVATION ||--|{ RESERVATION_SEAT : "contem"
    SEAT ||--o{ RESERVATION_SEAT : "alocado em"
    RESERVATION ||--o| PAYMENT : "quitada por"

    USER {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        enum role "PASSENGER | ADMIN"
        timestamptz created_at
        timestamptz updated_at
    }

    BUS {
        uuid id PK
        varchar name
        varchar plate UK
        int seat_capacity
        timestamptz created_at
    }

    SEAT {
        uuid id PK
        uuid bus_id FK
        varchar seat_number
        enum seat_type "CONVENTIONAL | EXECUTIVE | SEMI_SLEEPER | SLEEPER"
    }

    ROUTE {
        uuid id PK
        varchar origin
        varchar destination
        decimal distance
        int estimated_duration
    }

    TRIP {
        uuid id PK
        uuid route_id FK
        uuid bus_id FK
        timestamptz departure_at
        timestamptz arrival_at
        decimal price
        enum status "SCHEDULED | BOARDING | IN_TRANSIT | COMPLETED | CANCELLED"
    }

    RESERVATION {
        uuid id PK
        uuid user_id FK
        uuid trip_id FK
        varchar code UK
        enum status "PENDING | CONFIRMED | CANCELLED | EXPIRED"
        decimal total_price
        timestamptz expires_at
        timestamptz created_at
    }

    RESERVATION_SEAT {
        uuid id PK
        uuid reservation_id FK
        uuid trip_id FK
        uuid seat_id FK
        decimal price
        boolean is_active
    }

    PAYMENT {
        uuid id PK
        uuid reservation_id FK_UK
        decimal amount
        enum method "PIX | CREDIT_CARD"
        enum status "PENDING | APPROVED | REJECTED | REFUNDED"
        varchar transaction_reference UK
        timestamptz created_at
    }
```

---

## 3. Especificação das Entidades e Enums

### 3.1. `User` (`users`)
Representa tanto passageiros quanto administradores da plataforma.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PK`, default `uuid_generate_v4()` | Identificador único do usuário. |
| `name` | `VARCHAR(120)` | `NOT NULL` | Nome completo. |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | E-mail normalizado em minúsculas. |
| `passwordHash` | `VARCHAR(255)` | `NOT NULL` | Hash Argon2id / bcrypt da senha. |
| `role` | `UserRole` | `NOT NULL`, default `'PASSENGER'` | Perfil de autorização (`PASSENGER`, `ADMIN`). |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Data de criação. |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | Atualizado automaticamente. |

### 3.2. `Bus` (`buses`)
Cadastro da frota física operada nas viagens.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PK` | Identificador único do veículo. |
| `name` | `VARCHAR(100)` | `NOT NULL` | Identificação comercial/prefixo (ex.: *Viaja Prime 104*). |
| `plate` | `VARCHAR(10)` | `NOT NULL`, `UNIQUE` | Placa padrão Mercosul/antigo. |
| `seatCapacity` | `INTEGER` | `NOT NULL`, `CHECK (> 0)` | Quantidade total de poltronas do veículo. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Data de cadastro. |

### 3.3. `Seat` (`seats`)
Mapa físico de assentos pertencentes a cada ônibus.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PK` | Identificador único da poltrona. |
| `busId` | `UUID` | `FK -> buses.id`, `NOT NULL` | Ônibus ao qual o assento pertence. |
| `seatNumber` | `VARCHAR(5)` | `NOT NULL` | Número visual da poltrona (ex.: `"01"`, `"02"`, ..., `"44"`). |
| `seatType` | `SeatType` | `NOT NULL` | `CONVENTIONAL`, `EXECUTIVE`, `SEMI_SLEEPER` ou `SLEEPER`. |

- **Restrição composta**: `UNIQUE (bus_id, seat_number)` impede duas poltronas com a mesma numeração no mesmo ônibus.

### 3.4. `Route` (`routes`)
Par origem-destino operado pela plataforma.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PK` | Identificador único da rota. |
| `origin` | `VARCHAR(120)` | `NOT NULL` | Cidade/UF de origem (ex.: `"São Paulo, SP"`). |
| `destination` | `VARCHAR(120)` | `NOT NULL` | Cidade/UF de destino (ex.: `"Rio de Janeiro, RJ"`). |
| `distance` | `DECIMAL(8, 2)` | `NOT NULL`, `CHECK (> 0)` | Distância rodoviária em quilômetros (`km`). |
| `estimatedDuration` | `INTEGER` | `NOT NULL`, `CHECK (> 0)` | Duração estimada em minutos (ex.: `360` = 6h). |

- **Restrição composta**: `UNIQUE (origin, destination)` evita cadastro duplicado do mesmo trecho direto.

### 3.5. `Trip` (`trips`)
Instância programada de uma rota realizada por um ônibus em data e horário específicos.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PK` | Identificador único da viagem. |
| `routeId` | `UUID` | `FK -> routes.id`, `NOT NULL` | Rota vinculada. |
| `busId` | `UUID` | `FK -> buses.id`, `NOT NULL` | Ônibus escalado. |
| `departureAt` | `TIMESTAMPTZ` | `NOT NULL` | Data/hora de partida. |
| `arrivalAt` | `TIMESTAMPTZ` | `NOT NULL` | Data/hora prevista de chegada (`arrivalAt > departureAt`). |
| `price` | `DECIMAL(10, 2)` | `NOT NULL`, `CHECK (>= 0)` | Tarifa base por assento. |
| `status` | `TripStatus` | `NOT NULL`, default `'SCHEDULED'` | `SCHEDULED`, `BOARDING`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`. |

### 3.6. `Reservation` (`reservations`)
Pedido de compra realizado por um passageiro para uma viagem.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PK` | Identificador interno da reserva. |
| `code` | `VARCHAR(12)` | `NOT NULL`, `UNIQUE` | Código amigável da passagem/QR Code (ex.: `VJ-8F4K92`). |
| `userId` | `UUID` | `FK -> users.id`, `NOT NULL` | Passageiro titular da compra. |
| `tripId` | `UUID` | `FK -> trips.id`, `NOT NULL` | Viagem reservada. |
| `status` | `ReservationStatus` | `NOT NULL`, default `'PENDING'` | `PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`. |
| `totalPrice` | `DECIMAL(10, 2)` | `NOT NULL` | Soma consolidada dos assentos no ato da reserva. |
| `expiresAt` | `TIMESTAMPTZ` | `NULLABLE` | Prazo limite para pagamento enquanto `PENDING` (ex.: `+15 min`). |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Data/hora da solicitação. |

### 3.7. `ReservationSeat` (`reservation_seats`)
Associação individual de cada poltrona incluída na reserva, preservando o preço histórico praticado.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PK` | Identificador do vínculo. |
| `reservationId` | `UUID` | `FK -> reservations.id`, `NOT NULL` | Reserva pai. |
| `tripId` | `UUID` | `FK -> trips.id`, `NOT NULL` | Viagem associada (desnormalização intencional para constraint de unicidade). |
| `seatId` | `UUID` | `FK -> seats.id`, `NOT NULL` | Assento reservado (validado contra o `busId` da `Trip`). |
| `price` | `DECIMAL(10, 2)` | `NOT NULL` | Valor unitário cobrado pelo assento. |
| `isActive` | `BOOLEAN` | `NOT NULL`, default `true` | `true` enquanto a reserva estiver `PENDING` ou `CONFIRMED`; `false` se `CANCELLED` ou `EXPIRED`. |

### 3.8. `Payment` (`payments`)
Registro do pagamento simulado vinculado 1:1 à reserva.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PK` | Identificador do pagamento. |
| `reservationId` | `UUID` | `FK -> reservations.id`, `UNIQUE` | Relação 1:1 com a reserva. |
| `amount` | `DECIMAL(10, 2)` | `NOT NULL` | Valor transacionado. |
| `method` | `PaymentMethod` | `NOT NULL` | `PIX` ou `CREDIT_CARD`. |
| `status` | `PaymentStatus` | `NOT NULL`, default `'PENDING'` | `PENDING`, `APPROVED`, `REJECTED`, `REFUNDED`. |
| `transactionReference` | `VARCHAR(64)` | `NOT NULL`, `UNIQUE` | Identificador da transação simulada. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` | Timestamp de criação. |

---

## 4. Garantia de Integridade e Controle de Concorrência

> [!IMPORTANT]
> A disponibilidade de poltronas **nunca** confia apenas no estado do frontend ou em consultas isoladas na aplicação. O bloqueio contra reservas duplicadas é garantido em nível de banco de dados + transação atômica.

### 4.1. Índice Único Parcial para Reservas Ativas
No PostgreSQL, um mesmo assento em uma mesma viagem pode aparecer no histórico caso uma reserva anterior tenha sido **cancelada** ou **expirada**, mas **jamais pode existir mais de uma reserva ativa (`PENDING` ou `CONFIRMED`) simultaneamente**.

Para impor essa regra de forma nativa no SGBD, uma migration SQL complementar adiciona o índice único parcial sobre `reservation_seats`:

```sql
CREATE UNIQUE INDEX "uq_active_trip_seat"
ON "reservation_seats" ("trip_id", "seat_id")
WHERE "is_active" = true;
```

Com isso:
- Enquanto `Reservation.status` for `PENDING` ou `CONFIRMED`, `ReservationSeat.isActive = true` impede qualquer `INSERT` duplicado para `(trip_id, seat_id)`, lançando erro de constraint (`23505`) mesmo sob alta concorrência.
- Ao cancelar (`CANCELLED`) ou expirar (`EXPIRED`) uma reserva, a mesma transação atualiza `Reservation.status` e define `ReservationSeat.isActive = false`, liberando imediatamente a poltrona para novos passageiros sem perder o histórico de auditoria.

### 4.2. Lock Pessimista e Transação na Criação da Reserva
O fluxo de `POST /api/reservations` executa integralmente dentro de `prisma.$transaction`:

1. Expira oportunisticamente reservas `PENDING` vencidas (`expiresAt < now()`) daquela viagem.
2. Busca a `Trip` e adquire `SELECT id FROM seats WHERE id IN (...) AND bus_id = trip.bus_id FOR UPDATE` (ordenando os `seatIds` em ordem lexicográfica para prevenir *deadlocks* quando dois usuários selecionam assentos cruzados, ex.: `[A, B]` e `[B, A]`).
3. Verifica se todos os `seatIds` pertencem ao ônibus da viagem e se não possuem registro ativo em `reservation_seats`.
4. Cria `Reservation` (`status = PENDING`, `expiresAt = now() + 15 min`) e os `ReservationSeat` correspondentes (`isActive = true`).
5. Qualquer conflito retorna `409 Conflict` com lista clara dos assentos indisponíveis.

### 4.3. Políticas de Deleção (`ON DELETE`)
- `Route -> Trip`: `RESTRICT` (impede excluir rota que já possua viagens históricas/agendadas).
- `Bus -> Seat`: `CASCADE` (ao remover um ônibus sem viagens, seus assentos são removidos juntos).
- `Bus -> Trip`: `RESTRICT` (preserva histórico operacional).
- `Trip -> Reservation`: `RESTRICT` (viagens com reservas devem ser `CANCELLED`, nunca apagadas fisicamente).
- `Reservation -> ReservationSeat / Payment`: `CASCADE`.

---

## 5. Índices de Performance Planejados

| Tabela | Índice | Finalidade |
| :--- | :--- | :--- |
| `routes` | `idx_routes_origin_destination (origin, destination)` | Acelerar pesquisa de viagens por trecho. |
| `trips` | `idx_trips_route_departure_status (route_id, departure_at, status)` | Filtrar viagens disponíveis por rota, data e faixa horária. |
| `trips` | `idx_trips_price (price)` | Suportar filtro por faixa de preço e ordenação por menor valor. |
| `reservations` | `idx_reservations_user_created (user_id, created_at DESC)` | Listagem rápida de "Minhas Passagens" no app mobile. |
| `reservations` | `idx_reservations_trip_status (trip_id, status)` | Consulta administrativa por viagem e cálculo de ocupação no dashboard. |
| `reservations` | `idx_reservations_pending_expires (status, expires_at)` | Varredura eficiente de reservas pendentes vencidas. |
| `reservation_seats` | `uq_active_trip_seat (trip_id, seat_id) WHERE is_active = true` | Unicidade estrita + consulta instantânea do mapa de assentos da viagem. |

---

## 6. Planejamento do Seed Inicial (`prisma/seed.ts`)

Para viabilizar demonstração imediata e testes manuais/E2E consistentes, o seed criará de forma idempotente:

- **Usuários de Demonstração**:
  - `admin@viaja.app` (`role: ADMIN`)
  - `passageiro@viaja.app` e `maria@viaja.app` (`role: PASSENGER`)
- **Frota (`Bus` + `Seat`)**:
  - *Viaja Executivo 101* (40 assentos `EXECUTIVE`)
  - *Viaja Semi-Leito 202* (36 assentos `SEMI_SLEEPER`)
  - *Viaja Leito Plus 303* (28 assentos `SLEEPER`)
- **Rotas Principais (`Route`)**:
  - São Paulo, SP ↔ Rio de Janeiro, RJ (435 km · 360 min)
  - São Paulo, SP ↔ Curitiba, PR (408 km · 340 min)
  - São Paulo, SP ↔ Belo Horizonte, MG (586 km · 480 min)
  - Rio de Janeiro, RJ ↔ Belo Horizonte, MG (442 km · 400 min)
- **Viagens (`Trip`) e Reservas (`Reservation` + `Payment`)**:
  - Grade de viagens distribuídas nos próximos 7 dias em horários variados (manhã, tarde e noturno), com assentos parcialmente ocupados para demonstrar estados reais no mapa de poltronas e métricas populadas no Dashboard Web.
