# ADR-0003: Orquestração Transacional ACID no Fluxo de Reservas, Pagamentos e Cancelamentos

- **Status:** Aceito
- **Data:** 2026-11-24

## Contexto

As três operações mais sensíveis do domínio rodoviário envolvem mutações coordenadas em múltiplas tabelas:

1. **Criação de reserva:** validar viagem → liberar reservas pendentes expiradas → bloquear poltronas → criar `Reservation` → criar `N` registros em `ReservationSeat`.
2. **Processamento de pagamento:** validar reserva ativa e não expirada → criar/atualizar `Payment` → promover `Reservation` para `CONFIRMED` (ou cancelar/liberar poltronas se rejeitado/expirado).
3. **Cancelamento:** validar propriedade/permissão e horário de partida → atualizar `Reservation` para `CANCELLED` → desativar vínculo ativo em `ReservationSeat` (`isActive = false`) → estornar `Payment` (`REFUNDED`) quando aplicável.

Executar essas etapas em queries isoladas fora de uma transação deixaria o banco vulnerável a estados órfãos ou inconsistentes em caso de falha de rede ou exceção intermediária.

## Decisão

Todas as mutações críticas de reserva, pagamento e cancelamento são encapsuladas em **transações interativas `prisma.$transaction(...)`** no backend (`reservations.service.ts` e `payments.service.ts`).

Nenhuma regra crítica (como cálculo de `totalPrice` ou elegibilidade de cancelamento) confia em valores enviados pelo cliente: o servidor recalcula integralmente os preços a partir da entidade `Trip` dentro da transação.

## Consequências

- **Positivas:**
  - Atomicidade total (_tudo ou nada_): um pagamento aprovado jamais existe sem a respectiva reserva `CONFIRMED`, e um cancelamento sempre libera imediatamente os assentos e atualiza o status financeiro no mesmo commit.
  - Proteção contra adulteração de tarifas no payload HTTP.
- **Trade-offs / Mitigações:**
  - Mantemos o escopo das transações enxuto (apenas operações de banco e cálculos em memória, sem chamadas HTTP lentas dentro do bloco transacional) para preservar baixa contenção de conexões.
