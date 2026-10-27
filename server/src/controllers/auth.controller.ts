import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { activateDevice, logoutDevice, getActiveDevices } from '../services/licence';

export async function handleActivate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { key, device_id, device_name } = req.body;

  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'MISSING_KEY', message: 'Licence key is required.' });
    return;
  }

  if (!device_id || typeof device_id !== 'string') {
    res.status(400).json({ error: 'MISSING_DEVICE_ID', message: 'device_id is required.' });
    return;
  }

  const name = device_name && typeof device_name === 'string' ? device_name.trim() : 'Melody Player';

  try {
    const result = await activateDevice(key, device_id.trim(), name);

    if (result.status === 'DEVICE_LIMIT_REACHED') {
      res.status(403).json({
        error: 'DEVICE_LIMIT_REACHED',
        message: result.message,
        devices: result.devices,
      });
      return;
    }

    if (!result.success) {
      res.status(400).json({
        error: result.status,
        message: result.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: result.status,
      token: result.token,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Activate Error]:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to activate device.' });
  }
}

export async function handleLogoutDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
  const targetDeviceId = req.params.deviceId;

  if (!req.session || !req.session.licenceId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    return;
  }

  if (!targetDeviceId) {
    res.status(400).json({ error: 'MISSING_PARAM', message: 'deviceId parameter required.' });
    return;
  }

  try {
    const success = await logoutDevice(req.session.licenceId, targetDeviceId);

    if (!success) {
      res.status(404).json({ error: 'DEVICE_NOT_FOUND', message: 'Device was not found on this licence.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Device ${targetDeviceId} logged out successfully. Slot is now free.`,
    });
  } catch (err: any) {
    console.error('[Logout Device Error]:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to logout device.' });
  }
}

export async function handleGetDevices(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.session || !req.session.licenceId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    return;
  }

  try {
    const devices = await getActiveDevices(req.session.licenceId);
    res.status(200).json({
      success: true,
      devices,
      count: devices.length,
      maxDevices: 5,
    });
  } catch (err: any) {
    console.error('[Get Devices Error]:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch devices.' });
  }
}
