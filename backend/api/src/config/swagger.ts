export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'VIAJA — API REST de Mobilidade Rodoviária',
    version: '1.0.0',
    description:
      'API REST para compra simulada de passagens rodoviárias (Mobile) e operação administrativa (Web), com controle transacional de concorrência de assentos.',
  },
  servers: [
    {
      url: 'http://localhost:3333',
      description: 'Ambiente Local de Desenvolvimento',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Informe o accessToken obtido em POST /api/auth/login',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'SEAT_ALREADY_RESERVED' },
              message: {
                type: 'string',
                example: 'Um ou mais assentos selecionados não estão disponíveis.',
              },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'João Passageiro' },
          email: { type: 'string', format: 'email', example: 'joao@viaja.app' },
          password: { type: 'string', minLength: 6, example: 'Viaja@123' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'passageiro@viaja.app' },
          password: { type: 'string', example: 'Viaja@123' },
        },
      },
      RouteRequest: {
        type: 'object',
        required: ['origin', 'destination', 'distance', 'estimatedDuration'],
        properties: {
          origin: { type: 'string', example: 'São Paulo, SP' },
          destination: { type: 'string', example: 'Florianópolis, SC' },
          distance: { type: 'number', example: 705 },
          estimatedDuration: { type: 'integer', example: 600 },
        },
      },
      TripRequest: {
        type: 'object',
        required: ['routeId', 'busId', 'departureAt', 'arrivalAt', 'price'],
        properties: {
          routeId: { type: 'string', format: 'uuid' },
          busId: { type: 'string', format: 'uuid' },
          departureAt: { type: 'string', format: 'date-time', example: '2026-12-01T11:00:00.000Z' },
          arrivalAt: { type: 'string', format: 'date-time', example: '2026-12-01T17:00:00.000Z' },
          price: { type: 'number', example: 129.9 },
          status: {
            type: 'string',
            enum: ['SCHEDULED', 'BOARDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'],
          },
        },
      },
      CreateReservationRequest: {
        type: 'object',
        required: ['tripId', 'seatIds'],
        properties: {
          tripId: { type: 'string', format: 'uuid' },
          seatIds: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            items: { type: 'string', format: 'uuid' },
          },
        },
      },
      CreatePaymentRequest: {
        type: 'object',
        required: ['reservationId', 'method'],
        properties: {
          reservationId: { type: 'string', format: 'uuid' },
          method: { type: 'string', enum: ['PIX', 'CREDIT_CARD'], example: 'PIX' },
          simulateOutcome: {
            type: 'string',
            enum: ['APPROVED', 'REJECTED', 'PENDING'],
            default: 'APPROVED',
          },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica saúde da API e conectividade com o banco',
        responses: { '200': { description: 'Serviço operacional' } },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Cadastra novo passageiro e retorna tokens JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
          },
        },
        responses: {
          '201': { description: 'Conta criada com sucesso' },
          '400': { description: 'Dados inválidos' },
          '409': { description: 'E-mail já cadastrado' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Autentica usuário (PASSENGER ou ADMIN)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': { description: 'Autenticado com sucesso' },
          '401': { description: 'Credenciais inválidas' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renova par de tokens usando refreshToken com rotação',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Novos tokens emitidos' },
          '401': { description: 'Refresh token inválido ou revogado' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoga o token de sessão atual',
        security: [{ BearerAuth: [] }],
        responses: {
          '204': { description: 'Sessão encerrada' },
          '401': { description: 'Não autenticado' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Retorna o perfil do usuário autenticado',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Perfil retornado' },
          '401': { description: 'Não autenticado' },
        },
      },
    },
    '/api/routes': {
      get: {
        tags: ['Routes'],
        summary: 'Lista rotas com filtros opcionais por origem e destino',
        parameters: [
          { name: 'origin', in: 'query', schema: { type: 'string' } },
          { name: 'destination', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Lista de rotas' } },
      },
      post: {
        tags: ['Routes'],
        summary: 'Cria nova rota rodoviária (ADMIN)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RouteRequest' } },
          },
        },
        responses: {
          '201': { description: 'Rota criada' },
          '403': { description: 'Acesso restrito a ADMIN' },
          '409': { description: 'Rota duplicada' },
        },
      },
    },
    '/api/routes/{id}': {
      get: {
        tags: ['Routes'],
        summary: 'Obtém detalhes de uma rota',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Rota encontrada' },
          '404': { description: 'Não encontrada' },
        },
      },
      put: {
        tags: ['Routes'],
        summary: 'Atualiza rota existente (ADMIN)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Rota atualizada' },
          '403': { description: 'Proibido' },
        },
      },
      delete: {
        tags: ['Routes'],
        summary: 'Remove rota sem viagens vinculadas (ADMIN)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Removida' },
          '409': { description: 'Rota possui viagens vinculadas' },
        },
      },
    },
    '/api/buses': {
      get: {
        tags: ['Buses'],
        summary: 'Lista frota de ônibus cadastrada',
        responses: { '200': { description: 'Lista de ônibus' } },
      },
      post: {
        tags: ['Buses'],
        summary: 'Cadastra ônibus e gera automaticamente os assentos (ADMIN)',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Ônibus criado' } },
      },
    },
    '/api/trips': {
      get: {
        tags: ['Trips'],
        summary:
          'Pesquisa viagens com filtros de origem, destino, data, preço, horário e disponibilidade',
        parameters: [
          { name: 'origin', in: 'query', schema: { type: 'string' } },
          { name: 'destination', in: 'query', schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', example: '2026-11-25' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'minTime', in: 'query', schema: { type: 'string', example: '06:00' } },
          { name: 'maxTime', in: 'query', schema: { type: 'string', example: '22:00' } },
          { name: 'onlyAvailable', in: 'query', schema: { type: 'boolean' } },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', enum: ['price_asc', 'duration_asc', 'departure_asc'] },
          },
        ],
        responses: { '200': { description: 'Lista de viagens' } },
      },
      post: {
        tags: ['Trips'],
        summary: 'Agenda nova viagem (ADMIN)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/TripRequest' } },
          },
        },
        responses: { '201': { description: 'Viagem criada' }, '403': { description: 'Proibido' } },
      },
    },
    '/api/trips/{id}': {
      get: {
        tags: ['Trips'],
        summary: 'Obtém detalhes completos de uma viagem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Detalhes da viagem' },
          '404': { description: 'Não encontrada' },
        },
      },
      put: {
        tags: ['Trips'],
        summary: 'Atualiza dados ou status da viagem (ADMIN)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Viagem atualizada' } },
      },
      delete: {
        tags: ['Trips'],
        summary: 'Remove viagem sem reservas registradas (ADMIN)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Viagem removida' },
          '409': { description: 'Possui reservas' },
        },
      },
    },
    '/api/trips/{id}/seats': {
      get: {
        tags: ['Trips'],
        summary: 'Consulta mapa de assentos e disponibilidade em tempo real da viagem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Mapa de assentos com status AVAILABLE | OCCUPIED' } },
      },
    },
    '/api/reservations': {
      post: {
        tags: ['Reservations'],
        summary: 'Cria reserva em transação com lock pessimista contra concorrência',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateReservationRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Reserva criada (PENDING por 15 minutos)' },
          '409': { description: 'Assento já reservado ou viagem indisponível' },
        },
      },
      get: {
        tags: ['Reservations'],
        summary: 'Lista reservas do passageiro autenticado ou todas (ADMIN)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'tripId', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'] },
          },
          { name: 'code', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Lista de reservas' } },
      },
    },
    '/api/reservations/{id}': {
      get: {
        tags: ['Reservations'],
        summary: 'Obtém detalhes da reserva e payload da passagem digital',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Reserva detalhada' },
          '403': { description: 'Proibido' },
        },
      },
    },
    '/api/reservations/{id}/cancel': {
      post: {
        tags: ['Reservations'],
        summary: 'Cancela reserva, libera assentos e estorna pagamento aprovado',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Reserva cancelada' },
          '409': { description: 'Regra violada' },
        },
      },
    },
    '/api/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Processa pagamento simulado (PIX ou CREDIT_CARD) e atualiza a reserva',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentRequest' } },
          },
        },
        responses: {
          '201': { description: 'Pagamento processado e reserva atualizada' },
          '409': { description: 'Reserva expirada ou já paga' },
        },
      },
    },
    '/api/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Consulta status e detalhes de um pagamento simulado',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Detalhes do pagamento' } },
      },
    },
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Retorna indicadores operacionais reais (ADMIN)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'KPIs de viagens, reservas, receita e ocupação' } },
      },
    },
  },
} as const;
