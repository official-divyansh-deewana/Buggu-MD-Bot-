import * as baileysImport from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { handleMessage } from '../handlers/commandHandler';
import { config } from '../config/config';
import { db } from '../lib/database';

// A highly robust resolver for Baileys module to support both raw ESM (tsx) and compiled CJS (esbuild __toESM wrapper) environments
function resolveMakeWASocket(): any {
  const mod = baileysImport as any;
  if (!mod) {
    throw new Error('Baileys module is undefined or failed to load');
  }

  console.log('[BUGGU MD DIAGNOSTIC] Resolving makeWASocket. Module type:', typeof mod, 'Keys:', Object.keys(mod));

  // 1. Direct function check
  if (typeof mod === 'function') {
    console.log('[BUGGU MD DIAGNOSTIC] Resolved: Module is a function direct-cast.');
    return mod;
  }

  // 2. Named export check
  if (typeof mod.makeWASocket === 'function') {
    console.log('[BUGGU MD DIAGNOSTIC] Resolved: Named makeWASocket export found.');
    return mod.makeWASocket;
  }

  // 3. Simple default export check
  if (mod.default && typeof mod.default === 'function') {
    console.log('[BUGGU MD DIAGNOSTIC] Resolved: Default function export found.');
    return mod.default;
  }

  // 4. Double-wrapped default export (specifically hits esbuild __toESM external issue)
  if (mod.default && typeof mod.default === 'object') {
    const def = mod.default;
    console.log('[BUGGU MD DIAGNOSTIC] Checking mod.default object keys:', Object.keys(def));
    if (typeof def.makeWASocket === 'function') {
      console.log('[BUGGU MD DIAGNOSTIC] Resolved: mod.default.makeWASocket function found.');
      return def.makeWASocket;
    }
    if (def.default && typeof def.default === 'function') {
      console.log('[BUGGU MD DIAGNOSTIC] Resolved: mod.default.default function found.');
      return def.default;
    }
    if (def.default && typeof def.default === 'object') {
      if (typeof def.default.makeWASocket === 'function') {
        console.log('[BUGGU MD DIAGNOSTIC] Resolved: mod.default.default.makeWASocket function found.');
        return def.default.makeWASocket;
      }
      if (def.default.default && typeof def.default.default === 'function') {
        console.log('[BUGGU MD DIAGNOSTIC] Resolved: mod.default.default.default function found.');
        return def.default.default;
      }
    }
  }

  // 5. Scan properties
  for (const key of Object.keys(mod)) {
    if (typeof mod[key] === 'function' && key.toLowerCase() === 'makewasocket') {
      console.log(`[BUGGU MD DIAGNOSTIC] Resolved: Scanned property '${key}' is makeWASocket.`);
      return mod[key];
    }
  }

  throw new Error('Could not resolve makeWASocket. Module keys: ' + Object.keys(mod).join(', '));
}

function resolveHelper(exportName: string): any {
  const mod = baileysImport as any;
  if (!mod) return undefined;

  // 1. Check direct property
  if (mod[exportName] !== undefined) {
    return mod[exportName];
  }

  // 2. Check simple default property
  if (mod.default && typeof mod.default === 'object') {
    const def = mod.default;
    if (def[exportName] !== undefined) {
      return def[exportName];
    }
    // 3. Check double-wrapped default properties
    if (def.default && typeof def.default === 'object') {
      const def2 = def.default;
      if (def2[exportName] !== undefined) {
        return def2[exportName];
      }
    }
  }

  return undefined;
}

const makeWASocket = resolveMakeWASocket();
const useMultiFileAuthState = resolveHelper('useMultiFileAuthState');
const DisconnectReason = resolveHelper('DisconnectReason');
const fetchLatestBaileysVersion = resolveHelper('fetchLatestBaileysVersion');
const makeCacheableSignalKeyStore = resolveHelper('makeCacheableSignalKeyStore');

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
  sessionId: string;
}

export const botState: BotMetaData = {
  status: 'disconnected',
  qrCode: null,
  pairingCode: null,
  phoneNumber: null,
  connectionLogs: ['[SYSTEM] System initialized. Ready to connect.'],
  sessionId: 'buggu-md',
};

function updateSessionId() {
  try {
    const credsPath = path.join(sessionsDir, 'creds.json');
    if (fs.existsSync(credsPath)) {
      const credsData = fs.readFileSync(credsPath, 'utf-8');
      if (credsData && credsData.trim().length > 50) {
        const base64Session = Buffer.from(credsData).toString('base64');
        botState.sessionId = `BUGGU_MD;;;${base64Session}`;
      }
    }
  } catch (err) {
    console.error('[BUGGU MD] Failed to update in-memory session ID:', err);
  }
}

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

// Memoize fetched Baileys version to avoid slow network lookups on subsequent connections
let cachedVersion: [number, number, number] | null = null;
let cachedIsLatest = false;

export async function connectToWhatsApp(): Promise<WASocket> {
  // Load any existing session ID from local files if they are already present
  updateSessionId();

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    addLog(`[SYSTEM] Maximum reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Please authenticate via QR or Pair Code.`);
    botState.status = 'disconnected';
    return null as any;
  }

  addLog('[SYSTEM] Initializing WhatsApp connection...');
  botState.status = 'connecting';

  // Fetch the latest version of Baileys for longevity with a 1.5s fast timeout to prevent hangs
  let version: [number, number, number] = [2, 3000, 1017531287];
  let isLatest = false;

  if (cachedVersion) {
    version = cachedVersion;
    isLatest = cachedIsLatest;
    addLog(`[SYSTEM] Using cached Baileys Protocol Web version: ${version.join('.')}`);
  } else {
    try {
      const versionPromise = fetchLatestBaileysVersion();
      const timeoutPromise = new Promise<{ version: [number, number, number]; isLatest: boolean }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching WhatsApp web version')), 1500)
      );
      const result = await Promise.race([versionPromise, timeoutPromise]);
      version = result.version;
      isLatest = result.isLatest;
      cachedVersion = version;
      cachedIsLatest = isLatest;
      addLog(`[SYSTEM] Baileys Protocol Web version: ${version.join('.')}, isLatest: ${isLatest}`);
    } catch (err) {
      console.warn('[BUGGU MD] Failed or timed out fetching latest Baileys version, using safe fallback:', err);
      addLog('[SYSTEM] Using cached robust Baileys Protocol Web version.');
    }
  }

  // 1. Check if SESSION_ID is provided as an environment variable to write/restore the credentials file
  const envSessionId = process.env.SESSION_ID;
  if (envSessionId && envSessionId.trim() !== '') {
    try {
      const credsPath = path.join(sessionsDir, 'creds.json');
      let base64Data = envSessionId.trim();
      if (base64Data.startsWith('BUGGU_MD;;;')) {
        base64Data = base64Data.split('BUGGU_MD;;;')[1];
      }
      const rawCreds = Buffer.from(base64Data, 'base64').toString('utf-8');
      
      // Simple JSON validity check
      JSON.parse(rawCreds); 

      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
      }
      fs.writeFileSync(credsPath, rawCreds, 'utf-8');
      addLog('[SYSTEM] Session successfully parsed and written from SESSION_ID environment variable.');
    } catch (restorationErr) {
      console.error('[BUGGU MD] Failed to parse or restore SESSION_ID credentials:', restorationErr);
      addLog('[ERROR] SESSION_ID provided but failed to restore: ' + (restorationErr instanceof Error ? restorationErr.message : String(restorationErr)));
    }
  }

  // Retrieve auth state from sessions directory with automated corruption healing
  let authStateResult: any;
  try {
    authStateResult = await useMultiFileAuthState(sessionsDir);
  } catch (authErr) {
    console.error('[BUGGU MD] Authentication state files are corrupted or unreadable. Self-healing...', authErr);
    addLog('[SYSTEM] Corrupted session files detected. Auto-healing sessions...');
    try {
      if (fs.existsSync(sessionsDir)) {
        const files = fs.readdirSync(sessionsDir);
        for (const file of files) {
          fs.rmSync(path.join(sessionsDir, file), { recursive: true, force: true });
        }
      }
    } catch (rmErr) {
      console.error('[BUGGU MD] Failed to empty corrupted directory:', rmErr);
    }
    authStateResult = await useMultiFileAuthState(sessionsDir);
  }

  const { state, saveCreds } = authStateResult;

  // Configure Pino logger as completely silent to minimize overhead and prevent logging bugs
  const logger = pino({
    level: 'silent',
  });

  // Safe validation of makeCacheableSignalKeyStore to ensure backward compatibility
  const keysStore = typeof makeCacheableSignalKeyStore === 'function'
    ? makeCacheableSignalKeyStore(state.keys, logger)
    : state.keys;

  // Initialize socket connection
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: keysStore,
    },
    printQRInTerminal: false,
    logger,
    defaultQueryTimeoutMs: undefined,
  });

  socketInstance = sock;

  // Listen to credentials save events
  sock.ev.on('creds.update', async () => {
    // Only accept events from the ACTIVE socket instance to prevent historical clashes
    if (socketInstance !== sock) return;
    await saveCreds();
    updateSessionId();
  });

  // Listen to connection state updates
  sock.ev.on('connection.update', async (update) => {
    // Guard all connection state updates to reject old socket instances
    if (socketInstance !== sock) {
      addLog('[SYSTEM] Ignoring obsolete connection event.');
      return;
    }

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

      // After successful connection, extract state credentials and send the Session ID to the JID and update State
      setTimeout(async () => {
        try {
          const credsPath = path.join(sessionsDir, 'creds.json');
          let credsData = '';
          
          // Poll up to 6 times (500ms intervals) to find a non-empty, fully stable creds.json file
          for (let check = 0; check < 6; check++) {
            if (fs.existsSync(credsPath)) {
              const currentContent = fs.readFileSync(credsPath, 'utf-8');
              if (currentContent && currentContent.trim().length > 100) {
                credsData = currentContent;
                break;
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          if (credsData) {
            const base64Session = Buffer.from(credsData).toString('base64');
            const fullSessionId = `BUGGU_MD;;;${base64Session}`;
            
            // Critical Step: Save to real botState.sessionId so the dashboard UI displays it!
            botState.sessionId = fullSessionId;
            addLog('[SYSTEM] Session ID successfully generated and saved to memory.');

            // Format own user's whatsapp clean JID with robust parsing
            let cleanJid = sock.user?.id || '';
            if (cleanJid.includes(':')) {
              cleanJid = cleanJid.split(':')[0];
            }
            if (cleanJid.includes('@')) {
              cleanJid = cleanJid.split('@')[0];
            }
            cleanJid = cleanJid + '@s.whatsapp.net';
            
            const msgText = `🎉 *CONGRATULATIONS! BUGGU MD IS PLUGGED IN SUCCESSFULLY* 🎉\n\n` +
              `Here is your secure deployment *SESSION_ID* value. Copy this string and configure it as the *SESSION_ID* environment variable on your deployment platform (Render, Heroku, or VPS) to log in automatically without scanning a QR code!\n\n` +
              `⚠️ *DO NOT SHARE THIS SESSION ID WITH ANYONE. IT CONTAINS SYSTEM DEPLOYMENT CREDENTIALS.*\n\n` +
              `\`\`\`\n${fullSessionId}\n\`\`\``;
              
            await sock.sendMessage(cleanJid, { text: msgText });
            addLog('[SYSTEM] Session ID message successfully sent to your personal WhatsApp!');
          } else {
            addLog('[SYSTEM] Warning: creds.json was not found or was empty/unpopulated during pairing session converted retrieval.');
          }
        } catch (msgErr) {
          console.error('[BUGGU MD] Failed to generate or send Session ID message:', msgErr);
          addLog('[SYSTEM] Error sending Session ID to WhatsApp: ' + (msgErr instanceof Error ? msgErr.message : String(msgErr)));
        }
      }, 3000);
    }

    if (connection === 'close') {
      botState.status = 'disconnected';
      
      if (socketInstance !== sock) {
        addLog('[SYSTEM] Socket connection closed (socket instance was superseded or manually reset).');
        return;
      }

      const lastError = lastDisconnect?.error;
      const statusCode = (lastError as any)?.output?.statusCode;
      const reason = lastError?.message || 'Unknown reason';
      const stack = lastError?.stack || '';
      
      addLog(`[DISCONNECTED] Closed with status: ${statusCode}. Message: ${reason}`);

      const lastErrorObj = (lastDisconnect?.error || {}) as any;
      const lastErrorMsg = lastErrorObj?.message || '';
      const lastErrorStack = lastErrorObj?.stack || '';
      const lastErrorStr = String(lastDisconnect?.error || '');

      const isQrTimeout = 
        lastErrorMsg.includes('QR refs attempts ended') || 
        lastErrorStack.includes('QR refs attempts ended') || 
        lastErrorStr.includes('QR refs attempts ended') ||
        reason.includes('QR refs attempts ended') ||
        stack.includes('QR refs attempts ended');

      if (isQrTimeout) {
        addLog('[SYSTEM] WhatsApp QR code generation attempts ended without scanning. Reconnection paused to prevent overhead. Please request a new QR or Pairing Code from the dashboard when ready.');
        await resetSessionData();
        return;
      }

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
        await resetSessionData();
      }
    }
  });

  // Listen to group participant memberships (welcome and goodbye triggers)
  sock.ev.on('group-participants.update', async (part) => {
    if (socketInstance !== sock) return;
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
    if (socketInstance !== sock) return;
    try {
      if (chatUpdate.type !== 'notify') return;

      for (const msg of chatUpdate.messages) {
        if (!msg.message) continue;
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
export async function resetSessionData(): Promise<void> {
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

    // Wait short delay to allow file handles to be released
    await new Promise((resolve) => setTimeout(resolve, 300));

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

  // Force clean active connections and clear sessions first to prevent lock conflicts
  await resetSessionData();

  botState.phoneNumber = cleanedNumber;
  botState.status = 'pairing_code';
  addLog(`[PAIRING] Pairing code requested for phone number: +${cleanedNumber}`);

  // Boot up fresh new connection
  await connectToWhatsApp();

  // Sleep very briefly to register the transport socket handles
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (!socketInstance) {
    throw new Error('Failed to initialize socket connection for pairing code.');
  }

  let code = '';
  let lastError: any = null;
  
  // Adaptive progressive retry logic with backoffs for instantaneous pairing code request
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (!socketInstance) break;
      addLog(`[PAIRING] Requesting pairing code from WhatsApp (Attempt ${attempt}/3)...`);
      code = await socketInstance.requestPairingCode(cleanedNumber);
      if (code) {
        botState.pairingCode = code;
        addLog(`[PAIRING] Successfully generated pairing code: ${code}`);
        return code;
      }
    } catch (err) {
      lastError = err;
      addLog(`[PAIRING_TRY_ERROR] Attempt ${attempt}/3 failed: ${err instanceof Error ? err.message : String(err)}`);
      
      // Gradually backoff if WhatsApp API is busy or ratelimiting
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error('Failed to generate pairing code after 3 attempts.');
}
