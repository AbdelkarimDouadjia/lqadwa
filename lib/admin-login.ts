// The alias is only an account identifier; passwords are always verified by Supabase.
export function adminLoginEmail(identifier: string, ownerEmail: string | undefined) {
  const value = identifier.trim().toLowerCase();
  return value === "admin" ? ownerEmail?.trim().toLowerCase() || "" : value;
}
