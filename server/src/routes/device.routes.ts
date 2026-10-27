import { Router } from 'express';
import { handleActivate, handleLogoutDevice, handleGetDevices } from '../controllers/auth.controller';
import { verifyDeviceSession, requireDeviceAuth } from '../middleware/auth';

const router = Router();

// Key-Only Activation (Public)
router.post('/activate', handleActivate);

// Device management routes (Requires active device session)
router.get('/devices', verifyDeviceSession, requireDeviceAuth, handleGetDevices);
router.post('/devices/:deviceId/logout', verifyDeviceSession, requireDeviceAuth, handleLogoutDevice);

export default router;
