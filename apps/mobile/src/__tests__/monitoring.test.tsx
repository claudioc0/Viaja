import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { REDACTED_VALUE } from '@viaja/shared';
import {
  type CrashlyticsAdapter,
  clearMobileDiagnosticEvents,
  getMobileDiagnosticEvents,
  MobileErrorBoundary,
  recordMobileError,
  runMonitoringDiagnosticCheck,
  setCrashlyticsAdapterForTesting,
  setMobileMonitoringUser,
} from '../services/monitoring';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((cb: (scope: { setExtras: jest.Mock }) => void) =>
    cb({ setExtras: jest.fn() }),
  ),
  captureException: jest.fn(),
}));

describe('VIAJA Mobile — Sentry & Firebase Crashlytics Telemetry', () => {
  beforeEach(() => {
    clearMobileDiagnosticEvents();
    setCrashlyticsAdapterForTesting(null);
  });

  it('records sanitized errors and user role in Crashlytics without leaking tokens or passwords', () => {
    const mockAdapter: CrashlyticsAdapter = {
      setCrashlyticsCollectionEnabled: jest.fn(),
      setUserId: jest.fn(),
      setAttributes: jest.fn(),
      log: jest.fn(),
      recordError: jest.fn(),
      crash: jest.fn(),
    };

    setCrashlyticsAdapterForTesting(mockAdapter);

    setMobileMonitoringUser({ id: 'usr-mobile-1', role: 'PASSENGER' });
    expect(mockAdapter.setUserId).toHaveBeenCalledWith('usr-mobile-1');
    expect(mockAdapter.setAttributes).toHaveBeenCalledWith({ role: 'PASSENGER' });

    const result = recordMobileError(new Error('Request failed with Bearer secret-jwt-token'), {
      endpoint: '/api/payments',
      password: 'SuperSecretPassword',
      accessToken: 'raw-access-token',
    });

    expect(result.crashlyticsCaptured).toBe(true);
    expect(mockAdapter.setAttributes).toHaveBeenCalledWith({
      endpoint: '/api/payments',
      password: REDACTED_VALUE,
      accessToken: REDACTED_VALUE,
    });
    expect(mockAdapter.recordError).toHaveBeenCalledTimes(1);

    const recordedErr = (mockAdapter.recordError as jest.Mock).mock.calls[0][0] as Error;
    expect(recordedErr.message).not.toContain('secret-jwt-token');
    expect(recordedErr.message).toContain(`Bearer ${REDACTED_VALUE}`);
  });

  it('validates failure capture via runMonitoringDiagnosticCheck in dev and test builds', () => {
    const check = runMonitoringDiagnosticCheck('non_fatal');
    expect(check.eventsRecorded).toBeGreaterThanOrEqual(2);

    const events = getMobileDiagnosticEvents();
    expect(events[0]?.type).toBe('error');
    expect(events[0]?.summary).toContain('ViajaMonitoringDiagnosticError');
  });

  it('catches uncaught render crashes with MobileErrorBoundary and renders recovery screen', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function BrokenScreen(): React.ReactElement {
      throw new Error('Crash during seat map render');
    }

    render(
      <MobileErrorBoundary>
        <Text>Conteúdo oculto</Text>
        <BrokenScreen />
      </MobileErrorBoundary>,
    );

    expect(screen.getByTestId('mobile-error-boundary')).toBeTruthy();
    expect(screen.getByText('Ocorreu uma falha inesperada')).toBeTruthy();

    consoleErrorSpy.mockRestore();
  });
});
