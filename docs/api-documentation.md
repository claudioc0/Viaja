# VIAJA — Especificação e Contrato Base da API REST

> A especificação interativa OpenAPI 3.0 (`/api/docs` via Swagger UI) será exposta diretamente pelo serviço `@viaja/api` na **Fase 3**. Este documento consolida os padrões HTTP, autenticação e contratos de recursos da plataforma.

---

## 1. Convenções Gerais

- **Base URL Local**: `http://localhost:3333/api`
- **Formato de Carga**: `application/json; charset=utf-8`
- **Autenticação**: `Authorization: Bearer <access_token>` (JWT)
- **Formato Padrão de Erro**:

```json
{
  "error": {
    "code": "SEAT_ALREADY_RESERVED",
    "message": "Um ou mais assentos selecionados não estão mais disponíveis.",
    "details": {
      "unavailableSeatIds": ["..."]
    }
  }
}
```

---

## 2. Mapa Planejado de Endpoints (Fase 3)

| Domínio          | Método e Rota                       | Acesso            | Descrição                                                                 |
| :--------------- | :---------------------------------- | :---------------- | :------------------------------------------------------------------------ |
| **Auth**         | `POST /api/auth/register`           | Público           | Cadastro de passageiro (`201`).                                           |
| **Auth**         | `POST /api/auth/login`              | Público           | Autenticação e emissão de tokens JWT (`200`).                             |
| **Auth**         | `POST /api/auth/refresh`            | Público (Refresh) | Renovação do par de tokens (`200`).                                       |
| **Auth**         | `POST /api/auth/logout`             | Autenticado       | Invalidação da sessão atual (`204`).                                      |
| **Auth**         | `GET /api/auth/me`                  | Autenticado       | Dados do perfil autenticado (`200`).                                      |
| **Routes**       | `GET /api/routes`                   | Público           | Listagem com filtro por `origin` e `destination`.                         |
| **Routes**       | `GET /api/routes/:id`               | Público           | Detalhes de uma rota.                                                     |
| **Routes**       | `POST /api/routes`                  | `ADMIN`           | Criação de rota rodoviária (`201`).                                       |
| **Routes**       | `PUT /api/routes/:id`               | `ADMIN`           | Atualização de rota (`200`).                                              |
| **Routes**       | `DELETE /api/routes/:id`            | `ADMIN`           | Remoção segura de rota sem viagens (`204`).                               |
| **Trips**        | `GET /api/trips`                    | Público           | Pesquisa com filtros (origem, destino, data, preço, horário, vagas).      |
| **Trips**        | `GET /api/trips/:id`                | Público           | Detalhes da viagem, rota e ônibus.                                        |
| **Trips**        | `GET /api/trips/:id/seats`          | Público           | Mapa de assentos com disponibilidade em tempo real.                       |
| **Trips**        | `POST /api/trips`                   | `ADMIN`           | Agendamento de nova viagem (`201`).                                       |
| **Trips**        | `PUT /api/trips/:id`                | `ADMIN`           | Atualização operacional de viagem (`200`).                                |
| **Trips**        | `DELETE /api/trips/:id`             | `ADMIN`           | Cancelamento/remoção segura (`204`).                                      |
| **Reservations** | `POST /api/reservations`            | Autenticado       | Criação transacional de reserva com bloqueio concorrente (`201` / `409`). |
| **Reservations** | `GET /api/reservations`             | Autenticado       | Minhas reservas (`PASSENGER`) ou consulta filtrada (`ADMIN`).             |
| **Reservations** | `GET /api/reservations/:id`         | Autenticado       | Detalhes completos + dados da passagem digital.                           |
| **Reservations** | `POST /api/reservations/:id/cancel` | Autenticado       | Cancelamento conforme regras de perfil e janela horária.                  |
| **Payments**     | `POST /api/payments`                | Autenticado       | Processamento de pagamento simulado (`PIX` / `CREDIT_CARD`).              |
| **Payments**     | `GET /api/payments/:id`             | Autenticado       | Consulta de status e referência da transação.                             |
| **Dashboard**    | `GET /api/dashboard/summary`        | `ADMIN`           | Indicadores reais de viagens, reservas, receita e ocupação.               |
