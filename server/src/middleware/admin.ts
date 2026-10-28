import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { verifyPassword } from '../utils/hash';

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function handleAdminLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Email and password are required.' });
    return;
  }

  if (!config.adminEmail || !config.adminPasswordHash) {
    res.status(503).json({ error: 'AUTH_UNAVAILABLE', message: 'Admin authentication is not configured on this server.' });
    return;
  }

  const validEmail = safeCompare(email.trim().toLowerCase(), config.adminEmail.toLowerCase());
  const validPass = await verifyPassword(password.trim(), config.adminPasswordHash);

  if (!validEmail || !validPass) {
    res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Access Denied: Invalid administrator email or password.',
    });
    return;
  }

  // Generate Admin JWT Token valid for 7 days
  const adminToken = jwt.sign(
    { role: 'admin', email: config.adminEmail },
    config.sessionSecret,
    { expiresIn: '7d' }
  );

  res.status(200).json({
    success: true,
    token: adminToken,
    email: config.adminEmail,
    message: 'Administrator authenticated successfully.',
  });
}

export function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const adminSecretHeader = req.headers['x-admin-secret'] as string;

  // Option 1: Direct admin secret header
  if (adminSecretHeader && adminSecretHeader === config.adminSecret) {
    return next();
  }

  // Option 2: Bearer JWT Admin Token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, config.sessionSecret) as any;
      if (decoded && decoded.role === 'admin') {
        return next();
      }
    } catch {}
  }

  res.status(403).json({
    error: 'FORBIDDEN',
    message: 'Admin access required. Please log in with authorized credentials.',
  });
}
