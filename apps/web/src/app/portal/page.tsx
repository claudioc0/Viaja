'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MAX_SEATS_PER_RESERVATION,
  type PaymentMethod,
  type SeatAvailabilityDto,
} from '@viaja/shared';
import {
  DataStateBox,
  StatusPill,
  SurfaceCard,
  TextField,
  ViajaButton,
} from '@/components/ui/primitives';
import type { ReservationDto, TripDto } from '@/features/types';
import { useAuth } from '@/hooks/use-auth';
import {
  useTripSeatsQuery,
  useTripsQuery,
  useWebBookingCheckoutMutation,
} from '@/hooks/use-viaja-web';
import { cn, formatCurrencyBRL, formatDateTimeBR, formatDurationMinutes } from '@/lib/utils';
import { WebApiError } from '@/services/api-client';

export default function PassengerPortalPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [origin, setOrigin] = useState('São Paulo');
  const [destination, setDestination] = useState('Rio de Janeiro');
  const [submittedFilters, setSubmittedFilters] = useState({
    origin: 'São Paulo',
    destination: 'Rio de Janeiro',
  });

  const [selectedTrip, setSelectedTrip] = useState<TripDto | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SeatAvailabilityDto[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [confirmedTicket, setConfirmedTicket] = useState<ReservationDto | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const tripsQuery = useTripsQuery({
    origin: submittedFilters.origin || undefined,
    destination: submittedFilters.destination || undefined,
    onlyAvailable: true,
    sortBy: 'price_asc',
  });

  const seatsQuery = useTripSeatsQuery(selectedTrip?.id ?? null);
  const checkoutMutation = useWebBookingCheckoutMutation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedTrip(null);
    setSelectedSeats([]);
    setConfirmedTicket(null);
    setBookingError(null);
    setSubmittedFilters({ origin, destination });
  };

  const toggleSeat = (seat: SeatAvailabilityDto) => {
    if (seat.status !== 'AVAILABLE') return;
    setBookingError(null);
    setSelectedSeats((prev) => {
      if (prev.some((s) => s.id === seat.id)) {
        return prev.filter((s) => s.id !== seat.id);
      }
      if (prev.length >= MAX_SEATS_PER_RESERVATION) {
        return prev;
      }
      return [...prev, seat].sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
    });
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!selectedTrip || selectedSeats.length === 0) return;

    setBookingError(null);
    try {
      const confirmed = await checkoutMutation.mutateAsync({
        tripId: selectedTrip.id,
        seatIds: selectedSeats.map((s) => s.id),
        method: paymentMethod,
      });
      setConfirmedTicket(confirmed);
      setSelectedSeats([]);
    } catch (err) {
      setBookingError(
        err instanceof WebApiError ? err.message : 'Falha ao finalizar pagamento simulado.',
      );
      void seatsQuery.refetch();
    }
  };

  const totalAmount = selectedSeats.reduce((acc, s) => acc + s.price, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-700 text-sm text-white">
              V
            </span>
            VIAJA
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-xs font-medium text-slate-600">{user.name}</span>
                {user.role === 'ADMIN' ? (
                  <Link
                    href="/admin"
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Painel Admin
                  </Link>
                ) : null}
                <ViajaButton variant="ghost" size="sm" onClick={() => void signOut()}>
                  Sair
                </ViajaButton>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Entrar / Cadastrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <SurfaceCard>
          <form onSubmit={handleSearch} className="grid items-end gap-4 md:grid-cols-3">
            <TextField
              label="Origem"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="São Paulo"
            />
            <TextField
              label="Destino"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Rio de Janeiro"
            />
            <ViajaButton type="submit">Pesquisar Viagens</ViajaButton>
          </form>
        </SurfaceCard>

        {confirmedTicket ? (
          <SurfaceCard
            data-testid="confirmed-reservation-card"
            className="space-y-4 border-emerald-300 bg-emerald-50/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusPill tone="success">RESERVA CONFIRMADA</StatusPill>
              <span
                className="font-mono text-lg font-extrabold text-blue-700"
                data-testid="confirmed-reservation-code"
              >
                {confirmedTicket.code}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {confirmedTicket.trip.route.origin} → {confirmedTicket.trip.route.destination}
              </h2>
              <p className="font-mono text-sm text-slate-600">
                Partida: {formatDateTimeBR(confirmedTicket.trip.departureAt)} · Poltronas:{' '}
                {confirmedTicket.seats.map((s) => s.seatNumber).join(', ')} · Total:{' '}
                {formatCurrencyBRL(confirmedTicket.totalPrice)}
              </p>
            </div>
            <ViajaButton variant="outline" size="sm" onClick={() => setConfirmedTicket(null)}>
              Realizar nova pesquisa
            </ViajaButton>
          </SurfaceCard>
        ) : null}

        {bookingError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {bookingError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Viagens Disponíveis</h2>
            {tripsQuery.isLoading ? (
              <DataStateBox kind="loading" title="Pesquisando viagens..." />
            ) : (tripsQuery.data ?? []).length === 0 ? (
              <DataStateBox
                kind="empty"
                title="Nenhuma viagem encontrada"
                description="Altere a origem ou o destino acima."
              />
            ) : (
              (tripsQuery.data ?? []).map((trip) => (
                <SurfaceCard
                  key={trip.id}
                  data-testid={`portal-trip-${trip.id}`}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-4 transition-colors',
                    selectedTrip?.id === trip.id && 'border-blue-600 ring-1 ring-blue-600',
                  )}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-blue-700">{trip.bus.name}</div>
                    <div className="text-base font-extrabold text-slate-900">
                      {trip.route.origin} → {trip.route.destination}
                    </div>
                    <div className="font-mono text-xs text-slate-500">
                      {formatDateTimeBR(trip.departureAt)} ·{' '}
                      {formatDurationMinutes(trip.durationMinutes)} · {trip.availableSeats} livres
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="font-mono text-xl font-extrabold text-slate-900">
                      {formatCurrencyBRL(trip.price)}
                    </div>
                    <ViajaButton
                      size="sm"
                      onClick={() => {
                        setSelectedTrip(trip);
                        setSelectedSeats([]);
                        setConfirmedTicket(null);
                      }}
                    >
                      Selecionar Viagem
                    </ViajaButton>
                  </div>
                </SurfaceCard>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Seleção de Assento e Pagamento</h2>
            {!selectedTrip ? (
              <SurfaceCard className="text-sm text-slate-500">
                Selecione uma viagem na lista ao lado para abrir o mapa de assentos.
              </SurfaceCard>
            ) : seatsQuery.isLoading ? (
              <DataStateBox kind="loading" title="Carregando mapa do ônibus..." />
            ) : (
              <SurfaceCard className="space-y-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Frente · Motorista</span>
                  <span>
                    Selecionados: {selectedSeats.length}/{MAX_SEATS_PER_RESERVATION}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(seatsQuery.data?.seats ?? []).map((seat) => {
                    const isOccupied = seat.status === 'OCCUPIED';
                    const isSelected = selectedSeats.some((s) => s.id === seat.id);
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={isOccupied}
                        data-testid={`portal-seat-${seat.seatNumber}`}
                        onClick={() => toggleSeat(seat)}
                        className={cn(
                          'h-10 rounded-lg border font-mono text-xs font-bold transition-colors',
                          isOccupied
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                            : isSelected
                              ? 'border-blue-700 bg-blue-700 text-white'
                              : 'border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
                        )}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Assentos:{' '}
                      <b className="font-mono">
                        {selectedSeats.map((s) => s.seatNumber).join(', ') || '—'}
                      </b>
                    </span>
                    <span className="font-mono text-lg font-extrabold text-blue-700">
                      {formatCurrencyBRL(totalAmount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <ViajaButton
                      type="button"
                      variant={paymentMethod === 'PIX' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('PIX')}
                    >
                      PIX Simulado
                    </ViajaButton>
                    <ViajaButton
                      type="button"
                      variant={paymentMethod === 'CREDIT_CARD' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('CREDIT_CARD')}
                    >
                      Cartão Simulado
                    </ViajaButton>
                  </div>

                  <ViajaButton
                    className="w-full"
                    disabled={selectedSeats.length === 0}
                    isLoading={checkoutMutation.isPending}
                    onClick={() => void handleCheckout()}
                  >
                    {user ? 'Finalizar Pagamento Simulado' : 'Autenticar-se para Concluir Reserva'}
                  </ViajaButton>
                </div>
              </SurfaceCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
