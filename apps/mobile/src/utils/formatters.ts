import type { ReservationStatus, SeatType } from '@viaja/shared';

export function formatCurrencyBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function formatTimeUTC(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateBR(isoString: string): string {
  const date = new Date(isoString);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function getTomorrowIsoDate(daysOffset = 1): string {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysOffset),
  );
  return target.toISOString().slice(0, 10);
}

export function formatSeatTypeLabel(type: SeatType): string {
  const labels: Record<SeatType, string> = {
    CONVENTIONAL: 'Convencional',
    EXECUTIVE: 'Executivo',
    SEMI_SLEEPER: 'Semi-Leito',
    SLEEPER: 'Leito Plus',
  };
  return labels[type];
}

export function formatReservationStatusLabel(status: ReservationStatus): string {
  const labels: Record<ReservationStatus, string> = {
    PENDING: 'Aguardando Pagamento',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    EXPIRED: 'Expirada',
  };
  return labels[status];
}
