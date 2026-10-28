import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db/client';
import { DeviceSessionPayload } from '../services/licence';

export interface AuthenticatedRequest extends Request {
  session?: DeviceSessionPayload & { isGuest?: boolean };
}

export async function verifyDeviceSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || (req.headers['x-device-token'] as string);

  // If Free Mode and no token provided, grant guest access for open playback
  if (!authHeader) {
    if (config.freeMode) {
      req.session = {
        licenceId: 0,
        userId: 0,
        deviceId: (req.headers['x-device-id'] as string) || 'guest-device',
        deviceName: 'Guest Listener',
        isGuest: true,
      };
      return next();
    }
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please activate your licence key.',
    });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, config.sessionSecret) as DeviceSessionPayload;

    // Check that device session is still active in database (not logged out)
    const deviceRes = await query(
      `SELECT d.id, l.status as licence_status
       FROM devices d
       JOIN licences l ON l.id = d.licence_id
       WHERE d.licence_id = $1 AND d.device_id = $2`,
      [decoded.licenceId, decoded.deviceId]
    );

    if (deviceRes.rows.length === 0) {
      res.status(401).json({
        error: 'SESSION_REVOKED',
        message: 'This device has been logged out. Please re-activate.',
      });
      return;
    }

    if (deviceRes.rows[0].licence_status !== 'active') {
      res.status(403).json({
        error: 'LICENCE_REVOKED',
        message: 'This licence is no longer active.',
      });
      return;
    }

    // Update last_active_at asynchronously
    query(
      `UPDATE devices SET last_active_at = NOW() WHERE licence_id = $1 AND device_id = $2`,
      [decoded.licenceId, decoded.deviceId]
    ).catch(() => {});

    req.session = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Session token has expired or is invalid. Please re-activate.',
    });
  }
}

export function requireDeviceAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // If Free Mode is active, permit guest device sessions to manage their private favourites & playlists
  if (config.freeMode) {
    return next();
  }

  if (!req.session || req.session.isGuest || !req.session.licenceId) {
    res.status(401).json({
      error: 'ACTIVATION_REQUIRED',
      message: 'This feature requires an active licence key. Please activate your device.',
    });
    return;
  }
  next();
}
