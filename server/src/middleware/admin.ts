import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const adminSecretHeader =
    (req.headers['x-admin-secret'] as string) ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined);

  if (!adminSecretHeader || adminSecretHeader !== config.adminSecret) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Admin access required. Invalid or missing admin secret.',
    });
    return;
  }

  next();
}
