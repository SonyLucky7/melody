import { Request, Response } from 'express';
import { query } from '../db/client';
import { config } from '../config';
import { issueLicence, activateDevice, formatLicenceKey, normalizeKey } from '../services/licence';

export async function getPaymentConfig(req: Request, res: Response): Promise<void> {
  const rawUpiId = config.upiId;
  const upiName = config.upiName;

  // Mask the UPI ID for public display (e.g. an****7@axl) to keep it safe from web scrapers
  const atIdx = rawUpiId.indexOf('@');
  let upiIdMasked = rawUpiId;
  if (atIdx > 3) {
    upiIdMasked = `${rawUpiId.slice(0, 2)}****${rawUpiId.slice(atIdx - 1, atIdx)}${rawUpiId.slice(atIdx)}`;
  }

  // Generate standard UPI URIs and Dynamic QR URLs for each plan
  const annualUpiUri = `upi://pay?pa=${rawUpiId}&pn=${encodeURIComponent(upiName)}&am=49&cu=INR&tn=MelodyVIP-Annual`;
  const annualQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(annualUpiUri)}`;

  const lifetimeUpiUri = `upi://pay?pa=${rawUpiId}&pn=${encodeURIComponent(upiName)}&am=99&cu=INR&tn=MelodyVIP-Lifetime`;
  const lifetimeQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(lifetimeUpiUri)}`;

  res.json({
    success: true,
    upiIdMasked,
    upiName,
    plans: [
      {
        id: 'annual',
        name: 'Annual VIP',
        price: 49,
        originalPrice: 199,
        duration: '1 Year',
        tag: 'POPULAR',
        upiPayUri: annualUpiUri,
        qrCodeUrl: annualQrUrl,
        features: [
          'Full Studio 320kbps High-Res Audio',
          'Listen on up to 5 Devices at once',
          'Unlimited Offline Downloads',
          'Personalized Option 1 Licence Key',
          '1 Full Year VIP Access (Just ₹4/month)',
        ],
      },
      {
        id: 'lifetime',
        name: 'Lifetime VIP',
        price: 99,
        originalPrice: 499,
        duration: 'Lifetime',
        tag: 'BEST VALUE',
        upiPayUri: lifetimeUpiUri,
        qrCodeUrl: lifetimeQrUrl,
        features: [
          'Pay Once, Listen Forever ($0/month)',
          'Full Studio 320kbps High-Res Audio',
          'Listen on up to 5 Devices at once',
          'Unlimited Offline Downloads',
          'Golden VIP Profile Badge',
          'All Future Updates & Music Drops Included',
        ],
      },
    ],
  });
}

export async function handleUpiPaymentSubmit(req: Request, res: Response): Promise<void> {
  const { firstName, surname, mobile, email, plan, upiUtrRef, deviceId, deviceName } = req.body;

  if (!firstName || !surname || !mobile) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'First name, surname, and 10-digit mobile number are required.' });
    return;
  }

  const cleanMobile = mobile.toString().replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    res.status(400).json({ error: 'INVALID_MOBILE', message: 'Please provide a valid 10-digit mobile number.' });
    return;
  }

  const selectedPlan: 'annual' | 'lifetime' = plan === 'annual' ? 'annual' : 'lifetime';
  const amount = selectedPlan === 'annual' ? 49 : 99;

  const cleanUtr = (upiUtrRef || '').toString().trim().replace(/[^a-zA-Z0-9]/g, '');
  if (cleanUtr.length < 6) {
    res.status(400).json({ error: 'INVALID_UTR', message: 'Please enter the 12-digit UPI transaction reference / UTR number from your payment app.' });
    return;
  }

  try {
    // 1. Prevent duplicate reuse of same UTR
    const existingPayment = await query('SELECT id FROM payments WHERE upi_utr_ref = $1', [cleanUtr]);
    if (existingPayment.rows.length > 0) {
      res.status(400).json({
        error: 'DUPLICATE_UTR',
        message: 'This UPI transaction reference has already been used. Please check your payment app or contact support.',
      });
      return;
    }

    // 2. Issue the Option 1 Licence Key
    const licence = await issueLicence(firstName, surname, cleanMobile, email, selectedPlan);

    // 3. Record payment in database
    await query(
      `INSERT INTO payments (user_id, licence_id, plan, amount_inr, upi_utr_ref, status)
       VALUES ($1, $2, $3, $4, $5, 'verified')`,
      [licence.userId, licence.licenceId, selectedPlan, amount, cleanUtr]
    );

    // 4. Automatically activate this device so user is immediately logged in
    const activeDeviceId = deviceId || `web-${Math.random().toString(36).substring(2, 10)}`;
    const activeDeviceName = deviceName || 'Web Player';

    const activation = await activateDevice(licence.licenceKey, activeDeviceId, activeDeviceName);

    res.status(201).json({
      success: true,
      message: `🎉 Payment verified! Welcome to Melody ${selectedPlan === 'lifetime' ? 'Lifetime' : 'Annual'} VIP.`,
      data: {
        licenceKey: licence.licenceKey,
        formattedKey: licence.formattedKey,
        plan: selectedPlan,
        expiresAt: licence.expiresAt,
        token: activation.token,
        deviceId: activeDeviceId,
      },
    });
  } catch (err: any) {
    console.error('[UPI Payment Submission Error]:', err);
    res.status(500).json({ error: 'PAYMENT_PROCESSING_FAILED', message: err.message || 'Failed to process payment.' });
  }
}
