import express from 'express';
import QRCode from 'qrcode';
import {
  botState,
  generatePairingCodeForNumber,
  resetSessionData,
  connectToWhatsApp,
  socketInstance
} from '../lib/baileys';
import { recentCommandLogs } from '../handlers/commandHandler';
import { config } from '../config/config';

export const router = express.Router();

// Retrieve full status, logs, current pairing details, base64 QR, and recent command execution tallies
router.get('/status', async (req, res) => {
  let qrImageUrl: string | null = null;
  if (botState.qrCode) {
    try {
      qrImageUrl = await QRCode.toDataURL(botState.qrCode, {
        margin: 2,
        width: 300,
        color: {
          dark: '#030712', // deep gray-950
          light: '#f9fafb', // gray-50
        }
      });
    } catch (err) {
      console.error('Failed to encode QR code string to Base64:', err);
    }
  }

  res.json({
    status: botState.status,
    qrCode: botState.qrCode,
    qrImageUrl: qrImageUrl,
    pairingCode: botState.pairingCode,
    phoneNumber: botState.phoneNumber,
    connectionLogs: botState.connectionLogs,
    recentCommands: recentCommandLogs,
    sessionId: botState.sessionId,
    config: {
      botName: config.botName,
      ownerName: config.ownerName,
      ownerNumber: config.ownerNumber,
      prefix: config.prefix,
      version: config.version,
    },
  });
});

// Fire up standard socket manually
router.post('/connect', async (req, res) => {
  try {
    if (socketInstance && botState.status === 'connected') {
      res.json({ success: true, message: 'Already connected' });
      return;
    }
    connectToWhatsApp();
    res.json({ success: true, message: 'Connection sequence kicked off' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Trigger pairing process using a phone number
router.post('/pair', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ success: false, error: 'Phone number parameter is required.' });
    return;
  }

  try {
    addRouteLog(`Incoming pairing code request for: ${phoneNumber}`);
    const code = await generatePairingCodeForNumber(phoneNumber);
    res.json({ success: true, pairingCode: code });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate code.' });
  }
});

// Clear credentials and force-restart socket
router.post('/reset', async (req, res) => {
  try {
    addRouteLog('Session reset requested from web dashboard.');
    await resetSessionData();
    // Restart empty socket in background so user has a fresh QR
    setTimeout(() => {
      connectToWhatsApp();
    }, 1500);

    res.json({ success: true, message: 'Session files successfully deleted. Bot reset.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

function addRouteLog(msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[ROUTE API ${timestamp}] ${msg}`);
}

export default router;
