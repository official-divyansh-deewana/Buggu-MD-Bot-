import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { handleMessage } from '../handlers/commandHandler';
import { config } from '../config/config';
import { db } from '../lib/database';

// Ensure the sessions directory exists
const sessionsDir = path.join(process.cwd(), config.sessionPath);
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

export interface BotMetaData {
  status: 'disconnected' | 'connecting' | 'qr' | 'pairing_code' | 'connected';
  qrCode: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
  connectionLogs: string[];
}

export const botState: BotMetaData = {
  status: 'disconnected',
  qrCode: null,
  pairingCode: null,
  phoneNumber: null,
  connectionLogs: ['[SYSTEM] System initialized. Ready to connect.'],
};

function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  const formatMsg = `[${timestamp}] ${message}`;
  console.log('[BUGGU MD] ' + message);
  botState.connectionLogs.unshift(formatMsg);
  if (botState.connectionLogs.length > 50) {
    botState.connectionLogs.pop();
  }
}

export let socketInstance: WASocket | null = null;
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 15;

export async function connectToWhatsApp(): Promise<WASocket> {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    addLog(`[SYSTEM] Maximum reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Please authenticate via QR or Pair Code.`);
    botState.status = 'disconnected';
    return null as any;
  }

  addLog('[SYSTEM] Initializing WhatsApp connection...');
  botState.status = 'connecting';

  // Fetch the latest version of Baileys for longevity
  const { version, isLatest } = await fetchLatestBaileysVersion();
  addLog(`[SYSTEM] Baileys Protocol Web version: ${version.join('.')}, isLatest: ${isLatest}`);

  // Retrieve auth state from sessions directory
  const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);

  // Configure Pino logger with user config level
  const logger = pino({ level: config.logLevel });

  // Initialize socket connection
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    defaultQueryTimeoutMs: undefined,
  });

  socketInstance = sock;

  // Listen to credentials save events
  sock.ev.on('creds.update', async () => {
    await saveCreds();
  });

  // Listen to connection state updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      botState.qrCode = qr;
      botState.status = 'qr';
      addLog('[QR_CODE] New WhatsApp authentication QR code generated. Scan this to pair.');
    }

    if (connection === 'connecting') {
      botState.status = 'connecting';
      addLog('[STATUS] Connection in progress...');
    }

    if (connection === 'open') {
      botState.status = 'connected';
      botState.qrCode = null;
      botState.pairingCode = null;
      reconnectAttempts = 0;
      isReconnecting = false;
      addLog(`[CONNECTED] Connection secured! BUGGU MD is online under ${sock.user?.name || 'WhatsApp Client'} (+${sock.user?.id.split(':')[0]})`);
    }

    if (connection === 'close') {
      botState.status = 'disconnected';
      
      // If this socket has been superseded or reset manually, ignore reconnect / reset triggers
      if (socketInstance !== sock) {
        addLog('[SYSTEM] Socket connection closed (socket instance was superseded or manually reset).');
        return;
      }

      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || 'Unknown reason';
      
      addLog(`[DISCONNECTED] Closed with status: ${statusCode}. Message: ${reason}`);

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        reconnectAttempts++;
        addLog(`[AUTO_RECONNECT] Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in 5 seconds...`);
        isReconnecting = true;
        
        setTimeout(() => {
          connectToWhatsApp();
        }, 5000);
      } else {
        addLog('[AUTH_FAILED] WhatsApp session has expired or been logged out. Resetting session parameters.');
        resetSessionData();
      }
    }
  });

  // Listen to group participant memberships (welcome and goodbye triggers)
  sock.ev.on('group-participants.update', async (part) => {
    try {
      const { id, participants, action } = part;
      const groupData = db.getGroup(id);
      
      if (action === 'add' && groupData.welcome) {
        for (const jid of participants) {
          const cleanJid = (typeof jid === 'string' ? jid : (jid as any).id || (jid as any).jid || '') as string;
          if (!cleanJid) continue;
          await sock.sendMessage(id, {
            text: `👋 *Welcome to the workspace!* @${cleanJid.split('@')[0]}\n\n✨ We hope you have a productive and nice time with us in this group room!`,
            mentions: [cleanJid]
          });
        }
      } else if (action === 'remove' && groupData.goodbye) {
        for (const jid of participants) {
          const cleanJid = (typeof jid === 'string' ? jid : (jid as any).id || (jid as any).jid || '') as string;
          if (!cleanJid) continue;
          await sock.sendMessage(id, {
            text: `🚪 *Farewell!* @${cleanJid.split('@')[0]}\n\n🍃 Left the session or got booted by the admin teams. Good luck ahead!`,
            mentions: [cleanJid]
          });
        }
      }
    } catch (e) {
      console.error('Error in participant updates event emitter:', e);
    }
  });

  // Listen to incoming messages (WhatsApp Web message receive event)
  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      if (chatUpdate.type !== 'notify') return;

      for (const msg of chatUpdate.messages) {
        // Skip ephemeral status messages or notifications without message contents
        if (!msg.message) continue;
        
        // Pass message to the modular command handler
        await handleMessage(sock, msg);
      }
    } catch (e) {
      console.error('[BUGGU MD] Error processing message updates:', e);
    }
  });

  return sock;
}

/**
 * Resets physical local session folder files to allow reauth
 */
export function resetSessionData() {
  try {
    const oldSock = socketInstance;
    socketInstance = null;
    
    if (oldSock) {
      try {
        oldSock.end(undefined);
      } catch (e) {
        console.error('Error closing active WS connection during reset:', e);
      }
    }

    botState.qrCode = null;
    botState.pairingCode = null;
    botState.status = 'disconnected';
    botState.phoneNumber = null;
    reconnectAttempts = 0;

    // Delete session files after a tiny delay to ensure file lock is released by Baileys
    setTimeout(() => {
      try {
        if (fs.existsSync(sessionsDir)) {
          const files = fs.readdirSync(sessionsDir);
          for (const file of files) {
            fs.rmSync(path.join(sessionsDir, file), { recursive: true, force: true });
          }
          addLog('[SYSTEM] All local session files cleared. Ready for clean pairing.');
        }
      } catch (error) {
        console.error('Error clearing session data:', error);
        addLog(`[ERROR] Failed to clear session data: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 100);

  } catch (outerError) {
    console.error('Error during session reset process:', outerError);
  }
}

/**
 * Initiates the pairing process with an 8-digit mobile code
 */
export async function generatePairingCodeForNumber(phoneNumber: string): Promise<string> {
  // Normalize phone number (digits only, remove leading spaces or +)
  const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (!cleanedNumber) {
    throw new Error('Please enter a valid phone number with country code (e.g., 917014631313).');
  }

  botState.phoneNumber = cleanedNumber;
  botState.status = 'pairing_code';
  addLog(`[PAIRING] Pairing code requested for phone number: +${cleanedNumber}`);

  // If there's no socketInstance or if we are disconnected, boot up connection first
  if (!socketInstance) {
    await connectToWhatsApp();
  }

  // Sleep slightly to guarantee the socket initiates fully
  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (!socketInstance) {
    throw new Error('Failed to initialize socket connection for pairing code.');
  }

  try {
    // Generate pairing code
    const code = await socketInstance.requestPairingCode(cleanedNumber);
    botState.pairingCode = code;
    addLog(`[PAIRING] Successfully generated pairing code: ${code}`);
    return code;
  } catch (err) {
    addLog(`[PAIRING_ERROR] Failed to generate code: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}
