const ERROR_MAP: ReadonlyMap<string, string> = new Map([
  ['Invalid Google credential', 'Error al iniciar sesión con Google. Inténtalo de nuevo.'],
  ['No refresh token', 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.'],
  ['Invalid refresh token', 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.'],
  ['Refresh token expired', 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.'],
]);

const GENERIC_MESSAGE = 'Algo salió mal. Por favor, inténtalo de nuevo.';

export function sanitizeAuthError(rawMessage: string): string {
  const exact = ERROR_MAP.get(rawMessage);
  if (exact) return exact;

  for (const [key, friendly] of ERROR_MAP) {
    if (rawMessage.includes(key)) return friendly;
  }

  return GENERIC_MESSAGE;
}
