# ADR-0005: Separação entre Estado de Servidor (`TanStack Query`) e Estado Efêmero (`Zustand`)

- **Status:** Aceito
- **Data:** 2026-11-24

## Contexto

Nas aplicações Mobile (`@viaja/mobile`) e Web (`@viaja/web`), coexistem duas naturezas distintas de estado:

- **Estado Remoto / Servidor:** lista de viagens, mapa de ocupação de assentos em tempo real, reservas do usuário e indicadores analíticos do dashboard. Esse estado é compartilhado entre múltiplos usuários e pode ficar obsoleto a qualquer segundo.
- **Estado Local / Efêmero de UI:** poltronas pré-selecionadas pelo usuário antes de confirmar o checkout, filtros de formulário e hidratação da sessão autenticada.

Armazenar o mapa de disponibilidade do ônibus em uma store global estática induz o erro arquitetural de tratar o cache local como fonte definitiva de disponibilidade.

## Decisão

Adotamos uma separação estrita de responsabilidades:

1. **`TanStack Query` (`@tanstack/react-query`)** em ambas as interfaces (`Mobile` e `Web`) para todo dado proveniente da API REST:
   - O mapa de assentos (`useTripSeats`) utiliza `staleTime: 0` / revalidação ativa para buscar sempre o estado fresco de `GET /api/trips/:id/seats`.
   - Mutações (`createReservation`, `processPayment`, `cancelReservation`, CRUD de rotas/viagens) invalidam automaticamente as `queryKeys` afetadas (`trips`, `trip-seats`, `reservations`, `dashboard`).
2. **`Zustand`** no Mobile restrito ao rascunho de compra (`booking-store.ts`) e estado de sessão (`auth-store.ts`), incluindo uma rotina `syncWithAvailableSeats()` que remove automaticamente qualquer poltrona selecionada localmente caso a API informe que ela passou para `OCCUPIED`.

## Consequências

- **Positivas:**
  - Eliminação de código _boilerplate_ de `useEffect` manual para loading, erro, retry e invalidação de cache.
  - Sincronização imediata entre o mapa visual de poltronas e o estado transacional real do servidor.
