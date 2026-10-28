import bcrypt from 'bcryptjs';

/**
 * Hash a plaintext password using bcrypt with 10 salt rounds
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Synchronous hash helper
 */
export function hashPasswordSync(plainText: string): string {
  return bcrypt.hashSync(plainText, 10);
}

/**
 * Compare plaintext password against a stored bcrypt hash
 */
export async function verifyPassword(plainText: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainText || !storedHashOrPlain) return false;

  // If stored value is a valid bcrypt hash
  if (
    storedHashOrPlain.startsWith('$2a$') ||
    storedHashOrPlain.startsWith('$2b$') ||
    storedHashOrPlain.startsWith('$2y$')
  ) {
    try {
      return await bcrypt.compare(plainText, storedHashOrPlain);
    } catch {
      return false;
    }
  }

  // Safe fallback if still in plain text
  return plainText === storedHashOrPlain;
}
