import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminDashboardPage from '../app/admin/page';
import LoginPage from '../app/login/page';
import { DataStateBox } from '../components/ui/primitives';

const pushMock = vi.fn();
const signInMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: pushMock,
  }),
  usePathname: () => '/admin',
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Administrador VIAJA',
      email: 'admin@viaja.app',
      role: 'ADMIN',
      createdAt: '2026-11-24T00:00:00.000Z',
      updatedAt: '2026-11-24T00:00:00.000Z',
    },
    isHydrated: true,
    signIn: signInMock,
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-viaja-web', () => ({
  useDashboardSummaryQuery: () => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: {
      totalTrips: 12,
      totalReservations: 48,
      confirmedReservations: 41,
      simulatedRevenue: 6420.5,
      occupancyRate: 78.5,
      topTrips: [
        {
          tripId: 't-1',
          origin: 'São Paulo, SP',
          destination: 'Rio de Janeiro, RJ',
          departureAt: '2026-12-01T11:00:00.000Z',
          busName: 'Viaja Executivo 101',
          seatCapacity: 40,
          occupiedSeats: 34,
          occupancyRate: 85,
          revenue: 4076.6,
        },
      ],
    },
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('VIAJA Web — Components, Login Validation & Admin Dashboard', () => {
  it('renders error DataStateBox and triggers retry callback', () => {
    const retry = vi.fn();
    render(
      <DataStateBox
        kind="error"
        title="Erro de sincronização"
        description="API indisponível"
        actionText="Recarregar"
        onAction={retry}
      />,
    );

    expect(screen.getByText('Erro de sincronização')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('validates LoginPage inputs with Zod and redirects ADMIN to /admin', async () => {
    signInMock.mockResolvedValueOnce({
      id: '1',
      name: 'Admin',
      email: 'admin@viaja.app',
      role: 'ADMIN',
    });

    renderWithQuery(<LoginPage />);

    // Submit empty form -> shows validation feedback
    fireEvent.click(screen.getByRole('button', { name: 'Acessar Plataforma' }));
    await waitFor(() => {
      expect(screen.getByText('E-mail inválido.')).toBeInTheDocument();
    });

    // Quick-fill Admin credentials and submit
    fireEvent.click(screen.getByRole('button', { name: 'Preencher Admin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acessar Plataforma' }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: 'admin@viaja.app',
        password: 'Admin@123',
      });
      expect(pushMock).toHaveBeenCalledWith('/admin');
    });
  });

  it('renders real KPI indicators and ranking table on AdminDashboardPage', () => {
    renderWithQuery(<AdminDashboardPage />);

    expect(screen.getByTestId('kpi-trips')).toHaveTextContent('12');
    expect(screen.getByTestId('kpi-reservations')).toHaveTextContent('48');
    expect(screen.getByTestId('kpi-occupancy')).toHaveTextContent('78.5%');
    expect(screen.getByText(/Viaja Executivo 101/)).toBeInTheDocument();
  });
});
