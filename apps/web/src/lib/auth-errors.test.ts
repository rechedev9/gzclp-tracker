import { describe, it, expect } from 'bun:test';
import { sanitizeAuthError } from './auth-errors';

// ---------------------------------------------------------------------------
// sanitizeAuthError — public API mapping, integration-style
// Tests the full mapping contract: if the API returns X, the user sees Y.
// ---------------------------------------------------------------------------
describe('sanitizeAuthError', () => {
  it('should map all known error messages to user-friendly strings', () => {
    // This is a snapshot of the entire error mapping contract.
    // If a mapping changes, this test MUST break — that's CI.
    const mappings: Array<[string, string]> = [
      ['Invalid Google credential', 'Error al iniciar sesión con Google. Inténtalo de nuevo.'],
      ['No refresh token', 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.'],
      ['Invalid refresh token', 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.'],
      ['Refresh token expired', 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.'],
    ];

    for (const [raw, expected] of mappings) {
      expect(sanitizeAuthError(raw)).toBe(expected);
    }
  });

  it('should match partial messages containing known error strings', () => {
    const result = sanitizeAuthError('Error: Invalid Google credential from provider');
    expect(result).toBe('Error al iniciar sesión con Google. Inténtalo de nuevo.');
  });

  it('should return generic message for unknown errors', () => {
    const result = sanitizeAuthError('Database connection timeout');
    expect(result).toBe('Algo salió mal. Por favor, inténtalo de nuevo.');
  });

  it('should return generic message for empty string', () => {
    expect(sanitizeAuthError('')).toBe('Algo salió mal. Por favor, inténtalo de nuevo.');
  });
});
