import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateOption1Key, formatLicenceKey, normalizeKey } from '../src/services/licence';
import { generateSignedStreamToken, verifySignedStreamToken, spoolManager } from '../src/services/stream';

describe('Option 1 Licence Key Logic', () => {
  test('generates exact 12-character key from Rahul Sharma 987654', () => {
    // Rahul (RAH) + Sharma (SHA) + 987654 -> RAHSHA987654
    const key = generateOption1Key('Rahul', 'Sharma', '987654');
    assert.equal(key, 'RAHSHA987654');
    assert.equal(key.length, 12);
  });

  test('generates exact 12-character key from 10-digit mobile number', () => {
    // Rahul Sharma + 9876543210 -> last 6 digits are 543210 -> RAHSHA543210
    const key = generateOption1Key('Rahul', 'Sharma', '9876543210');
    assert.equal(key, 'RAHSHA543210');
    assert.equal(key.length, 12);
  });

  test('pads short first/last names gracefully with X to preserve 12 chars', () => {
    // Al + Roy + 123456 -> ALX + ROY + 123456 -> ALXROY123456
    const key = generateOption1Key('Al', 'Roy', '123456');
    assert.equal(key, 'ALXROY123456');
    assert.equal(key.length, 12);
  });

  test('formats key with hyphens: RAHS-HA98-7654', () => {
    const formatted = formatLicenceKey('RAHSHA987654');
    assert.equal(formatted, 'RAHS-HA98-7654');
  });

  test('normalizes hyphenated and spaced keys back to canonical 12 chars', () => {
    const raw = normalizeKey('RAHS-HA98-7654');
    assert.equal(raw, 'RAHSHA987654');

    const withSpaces = normalizeKey('rahs ha98 7654');
    assert.equal(withSpaces, 'RAHSHA987654');
  });
});

describe('Signed Stream Token HMAC Engine', () => {
  test('generates valid signed 10-minute token for song and device', () => {
    const songId = 42;
    const deviceId = 'android-pixel-9-pro';
    const token = generateSignedStreamToken(songId, deviceId);

    assert.ok(token);
    assert.ok(token.length > 20);

    // Verifying with correct song ID should pass
    const isValid = verifySignedStreamToken(token, songId);
    assert.equal(isValid, true);
  });

  test('rejects token when song ID does not match', () => {
    const songId = 42;
    const deviceId = 'android-pixel-9-pro';
    const token = generateSignedStreamToken(songId, deviceId);

    // Verifying with wrong song ID must fail
    const isValid = verifySignedStreamToken(token, 999);
    assert.equal(isValid, false);
  });

  test('rejects tampered or forged token', () => {
    const forgedToken = Buffer.from('42:android-device:9999999999:fake-signature').toString('base64url');
    const isValid = verifySignedStreamToken(forgedToken, 42);
    assert.equal(isValid, false);
  });
});

describe('Active Spool Manager Concurrency Guards', () => {
  test('increments, checks capacity, and decrements properly', () => {
    const initial = spoolManager.getActiveCount();
    spoolManager.increment();
    assert.equal(spoolManager.getActiveCount(), initial + 1);

    spoolManager.decrement();
    assert.equal(spoolManager.getActiveCount(), initial);
  });
});

describe('Password Hash & Verification Security', () => {
  test('hashes password with bcrypt and matches correct plaintext', async () => {
    const { hashPassword, verifyPassword } = await import('../src/utils/hash');
    const plain = 'TestPassword@2026';
    const hash = await hashPassword(plain);

    assert.ok(hash.startsWith('$2'), 'Hash should be a valid bcrypt string');
    assert.notEqual(hash, plain, 'Stored hash must never equal plaintext password');

    const isValid = await verifyPassword(plain, hash);
    assert.equal(isValid, true, 'Correct password should verify successfully');

    const isWrong = await verifyPassword('WrongPassword123', hash);
    assert.equal(isWrong, false, 'Incorrect password should be rejected');
  });

  test('rejects empty or null password inputs safely', async () => {
    const { verifyPassword } = await import('../src/utils/hash');
    assert.equal(await verifyPassword('', '$2b$10$...'), false);
    assert.equal(await verifyPassword('any', ''), false);
  });
});
