# ADR-0004: Controle de Concorrência de Assentos em Duas Camadas e Expiração de Reservas

- **Status:** Aceito
- **Data:** 2026-11-24

## Contexto

Em horários de pico ou promoções, múltiplos passageiros visualizam simultaneamente o mesmo mapa de ônibus e clicam para reservar a mesma poltrona no mesmo instante.

Uma verificação ingênua na aplicação (`SELECT` para checar se o assento está livre seguido de `INSERT` em `ReservationSeat`) sofre da clássica condição de corrida **TOCTOU (_Time-of-Check to Time-of-Use_)** sob nível de isolamento padrão `READ COMMITTED`, permitindo que duas requisições concorrentes vendam a mesma poltrona. Além disso, poltronas reservadas em estado `PENDING` cujo passageiro abandona o checkout não podem ficar bloqueadas indefinidamente.

## Alternativas Consideradas

1. **Validação apenas no Frontend ou `SELECT` simples na API:** falha imediatamente sob requisições paralelas (`Promise.all`).
2. **Constraint `UNIQUE(trip_id, seat_id)` incondicional:** impede _double booking_, mas **quebra o histórico**: uma vez que uma reserva fosse cancelada (`CANCELLED`), aquela poltrona nunca mais poderia ser vendida para outro passageiro na mesma viagem sem deletar fisicamente o registro histórico.
3. **Defesa em Profundidade (Lock Pessimista Ordenado + Índice Único Parcial + TTL de Expiração):** serializa o acesso às poltronas disputadas e impõe unicidade no motor do PostgreSQL apenas para assentos ativos, preservando todo o histórico auditável.

## Decisão

Implementamos controle de concorrência em **três mecanismos complementares**:

1. **Lock Pessimista com Ordenação Determinística (`SELECT ... FOR UPDATE`):**
   - Antes de verificar ocupação, a transação ordena lexicograficamente os `seatIds` solicitados e executa `SELECT id FROM seats WHERE id IN (...) ORDER BY id ASC FOR UPDATE`.
   - A ordenação determinística elimina o risco de _deadlock_ quando dois usuários tentam reservar subconjuntos cruzados (ex.: `[A, B]` vs `[B, A]`).
2. **Índice Único Parcial no PostgreSQL (`uq_active_trip_seat`):**
   ```sql
   CREATE UNIQUE INDEX "uq_active_trip_seat"
   ON "reservation_seats" ("trip_id", "seat_id")
   WHERE "is_active" = true;
   ```
   - Garante matematicamente no nível do SGBD que nunca existam duas alocações ativas para o par `(trip_id, seat_id)`, enquanto permite múltiplos registros históricos com `is_active = false` (reservas canceladas ou expiradas).
3. **Expiração Automática de Reservas Pendentes (`expiresAt`):**
   - Toda reserva nasce como `PENDING` com `expiresAt = now + 15 minutos`.
   - Antes de listar poltronas (`GET /api/trips/:id/seats`), criar novas reservas ou processar pagamentos, `expireStaleReservations()` marca reservas vencidas como `CANCELLED` e define `is_active = false` em seus assentos, devolvendo-os imediatamente ao inventário.

## Validação Empírica

Na suíte de integração (`backend/api/tests/integration/api.integration.test.ts`), **10 passageiros autenticados disparam simultaneamente (`Promise.all`)** `POST /api/reservations` disputando exatamente o mesmo assento: o sistema retorna deterministicamente **`1x 201 Created`** e **`9x 409 Conflict`**, mantendo apenas `1` registro ativo no PostgreSQL.
