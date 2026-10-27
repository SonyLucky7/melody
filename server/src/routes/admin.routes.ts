import { Router } from 'express';
import multer from 'multer';
import {
  handleAdminUpload,
  handleAdminIssueLicence,
  handleFreeLicenceRegistration,
} from '../controllers/admin.controller';
import { requireAdminSecret } from '../middleware/admin';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 22 * 1024 * 1024, // 22 MB buffer limit
  },
});

const router = Router();

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

// Admin-only issue licence
router.post('/admin/licences', requireAdminSecret, handleAdminIssueLicence);

// Public Self-Service Free Licence Generator (All premium features for free)
router.post('/checkout/free', handleFreeLicenceRegistration);

export default router;
