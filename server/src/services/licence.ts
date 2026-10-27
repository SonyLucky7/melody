import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db/client';
import { config } from '../config';

export interface DeviceSessionPayload {
  licenceId: number;
  userId: number;
  deviceId: string;
  deviceName: string;
  iat?: number;
  exp?: number;
}

export interface ActivationResult {
  success: boolean;
  status: 'ACTIVATED' | 'RENEWED' | 'DEVICE_LIMIT_REACHED' | 'INVALID_KEY' | 'REVOKED';
  token?: string;
  devices?: Array<{
    device_id: string;
    device_name: string;
    last_active_at: string;
  }>;
  message?: string;
}

/**
 * Option 1 Licence Key Generator
 * Format: 12 chars = first 3 of firstName (upper) + first 3 of surname (upper) + last 6 of mobile
 * Example: Rahul Sharma + 9876543210 -> RAH + SHA + 543210 = RAHSHA543210
 */
export function generateOption1Key(firstName: string, surname: string, mobile: string): string {
  const cleanFirst = firstName.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(3, 'X').slice(0, 3);
  const cleanSurname = surname.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(3, 'X').slice(0, 3);
  const cleanMobile = mobile.trim().replace(/\D/g, '');
  const last6Mobile = cleanMobile.slice(-6).padStart(6, '0');

  return `${cleanFirst}${cleanSurname}${last6Mobile}`;
}

/**
 * Formats a 12-char key into display groups: RAHS-HA98-7654
 */
export function formatLicenceKey(rawKey: string): string {
  const sanitized = normalizeKey(rawKey);
  if (sanitized.length !== 12) return rawKey;
  return `${sanitized.slice(0, 4)}-${sanitized.slice(4, 8)}-${sanitized.slice(8, 12)}`;
}

/**
 * Strips whitespace and hyphens for canonical 12-char uppercase key
 */
export function normalizeKey(key: string): string {
  return key.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Creates or issues an Option 1 Licence Key for a user
 */
export async function issueLicence(
  firstName: string,
  surname: string,
  mobile: string,
  email?: string
): Promise<{ licenceKey: string; formattedKey: string; licenceId: number; userId: number }> {
  // 1. Find or create user
  const userRes = await query(
    `INSERT INTO users (first_name, surname, mobile, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (mobile) DO UPDATE 
     SET first_name = EXCLUDED.first_name, surname = EXCLUDED.surname, email = COALESCE(EXCLUDED.email, users.email)
     RETURNING id`,
    [firstName.trim(), surname.trim(), mobile.trim(), email?.trim() || null]
  );
  const userId = userRes.rows[0].id;

  // 2. Generate Option 1 key
  const rawKey = generateOption1Key(firstName, surname, mobile);
  const formattedKey = formatLicenceKey(rawKey);

  // 3. Insert or update licence
  const licenceRes = await query(
    `INSERT INTO licences (user_id, licence_key, status, max_devices, paid_at)
     VALUES ($1, $2, 'active', 5, NOW())
     ON CONFLICT (licence_key) DO UPDATE
     SET status = 'active', paid_at = NOW()
     RETURNING id`,
    [userId, rawKey]
  );
  const licenceId = licenceRes.rows[0].id;

  return {
    licenceKey: rawKey,
    formattedKey,
    licenceId,
    userId,
  };
}

/**
 * Key-Only Activation with 5-Device Concurrency Enforcement
 */
export async function activateDevice(
  keyInput: string,
  deviceId: string,
  deviceName: string
): Promise<ActivationResult> {
  const normalizedKey = normalizeKey(keyInput);

  // 1. Look up licence in PostgreSQL (Strict security: must exist in table)
  const licenceRes = await query(
    `SELECT l.id as licence_id, l.user_id, l.status, l.max_devices, l.paid_at
     FROM licences l
     WHERE l.licence_key = $1`,
    [normalizedKey]
  );

  if (licenceRes.rows.length === 0) {
    return {
      success: false,
      status: 'INVALID_KEY',
      message: 'Invalid licence key. This key was not issued by Melody.',
    };
  }

  const licence = licenceRes.rows[0];

  if (licence.status !== 'active') {
    return {
      success: false,
      status: 'REVOKED',
      message: 'This licence has been revoked.',
    };
  }

  // Check paid status if free mode is disabled
  if (!config.freeMode && !licence.paid_at) {
    return {
      success: false,
      status: 'INVALID_KEY',
      message: 'Licence has not been activated via payment.',
    };
  }

  // 2. Check existing devices for this licence
  const devicesRes = await query(
    `SELECT id, device_id, device_name, last_active_at
     FROM devices
     WHERE licence_id = $1`,
    [licence.licence_id]
  );

  const existingDevice = devicesRes.rows.find((d: any) => d.device_id === deviceId);

  // Sign per-device JWT session token
  const payload: DeviceSessionPayload = {
    licenceId: licence.licence_id,
    userId: licence.user_id,
    deviceId,
    deviceName,
  };
  const token = jwt.sign(payload, config.sessionSecret, { expiresIn: '90d' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Case A: Device already registered -> renew session without consuming slot
  if (existingDevice) {
    await query(
      `UPDATE devices 
       SET device_name = $1, device_token_hash = $2, last_active_at = NOW()
       WHERE licence_id = $3 AND device_id = $4`,
      [deviceName, tokenHash, licence.licence_id, deviceId]
    );

    return {
      success: true,
      status: 'RENEWED',
      token,
      message: 'Session renewed successfully.',
    };
  }

  // Case B: New device, slot available (< 5 active devices)
  if (devicesRes.rows.length < licence.max_devices) {
    await query(
      `INSERT INTO devices (licence_id, device_id, device_name, device_token_hash, last_active_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [licence.licence_id, deviceId, deviceName, tokenHash]
    );

    return {
      success: true,
      status: 'ACTIVATED',
      token,
      message: 'Device activated successfully.',
    };
  }

  // Case C: 5 active devices reached -> reject with HTTP 403 DEVICE_LIMIT_REACHED
  return {
    success: false,
    status: 'DEVICE_LIMIT_REACHED',
    devices: devicesRes.rows.map((d: any) => ({
      device_id: d.device_id,
      device_name: d.device_name,
      last_active_at: d.last_active_at.toISOString(),
    })),
    message: 'You are logged in on 5 devices. Please log out one device to play on this device.',
  };
}

/**
 * Revoke/Logout a specific device slot
 */
export async function logoutDevice(licenceId: number, deviceId: string): Promise<boolean> {
  const res = await query(
    `DELETE FROM devices 
     WHERE licence_id = $1 AND device_id = $2`,
    [licenceId, deviceId]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * List active devices for a licence
 */
export async function getActiveDevices(licenceId: number) {
  const res = await query(
    `SELECT device_id, device_name, last_active_at, created_at
     FROM devices
     WHERE licence_id = $1
     ORDER BY last_active_at DESC`,
    [licenceId]
  );
  return res.rows;
}
