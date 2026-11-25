import { expect, test } from '@playwright/test';

test.describe('VIAJA End-to-End Critical Journeys', () => {
  test('completes full passenger booking flow: access -> login -> search -> select trip -> select seat -> simulated payment -> confirm reservation', async ({
    page,
  }) => {
    // 1. Acessar a aplicação
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: /Gestão operacional e passagens digitais/i }),
    ).toBeVisible();

    // 2. Autenticar-se como passageiro
    await page.getByRole('link', { name: 'Acessar Plataforma' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole('button', { name: 'Preencher Passageiro' }).click();
    await page.getByRole('button', { name: 'Acessar Plataforma' }).click();
    await expect(page).toHaveURL(/\/portal$/);

    // 3. Pesquisar viagem
    await page.getByLabel('Origem').fill('São Paulo');
    await page.getByLabel('Destino').fill('Rio de Janeiro');
    await page.getByRole('button', { name: 'Pesquisar Viagens' }).click();

    // 4. Selecionar viagem
    const selectTripButton = page.getByRole('button', { name: 'Selecionar Viagem' }).first();
    await expect(selectTripButton).toBeVisible();
    await selectTripButton.click();

    // 5. Selecionar assento disponível
    const availableSeat = page.locator('[data-testid^="portal-seat-"]:not([disabled])').first();
    await expect(availableSeat).toBeVisible();
    await availableSeat.click();

    // 6. Finalizar pagamento simulado
    await page.getByRole('button', { name: 'PIX Simulado' }).click();
    await page.getByRole('button', { name: 'Finalizar Pagamento Simulado' }).click();

    // 7. Confirmar reserva
    const confirmationCard = page.getByTestId('confirmed-reservation-card');
    await expect(confirmationCard).toBeVisible();
    await expect(page.getByTestId('confirmed-reservation-code')).toHaveText(/^VJ-[A-Z2-9]{6}$/);
  });

  test('authenticates administrator and displays live dashboard KPIs and reservations', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Preencher Admin' }).click();
    await page.getByRole('button', { name: 'Acessar Plataforma' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId('kpi-trips')).toBeVisible();
    await expect(page.getByTestId('kpi-revenue')).toBeVisible();

    await page.getByRole('link', { name: 'Consultar Reservas' }).click();
    await expect(page).toHaveURL(/\/admin\/reservations$/);
    await expect(page.getByText('VJ-8F4K92')).toBeVisible();
  });
});
