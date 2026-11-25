import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SeatAvailabilityDto } from '@viaja/shared';
import { BusSeatMap } from '../components/BusSeatMap';
import { Button } from '../components/Button';
import { FormInput } from '../components/FormInput';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusState';
import { useBookingStore } from '../stores/booking-store';

const MOCK_SEATS: SeatAvailabilityDto[] = [
  { id: 's-01', seatNumber: '01', seatType: 'EXECUTIVE', price: 120, status: 'AVAILABLE' },
  { id: 's-02', seatNumber: '02', seatType: 'EXECUTIVE', price: 120, status: 'OCCUPIED' },
  { id: 's-03', seatNumber: '03', seatType: 'EXECUTIVE', price: 120, status: 'AVAILABLE' },
  { id: 's-04', seatNumber: '04', seatType: 'EXECUTIVE', price: 120, status: 'AVAILABLE' },
  { id: 's-05', seatNumber: '05', seatType: 'EXECUTIVE', price: 120, status: 'AVAILABLE' },
  { id: 's-06', seatNumber: '06', seatType: 'EXECUTIVE', price: 120, status: 'AVAILABLE' },
];

describe('VIAJA Mobile — Components, Forms, Seat Selection & UI States', () => {
  beforeEach(() => {
    useBookingStore.getState().clearBookingDraft();
  });

  it('renders LoadingState feedback correctly', () => {
    render(<LoadingState message="Buscando horários..." />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
    expect(screen.getByText('Buscando horários...')).toBeTruthy();
  });

  it('renders EmptyState and ErrorState with retry handler', () => {
    const onRetry = jest.fn();

    const { unmount } = render(
      <EmptyState title="Nenhuma viagem" description="Altere a data selecionada." />,
    );
    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('Nenhuma viagem')).toBeTruthy();
    unmount();

    render(<ErrorState message="Falha de rede" onRetry={onRetry} />);
    expect(screen.getByTestId('error-state')).toBeTruthy();
    fireEvent.press(screen.getByTestId('retry-button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('displays FormInput validation message and blocks Button while loading', () => {
    const onSubmit = jest.fn();
    render(
      <>
        <FormInput
          testID="email-field"
          label="E-mail"
          value="invalido"
          errorMessage="E-mail inválido."
        />
        <Button testID="submit-btn" title="Continuar" loading onPress={onSubmit} />
      </>,
    );

    expect(screen.getByText('E-mail inválido.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('submit-btn'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('allows selecting AVAILABLE seats, blocks OCCUPIED seats and enforces 4-seat limit', () => {
    const onToggle = jest.fn((seat: SeatAvailabilityDto) => {
      useBookingStore.getState().toggleSeatSelection(seat);
    });

    render(<BusSeatMap seats={MOCK_SEATS} selectedSeatIds={[]} onToggleSeat={onToggle} />);

    // Occupied seat 02 must be disabled
    fireEvent.press(screen.getByTestId('seat-02'));
    expect(onToggle).not.toHaveBeenCalled();

    // Select 4 available seats (01, 03, 04, 05)
    fireEvent.press(screen.getByTestId('seat-01'));
    fireEvent.press(screen.getByTestId('seat-03'));
    fireEvent.press(screen.getByTestId('seat-04'));
    fireEvent.press(screen.getByTestId('seat-05'));

    expect(useBookingStore.getState().selectedSeats).toHaveLength(4);

    // 5th seat attempt returns limitReached = true and keeps length at 4
    const fifthAttempt = useBookingStore.getState().toggleSeatSelection(MOCK_SEATS[5]!);
    expect(fifthAttempt.limitReached).toBe(true);
    expect(useBookingStore.getState().selectedSeats).toHaveLength(4);

    // Syncing with fresh API response where seat 03 became OCCUPIED removes it automatically
    const freshApiSeats = MOCK_SEATS.map((s) =>
      s.id === 's-03' ? { ...s, status: 'OCCUPIED' as const } : s,
    );
    const removed = useBookingStore.getState().syncSelectionWithFreshAvailability(freshApiSeats);
    expect(removed).toEqual(['03']);
    expect(useBookingStore.getState().selectedSeats).toHaveLength(3);
  });
});
