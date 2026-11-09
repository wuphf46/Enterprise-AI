export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 160;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;
export const TENANT_MAX_LENGTH = 100;

export function validateUsername(value: string): string | null {
  const username = value.trim();
  if (!username) return 'Username is required.';
  if (username.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  if (username.length > USERNAME_MAX_LENGTH) return `Username must be at most ${USERNAME_MAX_LENGTH} characters.`;
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required.';
  if (value.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (value.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  return null;
}

export function validateTenant(value: string): string | null {
  const tenant = value.trim();
  if (!tenant) return 'Workspace is required.';
  if (tenant.length > TENANT_MAX_LENGTH) return `Workspace must be at most ${TENANT_MAX_LENGTH} characters.`;
  return null;
}
