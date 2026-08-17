export function isStrongSuperAdminPassword(value: string) {
  return value.length >= 16 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}
