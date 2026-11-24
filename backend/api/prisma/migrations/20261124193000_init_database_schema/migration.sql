-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PASSENGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SeatType" AS ENUM ('CONVENTIONAL', 'EXECUTIVE', 'SEMI_SLEEPER', 'SLEEPER');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'BOARDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PASSENGER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buses" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "plate" VARCHAR(10) NOT NULL,
    "seat_capacity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_buses_seat_capacity_positive" CHECK ("seat_capacity" > 0)
);

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL,
    "bus_id" UUID NOT NULL,
    "seat_number" VARCHAR(5) NOT NULL,
    "seat_type" "SeatType" NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL,
    "origin" VARCHAR(120) NOT NULL,
    "destination" VARCHAR(120) NOT NULL,
    "distance" DECIMAL(8,2) NOT NULL,
    "estimated_duration" INTEGER NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_routes_distance_positive" CHECK ("distance" > 0),
    CONSTRAINT "chk_routes_duration_positive" CHECK ("estimated_duration" > 0)
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "bus_id" UUID NOT NULL,
    "departure_at" TIMESTAMPTZ(3) NOT NULL,
    "arrival_at" TIMESTAMPTZ(3) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_trips_price_non_negative" CHECK ("price" >= 0),
    CONSTRAINT "chk_trips_arrival_after_departure" CHECK ("arrival_at" > "departure_at")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "user_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "total_price" DECIMAL(10,2) NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_reservations_total_price_non_negative" CHECK ("total_price" >= 0)
);

-- CreateTable
CREATE TABLE "reservation_seats" (
    "id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reservation_seats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_reservation_seats_price_non_negative" CHECK ("price" >= 0)
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_reference" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_payments_amount_non_negative" CHECK ("amount" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_buses_plate" ON "buses"("plate");

-- CreateIndex
CREATE INDEX "idx_seats_bus_id" ON "seats"("bus_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_seats_bus_seat_number" ON "seats"("bus_id", "seat_number");

-- CreateIndex
CREATE INDEX "idx_routes_origin_destination" ON "routes"("origin", "destination");

-- CreateIndex
CREATE UNIQUE INDEX "uq_routes_origin_destination" ON "routes"("origin", "destination");

-- CreateIndex
CREATE INDEX "idx_trips_route_departure_status" ON "trips"("route_id", "departure_at", "status");

-- CreateIndex
CREATE INDEX "idx_trips_departure_status" ON "trips"("departure_at", "status");

-- CreateIndex
CREATE INDEX "idx_trips_price" ON "trips"("price");

-- CreateIndex
CREATE UNIQUE INDEX "uq_reservations_code" ON "reservations"("code");

-- CreateIndex
CREATE INDEX "idx_reservations_user_created" ON "reservations"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_reservations_trip_status" ON "reservations"("trip_id", "status");

-- CreateIndex
CREATE INDEX "idx_reservations_status_expires" ON "reservations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "idx_reservation_seats_trip_seat" ON "reservation_seats"("trip_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_reservation_seats_reservation_seat" ON "reservation_seats"("reservation_id", "seat_id");

-- CreateIndex: Guarantees at the database level that a (trip, seat) pair can NEVER have more than one active reservation
CREATE UNIQUE INDEX "uq_active_trip_seat" ON "reservation_seats"("trip_id", "seat_id") WHERE "is_active" = true;

-- CreateIndex
CREATE UNIQUE INDEX "uq_payments_reservation_id" ON "payments"("reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_payments_transaction_reference" ON "payments"("transaction_reference");

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_seats" ADD CONSTRAINT "reservation_seats_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_seats" ADD CONSTRAINT "reservation_seats_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_seats" ADD CONSTRAINT "reservation_seats_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
