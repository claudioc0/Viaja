import { execSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://viaja:viaja_dev_password@localhost:5432/viaja_test?schema=public';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DB_URL;

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');

describe('VIAJA API Integration & Concurrency Suite (Supertest + PostgreSQL)', () => {
  let adminToken = '';
  let passengerToken = '';
  let routeId = '';
  let busId = '';
  let tripId = '';
  let seatIds: string[] = [];

  beforeAll(async () => {
    execSync('pnpm exec prisma migrate deploy', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    await prisma.payment.deleteMany();
    await prisma.reservationSeat.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.seat.deleteMany();
    await prisma.bus.deleteMany();
    await prisma.route.deleteMany();
    await prisma.user.deleteMany();

    const adminHash = await bcrypt.hash('Admin@123', 10);
    await prisma.user.create({
      data: {
        name: 'Admin Integration',
        email: 'admin.test@viaja.app',
        passwordHash: adminHash,
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers a passenger, prevents duplicate email, logs in, refreshes and enforces logout', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Passageiro Integração',
      email: 'passageiro.test@viaja.app',
      password: 'Password@123',
    });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.role).toBe('PASSENGER');
    expect(regRes.body.tokens.accessToken).toBeTruthy();

    const dupRes = await request(app).post('/api/auth/register').send({
      name: 'Duplicado',
      email: 'passageiro.test@viaja.app',
      password: 'Password@123',
    });
    expect(dupRes.status).toBe(409);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'passageiro.test@viaja.app',
      password: 'Password@123',
    });
    expect(loginRes.status).toBe(200);
    const firstAccessToken = loginRes.body.tokens.accessToken as string;
    const firstRefreshToken = loginRes.body.tokens.refreshToken as string;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${firstAccessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('passageiro.test@viaja.app');

    // Refresh rotation
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRefreshToken });
    expect(refreshRes.status).toBe(200);
    passengerToken = refreshRes.body.tokens.accessToken as string;

    // Logout old access token and confirm revocation
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${firstAccessToken}`);
    expect(logoutRes.status).toBe(204);

    const revokedCheck = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${firstAccessToken}`);
    expect(revokedCheck.status).toBe(401);
  });

  it('enforces RBAC permissions on administrative routes, buses, trips and dashboard', async () => {
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin.test@viaja.app',
      password: 'Admin@123',
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.tokens.accessToken as string;

    // Passenger blocked from creating route
    const forbiddenRoute = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        origin: 'São Paulo, SP',
        destination: 'Curitiba, PR',
        distance: 408,
        estimatedDuration: 340,
      });
    expect(forbiddenRoute.status).toBe(403);

    // Admin creates route, bus and trip
    const routeRes = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        origin: 'São Paulo, SP',
        destination: 'Curitiba, PR',
        distance: 408,
        estimatedDuration: 340,
      });
    expect(routeRes.status).toBe(201);
    routeId = routeRes.body.route.id as string;

    const busRes = await request(app)
      .post('/api/buses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Viaja Integration 500',
        plate: 'INT5A00',
        seatCapacity: 16,
        defaultSeatType: 'EXECUTIVE',
      });
    expect(busRes.status).toBe(201);
    busId = busRes.body.bus.id as string;

    const departure = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const arrival = new Date(departure.getTime() + 6 * 60 * 60 * 1000);

    const tripRes = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        routeId,
        busId,
        departureAt: departure.toISOString(),
        arrivalAt: arrival.toISOString(),
        price: 150.0,
      });
    expect(tripRes.status).toBe(201);
    tripId = tripRes.body.trip.id as string;
  });

  it('queries trips with filters and returns real-time seat availability map', async () => {
    const searchRes = await request(app).get('/api/trips').query({
      origin: 'São Paulo',
      destination: 'Curitiba',
      onlyAvailable: 'true',
      sortBy: 'price_asc',
    });

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.trips).toHaveLength(1);
    expect(searchRes.body.trips[0].availableSeats).toBe(16);

    const seatsRes = await request(app).get(`/api/trips/${tripId}/seats`);
    expect(seatsRes.status).toBe(200);
    expect(seatsRes.body.seats).toHaveLength(16);
    seatIds = seatsRes.body.seats.map((s: { id: string }) => s.id);
  });

  it('handles reservation creation, simulated PIX payment, and cancellation with seat release', async () => {
    const targetSeat = seatIds[0]!;

    const resCreate = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        tripId,
        seatIds: [targetSeat],
      });

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.reservation.status).toBe('PENDING');
    expect(resCreate.body.reservation.totalPrice).toBe(150);
    const reservationId = resCreate.body.reservation.id as string;

    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        reservationId,
        method: 'PIX',
        simulateOutcome: 'APPROVED',
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.payment.status).toBe('APPROVED');
    expect(payRes.body.reservation.status).toBe('CONFIRMED');

    const cancelRes = await request(app)
      .post(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.reservation.status).toBe('CANCELLED');
    expect(cancelRes.body.reservation.payment.status).toBe('REFUNDED');

    const seatsAfter = await request(app).get(`/api/trips/${tripId}/seats`);
    const releasedSeat = seatsAfter.body.seats.find((s: { id: string }) => s.id === targetSeat);
    expect(releasedSeat.status).toBe('AVAILABLE');
  });

  it('prevents duplicate active reservations under 10 concurrent requests for the same seat', async () => {
    const contestedSeatId = seatIds[5]!;

    // Register 10 distinct passengers
    const contenderTokens = await Promise.all(
      Array.from({ length: 10 }, async (_, idx) => {
        const reg = await request(app)
          .post('/api/auth/register')
          .send({
            name: `Concorrente ${idx + 1}`,
            email: `concorrente.${idx + 1}@viaja.app`,
            password: 'Password@123',
          });
        return reg.body.tokens.accessToken as string;
      }),
    );

    // Fire 10 simultaneous booking attempts for the exact same seat
    const responses = await Promise.all(
      contenderTokens.map((token) =>
        request(app)
          .post('/api/reservations')
          .set('Authorization', `Bearer ${token}`)
          .send({
            tripId,
            seatIds: [contestedSeatId],
          }),
      ),
    );

    const created = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(created).toHaveLength(1);
    expect(conflicts).toHaveLength(9);

    const activeRecordsInDb = await prisma.reservationSeat.count({
      where: {
        tripId,
        seatId: contestedSeatId,
        isActive: true,
      },
    });
    expect(activeRecordsInDb).toBe(1);
  });
});
