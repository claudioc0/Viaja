# VIAJA — Documentação da API REST e OpenAPI

## 1. Documentação Interativa (Swagger UI)

Com o backend em execução (`pnpm dev:api`), a documentação interativa OpenAPI 3.0 pode ser acessada em:

- **Swagger UI**: `http://localhost:3333/api/docs`
- **Especificação JSON**: `http://localhost:3333/api/docs.json`
- **Healthcheck**: `http://localhost:3333/api/health`

---

## 2. Autenticação e Autorização

- **Esquema**: `Authorization: Bearer <accessToken>`
- **Perfis (`role`)**:
  - `PASSENGER`: acesso a consulta, criação de reservas próprias, pagamentos simulados e cancelamento dentro da janela permitida.
  - `ADMIN`: acesso completo aos CRUDs de rotas, ônibus, viagens, dashboard analítico e consulta/cancelamento administrativo de qualquer reserva.

### Exemplo — `POST /api/auth/login`

**Request:**

```json
{
  "email": "passageiro@viaja.app",
  "password": "Viaja@123"
}
```

**Response (`200 OK`):**

```json
{
  "user": {
    "id": "uuid",
    "name": "Claudio Passageiro",
    "email": "passageiro@viaja.app",
    "role": "PASSENGER",
    "createdAt": "2026-11-24T22:30:00.000Z",
    "updatedAt": "2026-11-24T22:30:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": "15m"
  }
}
```

---

## 3. Endpoints Principais

### 3.1. Autenticação (`/api/auth`)

| Método | Endpoint             | Acesso      | Status              | Descrição                                            |
| :----- | :------------------- | :---------- | :------------------ | :--------------------------------------------------- |
| `POST` | `/api/auth/register` | Público     | `201`, `400`, `409` | Cria conta de passageiro com hash `bcrypt`.          |
| `POST` | `/api/auth/login`    | Público     | `200`, `401`        | Autentica e retorna `accessToken` + `refreshToken`.  |
| `POST` | `/api/auth/refresh`  | Público     | `200`, `401`        | Rotaciona `refreshToken` e emite novo par de tokens. |
| `POST` | `/api/auth/logout`   | Autenticado | `204`, `401`        | Revoga o JTI da sessão atual.                        |
| `GET`  | `/api/auth/me`       | Autenticado | `200`, `401`        | Retorna os dados do usuário autenticado.             |

### 3.2. Rotas, Frota e Assentos (`/api/routes`, `/api/buses`, `/api/seats`)

| Método   | Endpoint                  | Acesso  | Status                     | Descrição                                         |
| :------- | :------------------------ | :------ | :------------------------- | :------------------------------------------------ |
| `GET`    | `/api/routes`             | Público | `200`                      | Lista rotas com filtros `origin` e `destination`. |
| `GET`    | `/api/routes/:id`         | Público | `200`, `404`               | Detalhes de uma rota.                             |
| `POST`   | `/api/routes`             | `ADMIN` | `201`, `400`, `403`, `409` | Cadastra nova rota.                               |
| `PUT`    | `/api/routes/:id`         | `ADMIN` | `200`, `400`, `403`, `404` | Atualiza rota existente.                          |
| `DELETE` | `/api/routes/:id`         | `ADMIN` | `204`, `403`, `404`, `409` | Remove rota sem viagens vinculadas.               |
| `GET`    | `/api/buses`              | Público | `200`                      | Lista ônibus e capacidade de assentos.            |
| `POST`   | `/api/buses`              | `ADMIN` | `201`, `403`, `409`        | Cadastra ônibus e gera assentos automaticamente.  |
| `GET`    | `/api/buses/:busId/seats` | Público | `200`, `404`               | Lista assentos físicos do ônibus.                 |

### 3.3. Viagens (`/api/trips`)

| Método   | Endpoint               | Acesso  | Status                     | Descrição                                                                                                          |
| :------- | :--------------------- | :------ | :------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/trips`           | Público | `200`                      | Filtros: `origin`, `destination`, `date`, `minPrice`, `maxPrice`, `minTime`, `maxTime`, `onlyAvailable`, `sortBy`. |
| `GET`    | `/api/trips/:id`       | Público | `200`, `404`               | Detalhes da viagem, rota, ônibus e vagas restantes.                                                                |
| `GET`    | `/api/trips/:id/seats` | Público | `200`, `404`               | Mapa completo de assentos (`AVAILABLE` / `OCCUPIED`).                                                              |
| `POST`   | `/api/trips`           | `ADMIN` | `201`, `400`, `403`, `404` | Cria nova viagem agendada.                                                                                         |
| `PUT`    | `/api/trips/:id`       | `ADMIN` | `200`, `400`, `403`, `409` | Atualiza horários, tarifa ou status.                                                                               |
| `DELETE` | `/api/trips/:id`       | `ADMIN` | `204`, `403`, `409`        | Exclui viagem caso não possua reservas registradas.                                                                |

### 3.4. Reservas e Pagamentos Simulados (`/api/reservations`, `/api/payments`)

| Método | Endpoint                       | Acesso      | Status                     | Descrição                                                           |
| :----- | :----------------------------- | :---------- | :------------------------- | :------------------------------------------------------------------ |
| `POST` | `/api/reservations`            | Autenticado | `201`, `400`, `404`, `409` | Reserva transacional com lock `FOR UPDATE` e TTL de 15 min.         |
| `GET`  | `/api/reservations`            | Autenticado | `200`                      | Lista reservas do usuário ou todas com filtros (`ADMIN`).           |
| `GET`  | `/api/reservations/:id`        | Autenticado | `200`, `403`, `404`        | Detalhes da reserva + `qrCodePayload` da passagem digital.          |
| `POST` | `/api/reservations/:id/cancel` | Autenticado | `200`, `403`, `409`        | Cancela reserva, libera poltronas e estorna pagamento (`REFUNDED`). |
| `POST` | `/api/payments`                | Autenticado | `201`, `403`, `404`, `409` | Simula `PIX` ou `CREDIT_CARD` (`APPROVED`, `PENDING`, `REJECTED`).  |
| `GET`  | `/api/payments/:id`            | Autenticado | `200`, `403`, `404`        | Detalhes do pagamento e referência da transação.                    |

### 3.5. Dashboard Operacional (`/api/dashboard`)

| Método | Endpoint                 | Acesso  | Status       | Descrição                                                                     |
| :----- | :----------------------- | :------ | :----------- | :---------------------------------------------------------------------------- |
| `GET`  | `/api/dashboard/summary` | `ADMIN` | `200`, `403` | Retorna total de viagens, reservas, receita aprovada, ocupação e top viagens. |

---

## 4. Exemplo de Fluxo de Reserva + Pagamento Simulado

### 1) Criar Reserva — `POST /api/reservations`

```json
{
  "tripId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "seatIds": ["7c9e6679-7425-40de-944b-e07fc1f90ae7"]
}
```

- Se dois passageiros disputarem o mesmo `seatId` simultaneamente, apenas um recebe `201 Created` e o outro recebe `409 Conflict` (`SEAT_ALREADY_RESERVED`).

### 2) Pagar Reserva — `POST /api/payments`

```json
{
  "reservationId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "PIX",
  "simulateOutcome": "APPROVED"
}
```

- Atualiza atomicamente o pagamento para `APPROVED` e a reserva para `CONFIRMED`.
