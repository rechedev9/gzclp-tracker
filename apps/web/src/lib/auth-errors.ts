const ERROR_MAP: ReadonlyMap<string, string> = new Map([
  ['Invalid email or password', 'Invalid email or password.'],
  ['Email already registered', 'An account with this email already exists.'],
  ['No refresh token', 'Your session has expired. Please sign in again.'],
  ['Invalid refresh token', 'Your session has expired. Please sign in again.'],
  ['Refresh token expired', 'Your session has expired. Please sign in again.'],
]);

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

export function sanitizeAuthError(rawMessage: string): string {
  const exact = ERROR_MAP.get(rawMessage);
  if (exact) return exact;

  for (const [key, friendly] of ERROR_MAP) {
    if (rawMessage.includes(key)) return friendly;
  }

  return GENERIC_MESSAGE;
}
