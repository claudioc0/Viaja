import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type SeatType } from '@prisma/client';

const prisma = new PrismaClient();

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

async function createBusWithSeats(params: {
  name: string;
  plate: string;
  seatCapacity: number;
  seatType: SeatType;
}) {
  const bus = await prisma.bus.upsert({
    where: { plate: params.plate },
    update: {
      name: params.name,
      seatCapacity: params.seatCapacity,
    },
    create: {
      name: params.name,
      plate: params.plate,
      seatCapacity: params.seatCapacity,
    },
  });

  const seatData = Array.from({ length: params.seatCapacity }, (_, index) => ({
    busId: bus.id,
    seatNumber: String(index + 1).padStart(2, '0'),
    seatType: params.seatType,
  }));

  await prisma.seat.createMany({
    data: seatData,
    skipDuplicates: true,
  });

  const seats = await prisma.seat.findMany({
    where: { busId: bus.id },
    orderBy: { seatNumber: 'asc' },
  });

  return { bus, seats };
}

async function main() {
  console.info('Starting VIAJA database seed...');

  // Clean transactional data in safe dependency order to keep seed idempotent
  await prisma.payment.deleteMany();
  await prisma.reservationSeat.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.trip.deleteMany();

  const [adminPasswordHash, passengerPasswordHash] = await Promise.all([
    bcrypt.hash('Admin@123', 10),
    bcrypt.hash('Viaja@123', 10),
  ]);

  // 1. Users (Admin + Passengers)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@viaja.app' },
    update: { name: 'Administrador VIAJA', role: 'ADMIN', passwordHash: adminPasswordHash },
    create: {
      name: 'Administrador VIAJA',
      email: 'admin@viaja.app',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const passengerOne = await prisma.user.upsert({
    where: { email: 'passageiro@viaja.app' },
    update: { name: 'Claudio Passageiro', role: 'PASSENGER', passwordHash: passengerPasswordHash },
    create: {
      name: 'Claudio Passageiro',
      email: 'passageiro@viaja.app',
      passwordHash: passengerPasswordHash,
      role: 'PASSENGER',
    },
  });

  const passengerTwo = await prisma.user.upsert({
    where: { email: 'mariana@viaja.app' },
    update: { name: 'Mariana Costa', role: 'PASSENGER', passwordHash: passengerPasswordHash },
    create: {
      name: 'Mariana Costa',
      email: 'mariana@viaja.app',
      passwordHash: passengerPasswordHash,
      role: 'PASSENGER',
    },
  });

  // 2. Buses + Physical Seats
  const [execBus, semiSleeperBus, sleeperBus] = await Promise.all([
    createBusWithSeats({
      name: 'Viaja Executivo 101',
      plate: 'VJA1A01',
      seatCapacity: 40,
      seatType: 'EXECUTIVE',
    }),
    createBusWithSeats({
      name: 'Viaja Semi-Leito 202',
      plate: 'VJA2B02',
      seatCapacity: 36,
      seatType: 'SEMI_SLEEPER',
    }),
    createBusWithSeats({
      name: 'Viaja Leito Plus 303',
      plate: 'VJA3C03',
      seatCapacity: 28,
      seatType: 'SLEEPER',
    }),
  ]);

  // 3. Routes
  const routeSpecs = [
    {
      origin: 'São Paulo, SP',
      destination: 'Rio de Janeiro, RJ',
      distance: '435.00',
      estimatedDuration: 360,
    },
    {
      origin: 'Rio de Janeiro, RJ',
      destination: 'São Paulo, SP',
      distance: '435.00',
      estimatedDuration: 360,
    },
    {
      origin: 'São Paulo, SP',
      destination: 'Curitiba, PR',
      distance: '408.50',
      estimatedDuration: 340,
    },
    {
      origin: 'Curitiba, PR',
      destination: 'São Paulo, SP',
      distance: '408.50',
      estimatedDuration: 340,
    },
    {
      origin: 'São Paulo, SP',
      destination: 'Belo Horizonte, MG',
      distance: '586.00',
      estimatedDuration: 480,
    },
    {
      origin: 'Rio de Janeiro, RJ',
      destination: 'Belo Horizonte, MG',
      distance: '442.00',
      estimatedDuration: 400,
    },
  ] as const;

  const routes = await Promise.all(
    routeSpecs.map((spec) =>
      prisma.route.upsert({
        where: {
          origin_destination: {
            origin: spec.origin,
            destination: spec.destination,
          },
        },
        update: {
          distance: spec.distance,
          estimatedDuration: spec.estimatedDuration,
        },
        create: {
          origin: spec.origin,
          destination: spec.destination,
          distance: spec.distance,
          estimatedDuration: spec.estimatedDuration,
        },
      }),
    ),
  );

  const [spToRj, rjToSp, spToCwb, cwbToSp, spToBh, rjToBh] = routes;
  if (!spToRj || !rjToSp || !spToCwb || !cwbToSp || !spToBh || !rjToBh) {
    throw new Error('Failed to create seed routes.');
  }

  // 4. Trips scheduled across the upcoming days
  const now = new Date();
  const tomorrowMorning = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 11, 0, 0),
  );

  const trips = await Promise.all([
    prisma.trip.create({
      data: {
        routeId: spToRj.id,
        busId: execBus.bus.id,
        departureAt: tomorrowMorning,
        arrivalAt: addMinutes(tomorrowMorning, spToRj.estimatedDuration),
        price: '119.90',
        status: 'SCHEDULED',
      },
    }),
    prisma.trip.create({
      data: {
        routeId: spToRj.id,
        busId: sleeperBus.bus.id,
        departureAt: addHours(tomorrowMorning, 12),
        arrivalAt: addMinutes(addHours(tomorrowMorning, 12), spToRj.estimatedDuration),
        price: '199.00',
        status: 'SCHEDULED',
      },
    }),
    prisma.trip.create({
      data: {
        routeId: rjToSp.id,
        busId: semiSleeperBus.bus.id,
        departureAt: addHours(tomorrowMorning, 4),
        arrivalAt: addMinutes(addHours(tomorrowMorning, 4), rjToSp.estimatedDuration),
        price: '149.90',
        status: 'SCHEDULED',
      },
    }),
    prisma.trip.create({
      data: {
        routeId: spToCwb.id,
        busId: semiSleeperBus.bus.id,
        departureAt: addHours(tomorrowMorning, 24),
        arrivalAt: addMinutes(addHours(tomorrowMorning, 24), spToCwb.estimatedDuration),
        price: '134.90',
        status: 'SCHEDULED',
      },
    }),
    prisma.trip.create({
      data: {
        routeId: cwbToSp.id,
        busId: execBus.bus.id,
        departureAt: addHours(tomorrowMorning, 30),
        arrivalAt: addMinutes(addHours(tomorrowMorning, 30), cwbToSp.estimatedDuration),
        price: '114.90',
        status: 'SCHEDULED',
      },
    }),
    prisma.trip.create({
      data: {
        routeId: spToBh.id,
        busId: sleeperBus.bus.id,
        departureAt: addHours(tomorrowMorning, 36),
        arrivalAt: addMinutes(addHours(tomorrowMorning, 36), spToBh.estimatedDuration),
        price: '219.90',
        status: 'SCHEDULED',
      },
    }),
    prisma.trip.create({
      data: {
        routeId: rjToBh.id,
        busId: execBus.bus.id,
        departureAt: addHours(tomorrowMorning, 48),
        arrivalAt: addMinutes(addHours(tomorrowMorning, 48), rjToBh.estimatedDuration),
        price: '129.90',
        status: 'SCHEDULED',
      },
    }),
  ]);

  const primaryTrip = trips[0];
  const secondTrip = trips[3];
  const execSeat01 = execBus.seats[0];
  const execSeat02 = execBus.seats[1];
  const execSeat05 = execBus.seats[4];
  const semiSeat07 = semiSleeperBus.seats[6];

  if (!primaryTrip || !secondTrip || !execSeat01 || !execSeat02 || !execSeat05 || !semiSeat07) {
    throw new Error('Failed to initialize seed trips or seats.');
  }

  // 5. Sample Reservations + Payments
  // 5a. Confirmed reservation (2 seats, PIX APPROVED)
  await prisma.reservation.create({
    data: {
      code: 'VJ-8F4K92',
      userId: passengerOne.id,
      tripId: primaryTrip.id,
      status: 'CONFIRMED',
      totalPrice: '239.80',
      seats: {
        create: [
          { tripId: primaryTrip.id, seatId: execSeat01.id, price: '119.90', isActive: true },
          { tripId: primaryTrip.id, seatId: execSeat02.id, price: '119.90', isActive: true },
        ],
      },
      payment: {
        create: {
          amount: '239.80',
          method: 'PIX',
          status: 'APPROVED',
          transactionReference: 'SIM-PIX-8F4K92-001',
        },
      },
    },
  });

  // 5b. Pending reservation with active expiration window
  await prisma.reservation.create({
    data: {
      code: 'VJ-3M9P11',
      userId: passengerTwo.id,
      tripId: secondTrip.id,
      status: 'PENDING',
      totalPrice: '134.90',
      expiresAt: addMinutes(new Date(), 15),
      seats: {
        create: [{ tripId: secondTrip.id, seatId: semiSeat07.id, price: '134.90', isActive: true }],
      },
      payment: {
        create: {
          amount: '134.90',
          method: 'CREDIT_CARD',
          status: 'PENDING',
          transactionReference: 'SIM-CRD-3M9P11-002',
        },
      },
    },
  });

  // 5c. Cancelled reservation (isActive = false, seat 05 remains free for new bookings)
  await prisma.reservation.create({
    data: {
      code: 'VJ-1A7Z04',
      userId: passengerTwo.id,
      tripId: primaryTrip.id,
      status: 'CANCELLED',
      totalPrice: '119.90',
      seats: {
        create: [
          { tripId: primaryTrip.id, seatId: execSeat05.id, price: '119.90', isActive: false },
        ],
      },
      payment: {
        create: {
          amount: '119.90',
          method: 'PIX',
          status: 'REFUNDED',
          transactionReference: 'SIM-PIX-1A7Z04-003',
        },
      },
    },
  });

  console.info('Seed completed successfully:', {
    users: [adminUser.email, passengerOne.email, passengerTwo.email],
    buses: 3,
    routes: routes.length,
    trips: trips.length,
    reservations: 3,
  });
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
