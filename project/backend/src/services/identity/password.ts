import bcrypt from "bcryptjs";

// Cost factor of 12 balances Worker CPU-time limits against brute-force
// resistance — matches docs/08_Security_Standards.md §1.
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
