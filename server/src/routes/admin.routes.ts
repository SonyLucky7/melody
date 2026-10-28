import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import {
  handleAdminUpload,
  handleAdminIssueLicence,
  handleAdminGetLicences,
  handleFreeLicenceRegistration,
  handleAdminDeleteSong,
} from '../controllers/admin.controller';
import { requireAdminSecret, handleAdminLogin } from '../middleware/admin';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 22 * 1024 * 1024, // 22 MB buffer limit
  },
});

// Strict rate limiter for Admin Login to prevent brute-force attacks
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_ATTEMPTS',
    message: 'Too many admin authentication attempts. Please try again after 15 minutes.',
  },
});

const router = Router();

// Admin Authentication (Email & Password Gate with brute-force protection)
router.post('/admin/login', adminLoginLimiter, handleAdminLogin);

// Admin-only multipart song upload
router.post(
  '/admin/upload',
  requireAdminSecret,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  handleAdminUpload
);

// Admin-only delete song
router.delete('/admin/songs/:id', requireAdminSecret, handleAdminDeleteSong);

// Admin-only issue and view licences
router.get('/admin/licences', requireAdminSecret, handleAdminGetLicences);
router.post('/admin/licences', requireAdminSecret, handleAdminIssueLicence);

// Public Self-Service Free Licence Generator (All premium features for free)
router.post('/checkout/free', handleFreeLicenceRegistration);

export default router;
