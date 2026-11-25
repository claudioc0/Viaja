# ADR-0002: Persistência Relacional com PostgreSQL 16, Prisma ORM e `DECIMAL(10,2)`

- **Status:** Aceito
- **Data:** 2026-11-24

## Contexto

Uma plataforma rodoviária lida com dados altamente estruturados e interdependentes (`User`, `Bus`, `Seat`, `Route`, `Trip`, `Reservation`, `ReservationSeat`, `Payment`), além de valores monetários e disputas simultâneas pelo mesmo inventário físico (poltronas).

## Alternativas Consideradas

1. **Banco orientado a documentos (MongoDB):** flexível para esquemas variáveis, mas menos ergonômico para junções relacionais estritas, agregações analíticas de ocupação e restrições parciais nativas por linha/coluna.
2. **SQLite:** excelente para protótipos locais, porém limitado em locks concorrentes de linha (`SELECT ... FOR UPDATE` inexiste devido ao lock em nível de arquivo/escritor único) e inadequado para múltiplas instâncias horizontais de API.
3. **PostgreSQL 16 + Prisma ORM:** motor relacional ACID de referência na indústria com suporte nativo a `SELECT ... FOR UPDATE`, índices únicos parciais (`WHERE`), tipos numéricos exatos `DECIMAL(10,2)` e `TIMESTAMPTZ` em UTC.

## Decisão

Utilizamos **PostgreSQL 16** (orquestrado localmente via Docker Compose e provisionado como serviço gerenciado em produção) aliado ao **Prisma ORM** com migrations SQL versionadas em `backend/api/prisma/migrations/`.

Adicionalmente:

- Valores financeiros (`Trip.price`, `Reservation.totalPrice`, `ReservationSeat.price`, `Payment.amount`) utilizam exclusivamente `DECIMAL(10, 2)`, evitando erros de arredondamento IEEE 754 comuns em `FLOAT`/`DOUBLE`.
- Datas e horários (`departureAt`, `arrivalAt`, `expiresAt`, `createdAt`) são persistidos em `TIMESTAMPTZ` (UTC).

## Consequências

- **Positivas:**
  - Integridade referencial garantida pelo motor do banco (`FOREIGN KEY` com políticas explícitas `RESTRICT`/`CASCADE`).
  - Tipagem estática gerada automaticamente pelo Prisma Client para todas as consultas e transações.
  - Suporte nativo a índices parciais (`uq_active_trip_seat`), peça central contra _double booking_.
- **Trade-offs / Mitigações:**
  - Campos `Prisma.Decimal` exigem serialização controlada para números/strings nos DTOs JSON (`serializers.ts`) e aritmética em centavos inteiros na camada de serviço.
