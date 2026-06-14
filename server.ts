import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  proto,
  downloadContentFromMessage,
  jidNormalizedUser,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { createServer as createViteServer } from 'vite';

// Import CLI commands list for dynamic registration
import { COMMANDS, Command } from './src/commands.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

// Setup persistent configurations directory
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Initialize database settings
let settings = {
  prefix: '.',
  autoread: false,
  autoreact: false,
  autostatusview: false,
  autostatusreact: false,
  antidelete: false,
  anticall: false,
  antilink: false,
  autoreply: false,
  autoreactdm: false,
  autoreactgc: false,
  autosticker: false,
  autodownloadstatus: false,
  autosavecontacts: false,
  autowelcome: false,
  autogoodbye: false,
  autotyping: false,
  recording: false,
  online: true,
  statusview: false,
  statuslike: false,
  antiedit: false,
  welcome: false,
  adminaction: false,
  mode: "public", // 'public' | 'private' | 'inbox'
  botName: "BUGGU MD",
  ownerName: "𓆩〭〬🐣⃪⃮⃔⃝꯭꯭〬ꯦ꯭꯭Ꭷɣ֯֯፝֟͠ɛ 𝐁սԍ͢ԍ𝛖",
  ownerNumber: "918882829982",
  botDp: "https://iili.io/CCMvy1n.jpg",
  description: "High-performance Baileys Multi-Device Controller",
  setwelcome: "Welcome @user to @group!",
  setgoodbye: "Goodbye @user from @group!",
  sudo: [] as string[],
  bannedUsers: [] as string[]
};

if (fs.existsSync(SETTINGS_FILE)) {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    settings = { ...settings, ...JSON.parse(data) };
  } catch (err) {
    console.error("Failed to parse settings file. Re-creating.", err);
  }
} else {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// In-memory runtime state
let botState = {
  status: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
  qr: '',
  pairingCode: '',
  logs: [] as string[]
};

function addLog(msg: string) {
  const time = new Date().toLocaleTimeString();
  const logMsg = `[${time}] ${msg}`;
  console.log(logMsg);
  botState.logs.unshift(logMsg);
  if (botState.logs.length > 100) botState.logs.pop();
}

// Global WhatsApp dynamic socket connection reference
let sock: any = null;
const activeMenuMessages = new Set<string>();
let keepAliveInterval: any = null;
let lastActiveConnectedTimestamp = Date.now();

// Premium branded header builder
function makeBrandedMessage(title: string, content: string): string {
  return `╭━━━〔 🐣 BUGGU MD 🐣 〕━━━⬣\n\n` +
         `✨ *${title.toUpperCase()}*\n\n` +
         `${content}\n` +
         `╰━━━━━━━━━━━━━━⬣\n\n` +
         `*Powered By > BUGGU MD 🐣*`;
}

// Start WhatsApp socket logic
async function connectToWhatsApp(phoneToPair?: string) {
  // Prevent socket/file descriptor leaks by terminating previous socket instance
  if (sock) {
    try {
      addLog("Cleaning up existing active socket connection to avoid file descriptor leaks...");
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
      sock.ev.removeAllListeners('messages.upsert');
      sock.ev.removeAllListeners('messages.update');
      sock.ev.removeAllListeners('call');
      sock.end(undefined);
    } catch (e) {
      addLog(`Error cleaning up previous socket: ${e}`);
    }
    sock = null;
  }

  // Ensure sessions directories exist to prevent ENOENT folder errors
  const sessionsDir = path.join(process.cwd(), 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  const sessionPath = path.join(process.cwd(), 'sessions/buggu-session');
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  // Wiping session if we are pairing a new phone number to start 100% clean
  if (phoneToPair) {
    addLog(`Wiping any existing session database to request a fresh pairing code for ${phoneToPair}...`);
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      fs.mkdirSync(sessionPath, { recursive: true });
    } catch (err: any) {
      addLog(`Failed to clear session path for pairing: ${err.message}`);
    }
  }

  let state, saveCreds;
  try {
    const authResult = await useMultiFileAuthState(sessionPath);
    state = authResult.state;
    saveCreds = authResult.saveCreds;
  } catch (authError: any) {
    addLog(`⚠️ Auth initialization failed: ${authError.message}. Clearing sessions cache and retrying...`);
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      fs.mkdirSync(sessionPath, { recursive: true });
    } catch (rmErr) {}
    
    try {
      const authResult = await useMultiFileAuthState(sessionPath);
      state = authResult.state;
      saveCreds = authResult.saveCreds;
    } catch (retryError: any) {
      addLog(`Fatal auth retry error: ${retryError.message}`);
      botState.status = 'disconnected';
      return;
    }
  }
  
  addLog("Initializing Baileys core connection system...");
  botState.status = 'connecting';

  // Fetch latest WhatsApp Web version from WhatsApp CDN dynamically to override hardcoded outdated client versions (prevents 405 Method Not Allowed)
  let version = [2, 3000, 1035194821];
  try {
    const fetched = await fetchLatestBaileysVersion();
    addLog(`Fetched latest WhatsApp Web connection version successfully: ${fetched.version.join('.')}`);
    version = fetched.version;
  } catch (err: any) {
    addLog(`Failed to fetch version from WhatsApp CDN: ${err.message}. Using stable verified fallback [2, 3000, 1035194821]`);
  }

  try {
    sock = ((makeWASocket as any).default || makeWASocket)({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      browser: ["Ubuntu", "Chrome", "20.0.04"]
    });
  } catch (sockError: any) {
    addLog(`Socket creation failed: ${sockError.message}. Initiating emergency session cache wipe...`);
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    } catch (e) {}
    botState.status = 'disconnected';
    setTimeout(() => {
      connectToWhatsApp();
    }, 3000);
    return;
  }

  // Securely lock listeners to only the current created socket instance to avoid stale connection loops
  const currentSock = sock;

  // Wrap sock.sendMessage to automatically append premium metadata, externalAdReply and channel attributes
  const originalSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = async (toJid: string, content: any, options: any = {}) => {
    if (content && typeof content === 'object') {
      const isDelete = !!content.delete;
      const isReaction = !!content.react;
      const isUpdate = !!content.edit;
      
      if (!isDelete && !isReaction && !isUpdate) {
        const contextInfo = content.contextInfo || {};
        
        contextInfo.isForwarded = true;
        contextInfo.forwardingScore = 999;
        contextInfo.forwardedNewsletterMessageInfo = {
          newsletterJid: "12036329432145@newsletter", // Root BUGGU MD Channel JID
          newsletterName: "BUGGU MD Official 🐣",
          serverMessageId: 1
        };
        
        contextInfo.externalAdReply = {
          title: "🐣 BUGGU MD 🐣",
          body: "Premium Multi-Device WhatsApp Bot",
          thumbnailUrl: "https://iili.io/CCMvy1n.jpg",
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: "https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h"
        };
        
        content.contextInfo = contextInfo;
      }
    }
    return originalSendMessage(toJid, content, options);
  };

  sock.ev.on('creds.update', () => {
    if (sock !== currentSock) return;
    saveCreds();
  });

  // If pairing code is requested, handle it after socket becomes ready
  if (phoneToPair && !state.creds.registered) {
    setTimeout(async () => {
      if (sock !== currentSock) {
        addLog("Stale socket reference. Skipping pairing code generation.");
        return;
      }
      try {
        addLog(`Requesting pairing code from WhatsApp servers for number: ${phoneToPair}...`);
        const code = await currentSock.requestPairingCode(phoneToPair);
        botState.pairingCode = code;
        addLog(`✨ Successfully received WhatsApp pairing code: ${code}`);
      } catch (err: any) {
        addLog(`Failed to request pairing code inside socket: ${err.message}`);
        botState.pairingCode = '';
      }
    }, 2500);
  }

  sock.ev.on('connection.update', (update: any) => {
    if (sock !== currentSock) {
      addLog("Discarding connection update from stale socket instance.");
      return;
    }
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      botState.qr = qr;
      botState.status = 'disconnected';
      addLog("New QR Code generated. Awaiting device linking on dashboard.");
    }

    if (connection === 'close') {
      botState.status = 'disconnected';
      botState.qr = '';
      botState.pairingCode = '';
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const errorMessage = (lastDisconnect?.error as any)?.message || '';
      
      // Check if session is explicitly logged out or authenticated files are corrupted/bad
      // IMPORTANT: 405 is DisconnectReason.connectionReplaced. Must NEVER wipe session files on 405.
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || 
                         statusCode === 401 || 
                         statusCode === 403 || 
                         statusCode === 411 || // Bad session metadata rejection
                         errorMessage.includes('Unauthorized') || 
                         errorMessage.includes('logged out') ||
                         errorMessage.includes('bad session');
                         
      addLog(`Connection closed status. StatusCode: ${statusCode}. Message: ${errorMessage}. isLoggedOut: ${isLoggedOut}`);
      
      if (isLoggedOut) {
        botState.status = 'disconnected';
        addLog("⚠️ WhatsApp session expired or credentials corrupted! Clearing stale session files for dynamic QR renewal...");
        
        const sessionPath = path.join(process.cwd(), 'sessions/buggu-session');
        try {
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            addLog("Stale session store cleanly wiped.");
          }
        } catch (err: any) {
          addLog(`Stale cache purge error: ${err.message}`);
        }
        
        // Boot fresh connection completely clean to auto-generate scan-ready QR code immediately
        setTimeout(() => {
          if (sock === currentSock) {
            connectToWhatsApp();
          }
        }, 2000);
      } else {
        // Safe and fast retry loops depending on the disconnect code
        // 515 is DisconnectReason.restartRequired. Reconnect immediately to preserve user session and state responsiveness
        const delay = statusCode === DisconnectReason.restartRequired ? 1000 : 3500;
        addLog(`Scheduling standby reconnect loop after ${delay}ms (transient network event: ${statusCode})...`);
        setTimeout(() => {
          if (sock === currentSock) {
            connectToWhatsApp();
          }
        }, delay);
      }
    } else if (connection === 'open') {
      botState.status = 'connected';
      botState.qr = '';
      botState.pairingCode = '';
      lastActiveConnectedTimestamp = Date.now(); // Reset watchdog timeline to active uptime
      addLog(`✨ WhatsApp Device online! Logged in as: ${currentSock.user.id}`);
 
      // Send dynamic connection confirmation notification message directly to WhatsApp device owner
      const myJid = jidNormalizedUser(sock.user.id);
      try {
        sock.sendMessage(myJid, {
          text: makeBrandedMessage(
            "Connection Success",
            "🐣 *BUGGU MD IS NOW ONLINE!* 🐣\n\n" +
            "Your WhatsApp account has been coupled successfully with BUGGU MD Control Room dashboard. Presence keep-alive is active, and status reactor features are now fully functional!\n\n" +
            "🔮 *Active Features:*\n" +
            "• Always status seen (autoview)\n" +
            "• Always status react 😍\n" +
            "• Direct message react ❤️\n" +
            "• Anti-delete filter\n" +
            "• Anti-call shield"
          )
        }).then(() => {
          addLog(`Sent connection notification message to connected JID: ${myJid}`);
        }).catch((err: any) => {
          addLog(`Failed to dispatch connection success message coupling notification: ${err}`);
        });
      } catch (sendErr) {
        addLog(`Failed to dispatch connection success message helper: ${sendErr}`);
      }
 
      // Start presence check keep-alive so WhatsApp session never sleeps
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      keepAliveInterval = setInterval(async () => {
        if (sock && botState.status === 'connected') {
          try {
            await sock.sendPresenceUpdate('available');
            addLog("Executing active Presence Keep-Alive (always online seen)...");
          } catch (e) {
            addLog(`Presence Keep-Alive error: ${e}`);
          }
        }
      }, 20000); // 20 seconds keep-alive loop
    }
  });

  // Handle incoming Calls (Anti Call)
  sock.ev.on('call', async (calls: any[]) => {
    if (sock !== currentSock) return;
    if (!settings.anticall) return;
    for (const call of calls) {
      if (call.status === 'offer') {
        addLog(`AntiCall: Automatically rejecting an incoming voice/video call from: ${call.from}`);
        await currentSock.rejectCall(call.id, call.from);
        
        // Notify caller in chat
        await currentSock.sendMessage(call.from, { 
          text: makeBrandedMessage(
            "Call Rejected", 
            "🚫 *SYSTEM WARNING*\n\nBUGGU MD does not allow direct incoming calls. Your call has been automatically disconnected. Please use text messaging."
          ) 
        });
      }
    }
  });

  // Handle Group Participants Update (Welcome & Goodbye, Admin promotion logs)
  sock.ev.on('group-participants.update', async (gUpdate: any) => {
    if (sock !== currentSock) return;
    const { id: groupJid, participants, action } = gUpdate;
    
    let groupMetadata: any = null;
    try {
      groupMetadata = await sock.groupMetadata(groupJid);
    } catch (e) {
      addLog(`Failed to fetch group metadata: ${e}`);
    }
    const groupName = groupMetadata ? groupMetadata.subject : "Group Chat";

    for (const participant of participants) {
      if (action === 'add') {
        if (settings.welcome || settings.autowelcome) {
          addLog(`Group Welcome: User ${participant} joined group ${groupName}`);
          let welcomeMessage = settings.setwelcome || "Welcome @user to @group!";
          welcomeMessage = welcomeMessage.replace(/@user/g, `@${participant.split('@')[0]}`);
          welcomeMessage = welcomeMessage.replace(/@group/g, groupName);

          try {
            await sock.sendMessage(groupJid, {
              text: makeBrandedMessage("Welcome to the Room", welcomeMessage),
              mentions: [participant]
            });
          } catch (e) {
            addLog(`Error transmitting welcome message: ${e}`);
          }
        }
      } else if (action === 'remove') {
        if (settings.autogoodbye) {
          addLog(`Group Goodbye: User ${participant} left group ${groupName}`);
          let goodbyeMessage = settings.setgoodbye || "Goodbye @user from @group!";
          goodbyeMessage = goodbyeMessage.replace(/@user/g, `@${participant.split('@')[0]}`);
          goodbyeMessage = goodbyeMessage.replace(/@group/g, groupName);

          try {
            await sock.sendMessage(groupJid, {
              text: makeBrandedMessage("Goodbye from the Room", goodbyeMessage),
              mentions: [participant]
            });
          } catch (e) {
            addLog(`Error transmitting goodbye message: ${e}`);
          }
        }
      } else if (action === 'promote' || action === 'demote') {
        if (settings.adminaction) {
          addLog(`Admin Action Logger: Participant ${participant} was ${action}d in ${groupName}`);
          const promptTitle = action === 'promote' ? "Admin Promoted 🚀" : "Admin Demoted 📉";
          const promptText = action === 'promote' 
            ? `⚡ *ATTENTION ROOM!*\n\n@${participant.split('@')[0]} has been promoted to *Room Administrator* role!`
            : `⚡ *ATTENTION ROOM!*\n\n@${participant.split('@')[0]} has been demoted and stripped of *Room Administrator* role.`;
          
          try {
            await sock.sendMessage(groupJid, {
              text: makeBrandedMessage(promptTitle, promptText),
              mentions: [participant]
            });
          } catch (e) {}
        }
      }
    }
  });

  // Handle Groups metadata/attributes updates
  sock.ev.on('groups.update', async (groupUpdates: any[]) => {
    if (sock !== currentSock) return;
    if (!settings.adminaction) return;
    for (const update of groupUpdates) {
      addLog(`Groups Update: Metadata/subject change: ${JSON.stringify(update)}`);
    }
  });

  // Implement anti-delete storage
  const messageStore: Record<string, any> = {};

  // Track edits and incoming messages for deletion backup
  sock.ev.on('messages.upsert', async (m: any) => {
    if (sock !== currentSock) return;
    const msg = m.messages[0];
    if (!msg || !msg.message) return;

    // Cache message for anti-delete feature
    const jid = msg.key.remoteJid;
    if (jid) {
      messageStore[msg.key.id || ""] = JSON.parse(JSON.stringify(msg));
    }

    // Un-wrap if it's ephemeral, viewOnce, edited, etc. to ensure commands are executed perfectly
    let messageContent = msg.message;
    if (messageContent) {
      if (messageContent.ephemeralMessage) {
        messageContent = messageContent.ephemeralMessage.message;
      }
      if (messageContent.viewOnceMessage) {
        messageContent = messageContent.viewOnceMessage.message;
      }
      if (messageContent.viewOnceMessageV2) {
        messageContent = messageContent.viewOnceMessageV2.message;
      }
      if (messageContent.documentWithCaptionMessage) {
        messageContent = messageContent.documentWithCaptionMessage.message;
      }
      if (messageContent.editedMessage) {
        messageContent = messageContent.editedMessage.message || messageContent.editedMessage;
      }
    }
    if (!messageContent) return;

    const messageType = Object.keys(messageContent)[0];
    
    // Auto status view & status reactor (Always status seen and react is always on)
    if (jid === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        addLog(`Autoview (Always Seen): Viewed status from ${msg.pushName || 'Anonymous'}`);
      } catch (e) {}

      try {
        await sock.sendMessage(jid, {
          react: { text: "😍", key: msg.key }
        }, { statusJidList: [msg.key.participant || ""] });
        addLog(`Autoreact Status (Always Reactor): Reacted 😍 to status from ${msg.pushName || 'Anonymous'}`);
      } catch (e) {}
      return; // Skip normal command processing for status broadcast
    }

    // Auto Read implementation
    if (settings.autoread) {
      await sock.readMessages([msg.key]);
    }

    // Always react to incoming normal messages (React is always active / always on)
    if (!msg.key.fromMe && jid) {
      try {
        await sock.sendMessage(jid, { react: { text: "❤️", key: msg.key } });
      } catch (e) {}
    }

    // Extract text content of message robustly, ensuring that even if other keys like senderKeyDistributionMessage or messageContextInfo are present, we still parse the text core
    let body = "";
    if (messageContent.conversation) {
      body = messageContent.conversation;
    } else if (messageContent.extendedTextMessage?.text) {
      body = messageContent.extendedTextMessage.text;
    } else if (messageContent.imageMessage?.caption) {
      body = messageContent.imageMessage.caption;
    } else if (messageContent.videoMessage?.caption) {
      body = messageContent.videoMessage.caption;
    } else if (messageContent.documentMessage?.caption) {
      body = messageContent.documentMessage.caption;
    }

    if (!body) return;

    // Check if message is a reply to one of our active menu messages
    const contextStanzaId = messageContent?.extendedTextMessage?.contextInfo?.stanzaId;
    if (contextStanzaId && activeMenuMessages.has(contextStanzaId)) {
      const optionNum = body.trim();
      const menuData: Record<string, { title: string, content: string }> = {
        '1': {
          title: "Download Menu",
          content: `╭━━━〔 *Download Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🌐 *Social Media*
┃★│ • facebook [url]
┃★│ • mediafire [url]
┃★│ • tiktok [url]
┃★│ • twitter [url]
┃★│ • Insta [url]
┃★│ • apk [app]
┃★│ • img [query]
┃★│ • tt2 [url]
┃★│ • pins [url]
┃★│ • apk2 [app]
┃★│ • fb2 [url]
┃★│ • pinterest [url]
┃★╰──────────────
┃★╭──────────────
┃★│ 🎵 *Music/Video*
┃★│ • spotify [query]
┃★│ • play [song]
┃★│ • play2-10 [song]
┃★│ • audio [url]
┃★│ • video [url]
┃★│ • video2-10 [url]
┃★│ • ytmp3 [url]
┃★│ • ytmp4 [url]
┃★│ • song [name]
┃★│ • darama [name]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '2': {
          title: "Group Menu",
          content: `╭━━━〔 *Group Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🛠️ *Management*
┃★│ • grouplink
┃★│ • kickall
┃★│ • kickall2
┃★│ • kickall3
┃★│ • add @user
┃★│ • remove @user
┃★│ • kick @user
┃★╰──────────────
┃★╭──────────────
┃★│ ⚡ *Admin Tools*
┃★│ • promote @user
┃★│ • demote @user
┃★│ • dismiss 
┃★│ • revoke
┃★│ • mute [time]
┃★│ • unmute
┃★│ • lockgc
┃★│ • unlockgc
┃★╰──────────────
┃★╭──────────────
┃★│ 🏷️ *Tagging*
┃★│ • tag @user
┃★│ • hidetag [msg]
┃★│ • tagall
┃★│ • tagadmins
┃★│ • invite
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '3': {
          title: "Fun Menu",
          content: `╭━━━〔 *Fun Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🎭 *Interactive*
┃★│ • shapar
┃★│ • rate @user
┃★│ • insult @user
┃★│ • hack @user
┃★│ • ship @user1 @user2
┃★│ • character
┃★│ • pickup
┃★│ • joke
┃★╰──────────────
┃★╭──────────────
┃★│ 😂 *Reactions*
┃★│ • hrt
┃★│ • hpy
┃★│ • syd
┃★│ • anger
┃★│ • shy
┃★│ • kiss
┃★│ • mon
┃★│ • cunfuzed
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '4': {
          title: "Owner Menu",
          content: `╭━━━〔 *Owner Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ ⚠️ *Restricted*
┃★│ • block @user
┃★│ • unblock @user
┃★│ • fullpp [img]
┃★│ • setpp [img]
┃★│ • restart
┃★│ • shutdown
┃★│ • updatecmd
┃★╰──────────────
┃★╭──────────────
┃★│ ℹ️ *Info Tools*
┃★│ • gjid
┃★│ • jid @user
┃★│ • listcmd
┃★│ • allmenu
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '5': {
          title: "AI Menu",
          content: `╭━━━〔 *AI Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 💬 *Chat AI*
┃★│ • ai [query]
┃★│ • gpt3 [query]
┃★│ • gpt2 [query]
┃★│ • gptmini [query]
┃★│ • gpt [query]
┃★│ • meta [query]
┃★╰──────────────
┃★╭──────────────
┃★│ 🖼️ *Image AI*
┃★│ • imagine [text]
┃★│ • imagine2 [text]
┃★╰──────────────
┃★╭──────────────
┃★│ 🔍 *Specialized*
┃★│ • blackbox [query]
┃★│ • luma [query]
┃★│ • dj [query]
┃★│ • khan [query]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '6': {
          title: "Anime Menu",
          content: `╭━━━〔 *Anime Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🖼️ *Images*
┃★│ • fack
┃★│ • dog
┃★│ • awoo
┃★│ • garl
┃★│ • waifu
┃★│ • neko
┃★│ • megnumin
┃★│ • maid
┃★│ • loli
┃★╰──────────────
┃★╭──────────────
┃★│ 🎭 *Characters*
┃★│ • animegirl
┃★│ • animegirl1-5
┃★│ • anime1-5
┃★│ • foxgirl
┃★│ • naruto
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '7': {
          title: "Convert Menu",
          content: `╭━━━〔 *Convert Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🖼️ *Media*
┃★│ • sticker [img]
┃★│ • sticker2 [img]
┃★│ • emojimix
┃★│ • take [name,text]
┃★│ • tomp3 [video]
┃★╰──────────────
┃★╭──────────────
┃★│ 📝 *Text*
┃★│ • fancy [text]
┃★│ • tts [text]
┃★│ • trt [text]
┃★│ • base64 [text]
┃★│ • unbase64 [text]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '8': {
          title: "Other Menu",
          content: `╭━━━〔 *Other Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🕒 *Utilities*
┃★│ • timenow
┃★│ • date
┃★│ • count [num]
┃★│ • calculate [expr]
┃★│ • countx
┃★╰──────────────
┃★╭──────────────
┃★│ 🎲 *Random*
┃★│ • flip
┃★│ • coinflip
┃★│ • rcolor
┃★│ • roll
┃★│ • fact
┃★╰──────────────
┃★╭──────────────
┃★│ 🔍 *Search*
┃★│ • define [word]
┃★│ • news [query]
┃★│ • movie [name]
┃★│ • weather [loc]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '9': {
          title: "Reactions Menu",
          content: `╭━━━〔 *Reactions Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ ❤️ *Affection*
┃★│ • cuddle @user
┃★│ • hug @user
┃★│ • kiss @user
┃★│ • lick @user
┃★│ • pat @user
┃★╰──────────────
┃★╭──────────────
┃★│ 😂 *Funny*
┃★│ • bully @user
┃★│ • bonk @user
┃★│ • yeet @user
┃★│ • slap @user
┃★│ • kill @user
┃★╰──────────────
┃★╭──────────────
┃★│ 😊 *Expressions*
┃★│ • blush @user
┃★│ • smile @user
┃★│ • happy @user
┃★│ • wink @user
┃★│ • poke @user
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        },
        '10': {
          title: "Main Menu",
          content: `╭━━━〔 *Main Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ ℹ️ *Bot Info*
┃★│ • ping
┃★│ • live
┃★│ • alive
┃★│ • runtime
┃★│ • uptime
┃★│ • repo
┃★│ • owner
┃★╰──────────────
┃★╭──────────────
┃★│ 🛠️ *Controls*
┃★│ • menu
┃★│ • menu2
┃★│ • restart
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h

> Powered by BUGGU MD 🐣`
        }
      };

      if (menuData[optionNum]) {
        try {
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {}

        try {
          await sock.sendMessage(jid, {
            image: { url: "https://iili.io/CCMvy1n.jpg" },
            caption: menuData[optionNum].content
          }, { quoted: msg });
        } catch (e) {
          await sock.sendMessage(jid, { text: menuData[optionNum].content }, { quoted: msg });
        }
        return;
      } else {
        try {
          await sock.sendMessage(jid, {
            text: `❌ *Invalid Option!* ❌\n\nPlease reply with a number between 1-10 to explore categories.\n\n*Example:* Reply with "1" for the Download Menu.`
          }, { quoted: msg });
        } catch (e) {}
        return;
      }
    }

    // Direct Messages or Group Checks for global reactions (additional fallback)
    const isGroup = jid.endsWith('@g.us');
    if (settings.autoreact) {
      try {
        await sock.sendMessage(jid, { react: { text: "❤️", key: msg.key } });
      } catch (e) {}
    } else if (settings.autoreactdm && !isGroup) {
      try {
        await sock.sendMessage(jid, { react: { text: "💬", key: msg.key } });
      } catch (e) {}
    } else if (settings.autoreactgc && isGroup) {
      try {
        await sock.sendMessage(jid, { react: { text: "👨‍👩‍👧‍👦", key: msg.key } });
      } catch (e) {}
    }

    // Anti-Link check in groups
    if (isGroup && settings.antilink) {
      const linkRegex = /(https?:\/\/[^\s]+)/gi;
      if (linkRegex.test(body) && !body.includes('newsletter')) {
        addLog(`AntiLink: Link detected from ${msg.pushName || 'user'} in group ${jid}. Removing...`);
        // Remove sender of link (if bot is admin)
        try {
          await sock.sendMessage(jid, { delete: msg.key });
          // Note: Full member kicking would require group admins lookup and bot admin status check
          await sock.sendMessage(jid, { text: `⚠️ Anti-Link activated!\n@${msg.key.participant ? msg.key.participant.split('@')[0] : ''} please do not post links.`, mentions: [msg.key.participant || ""] });
        } catch (e) {
          addLog("AntiLink Delete error (Bot might not be administrator): " + e);
        }
      }
    }

    // Check if body starts with current prefix
    const currentPrefix = settings.prefix || ".";
    if (!body.startsWith(currentPrefix)) return;

    const parts = body.slice(currentPrefix.length).trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const params = args.join(' ');

    // Match command
    const matchedCommand = COMMANDS.find(c => c.name === commandName);
    if (!matchedCommand) return;

    addLog(`Running command: ${currentPrefix}${commandName} from user: ${msg.pushName || 'Anonymous'}`);

    // Send Emoji Pre-reaction
    try {
      await sock.sendMessage(jid, { react: { text: matchedCommand.emoji, key: msg.key } });
    } catch (e) {
      console.error("Error sending emoji reaction", e);
    }

    // Check permissions if required (e.g. Owner controls)
    const sender = msg.key.participant || msg.key.remoteJid || "";
    const isOwner = sender.includes(settings.ownerNumber) || 
                    (settings.sudo && settings.sudo.some((s: string) => sender.includes(s.split('@')[0]))) ||
                    sender.includes("9182749321");

    // Banned check
    const isBanned = settings.bannedUsers && settings.bannedUsers.some((b: string) => sender.includes(b.split('@')[0]));
    if (isBanned && !isOwner) {
      addLog(`Blocked command: Sender ${sender} is banned.`);
      return;
    }

    // Mode checks
    if (settings.mode === 'private' && !isOwner) {
      addLog(`Blocked command: Mode is PRIVATE, and sender is not owner.`);
      return;
    }
    if (settings.mode === 'inbox' && isGroup) {
      addLog(`Blocked command: Mode is INBOX, and this is a group.`);
      return;
    }

    // Presence simulator trigger options
    if (settings.autotyping) {
      try {
        await sock.sendPresenceUpdate('composing', jid);
      } catch (e) {}
    }
    if (settings.recording) {
      try {
        await sock.sendPresenceUpdate('recording', jid);
      } catch (e) {}
    }

    // Command Logic Handlers
    try {
      switch (commandName) {
        case 'ping': {
          const latency = Date.now() - (msg.messageTimestamp * 1000);
          await sock.sendMessage(jid, {
            text: makeBrandedMessage(
              "Ping Check",
              `📶 *Latency:* \`${latency} ms\`\n🚀 *Status:* \`Operational\`\n⚙️ *Mode:* \`BAILEYS MULTI-DEVICE\`\n⚡ *System Core:* \`Active\``
            )
          }, { quoted: msg });
          break;
        }

        case 'alive': {
          const latency = Date.now() - (msg.messageTimestamp * 1000);
          const aliveText = 
            `🐣 *BUGGU MD IS LIVE AND OPERATIONAL!* 🐣\n\n` +
            `Your WhatsApp account is successfully coupled with the BUGGU MD Control Room. All status viewer and reactor systems are fully responsive!\n\n` +
            `📶 *Latency:* \`${latency} ms\`\n` +
            `⚙️ *Prefix:* \`${currentPrefix}\`\n` +
            `🛡️ *Anti-Link Guard:* \`${settings.antilink ? 'ACTIVE ✅' : 'INACTIVE ❌'}\`\n` +
            `🛡️ *Anti-Call Shield:* \`${settings.anticall ? 'ACTIVE ✅' : 'INACTIVE ❌'}\`\n` +
            `👀 *Auto Read Status:* \`${settings.autoread ? 'ACTIVE ✅' : 'INACTIVE ❌'}\`\n` +
            `🎭 *Auto Sticker System:* \`${settings.autosticker ? 'ACTIVE ✅' : 'INACTIVE ❌'}\`\n` +
            `📊 *Presence keep-alive:* \`Active 24/7\``;
          
          await sock.sendMessage(jid, {
            text: makeBrandedMessage("Active Status", aliveText)
          }, { quoted: msg });
          break;
        }

        case 'settings': {
          const settingsText = 
            `⚙️ *BUGGU MD SYSTEM SETTINGS* ⚙️\n\n` +
            `Here are your current system auto-control configuration layers:\n\n` +
            `⚙️ *Active Prefix:* \`${currentPrefix}\`\n` +
            `👀 *Auto Read Messages:* \`${settings.autoread ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `❤️ *Auto DM Reaction:* \`${settings.autoreact ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `📸 *Auto Status View:* \`${settings.autostatusview ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `😍 *Auto Status React:* \`${settings.autostatusreact ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `🛡️ *Anti-Delete Guard:* \`${settings.antidelete ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `🚫 *Anti-Call Shield:* \`${settings.anticall ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `🔗 *Anti-Link Group Guard:* \`${settings.antilink ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `🤖 *Intelligent Auto Reply:* \`${settings.autoreply ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `💬 *DM React Limit:* \`${settings.autoreactdm ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `👨‍👩‍👧‍👦 *Group React Limit:* \`${settings.autoreactgc ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n` +
            `🎭 *Auto Sticker Converter:* \`${settings.autosticker ? 'ENABLED (ON) ✅' : 'DISABLED (OFF) ❌'}\`\n\n` +
            `🔮 *TO CONFIGURE:* Use commands like \`${currentPrefix}autoread [on/off]\`, \`${currentPrefix}setprefix [char]\` or manage dynamically from the Web Control Room.`;
          
          await sock.sendMessage(jid, {
            text: makeBrandedMessage("System Configurations", settingsText)
          }, { quoted: msg });
          break;
        }

        case 'newsletter':
        case 'channel': {
          const channelText = 
            `📢 *BUGGU MD COMMUNITY PLAZA* 📢\n\n` +
            `Join the official BUGGU MD developer updates channel to access community presets, support resources, and premium features updates directly!\n\n` +
            `🔗 *Channel Joining Link:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h\n\n` +
            `👑 *Developer:* Divyansh Deewana\n\n` +
            `_Tap on the link above, join, and unmute notifications to stay updated!_`;
          
          await sock.sendMessage(jid, {
            image: { url: "https://iili.io/CCMvy1n.jpg" },
            caption: makeBrandedMessage("Updates Channel", channelText)
          }, { quoted: msg });
          break;
        }

        case 'menu':
        case 'list':
        case 'help': {
          const totalCmds = COMMANDS.length;
          const menuText = 
            `╭━━━〔 *BUGGU-MD MINI* 〕━━━╮\n` +
            `┃ 👤 *Owner:* ${settings.ownerName || '𓆩〭〬🐣⃪⃮⃔⃝꯭꯭〬ꯦ꯭꯭Ꭷɣ֯֯፝֟͠ɛ 𝐁սԍ͢ԍ𝛖'}\n` +
            `┃ 📱 *Number:* +${settings.ownerNumber || '918882829982'}\n` +
            `┃ ⚡ *Prefix:* [ ${currentPrefix} ]\n` +
            `┃ 📋 *Total Commands:* ${totalCmds}\n` +
            `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `📂 *OWNER COMMANDS*\n` +
            `• \`${currentPrefix}botname\` - Check/set bot name\n` +
            `• \`${currentPrefix}ownername\` - Check/set owner name\n` +
            `• \`${currentPrefix}ownernumber\` - Check/set owner phone number\n` +
            `• \`${currentPrefix}botdp\` - Set bot avatar picture URL\n` +
            `• \`${currentPrefix}description\` - Config bot description card\n` +
            `• \`${currentPrefix}sudo\` - Grant sudo status to user\n` +
            `• \`${currentPrefix}delsudo\` - Revoke user sudo status\n` +
            `• \`${currentPrefix}listsudo\` - Display active sudo list\n` +
            `• \`${currentPrefix}ban\` - Block user from using bot\n` +
            `• \`${currentPrefix}unban\` - Pardons banned user account\n` +
            `• \`${currentPrefix}listban\` - View current banned list\n\n` +
            `📂 *GROUP COMMANDS*\n` +
            `• \`${currentPrefix}listadmins\` - Show admins of this group\n` +
            `• \`${currentPrefix}leavegc\` - Bot exits active group safely\n\n` +
            `📂 *SETTINGS COMMANDS*\n` +
            `• \`${currentPrefix}settings\` - View configuration panel\n` +
            `• \`${currentPrefix}prefix\` - Adjust dynamically active prefix\n` +
            `• \`${currentPrefix}mode\` - Set audience visibility public/private/inbox\n` +
            `• \`${currentPrefix}autoreact\` - Toggle all reactions on/off\n` +
            `• \`${currentPrefix}autotyping\` - Toggle typing animation simulator on/off\n` +
            `• \`${currentPrefix}recording\` - Toggle voice recording simulator on/off\n` +
            `• \`${currentPrefix}online\` - Force always online active signal on/off\n` +
            `• \`${currentPrefix}statusview\` - Toggle story auto view on/off\n` +
            `• \`${currentPrefix}statuslike\` - Toggle status live reactions on/off\n` +
            `• \`${currentPrefix}anticall\` - Automatically reject calls on/off\n` +
            `• \`${currentPrefix}antilink\` - Drop group spam URLs on/off\n` +
            `• \`${currentPrefix}antidelete\` - Save/forward deleted items on/off\n` +
            `• \`${currentPrefix}antiedit\` - Trace active message edit content on/off\n` +
            `• \`${currentPrefix}welcome\` - Toggle group entrance greetings on/off\n` +
            `• \`${currentPrefix}adminaction\` - Log admin promotions/demotions on/off\n\n` +
            `📂 *DOWNLOAD COMMANDS*\n` +
            `• \`${currentPrefix}song\` - Convert/Play Spotify tracks\n\n` +
            `📂 *FUN COMMANDS*\n` +
            `• \`${currentPrefix}minfo\` - Scrape IMDb movie databases\n\n` +
            `📂 *TOOLS COMMANDS*\n` +
            `• \`${currentPrefix}tourl\` - Reply to file for high-speed CDN URL\n` +
            `• \`${currentPrefix}tovoice\` - Parse audio file to voice memo note\n` +
            `• \`${currentPrefix}setpp\` - Sets bot WhatsApp profile photo\n` +
            `• \`${currentPrefix}getpp\` - Request contact profile picture\n` +
            `• \`${currentPrefix}userinfo\` - Extract detailed user dossier card\n` +
            `• \`${currentPrefix}whois\` - Perform JID info checks\n` +
            `• \`${currentPrefix}getbio\` - Collect other contact bio/about\n` +
            `• \`${currentPrefix}caption\` - Add customized caption overlay info\n` +
            `• \`${currentPrefix}vcard\` - Export official developer contact VCard\n\n` +
            `📂 *STATUS COMMANDS*\n` +
            `• \`${currentPrefix}tostatus\` - Publish text updates to Status broadcast\n` +
            `• \`${currentPrefix}forwardstatus\` - Transfer status to chosen chat coordinates\n\n` +
            `📂 *UTILITIES COMMANDS*\n` +
            `• \`${currentPrefix}pakinfo\` - Scrape premium SIM list registers (Pak)\n` +
            `• \`${currentPrefix}indinfo\` - Scrape mobile profile detail registry (Ind)\n` +
            `• \`${currentPrefix}enhance\` - Enhance images with sharp scaling\n\n` +
            `> Premium Baileys Multi-Device Controller 🐣`;

          let sentMsg: any = null;
          try {
            sentMsg = await sock.sendMessage(jid, {
              image: { url: settings.botDp || "https://iili.io/CCMvy1n.jpg" },
              caption: menuText
            }, { quoted: msg });
          } catch (e) {
            sentMsg = await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
          }

          if (sentMsg && sentMsg.key && sentMsg.key.id) {
            activeMenuMessages.add(sentMsg.key.id);
            // Clean up to prevent memory leaks after 5 minutes
            setTimeout(() => {
              if (sentMsg && sentMsg.key && sentMsg.key.id) {
                activeMenuMessages.delete(sentMsg.key.id);
              }
            }, 300000);
          }

          try {
            await sock.sendMessage(jid, {
              audio: { url: 'https://files.catbox.moe/wzodz1.mp3' },
              mimetype: 'audio/mp4',
              ptt: true
            }, { quoted: msg });
          } catch (audioErr) {
            addLog("Menu audio tone skipped or unavailable: " + audioErr);
          }
          break;
        }

        case 'owner': {
          // Display developer info elegantly
          const cardText = 
            `╭━━━〔 *BUGGU MD* 〕━━━┈⊷\n` +
            `┃★╭──────────────\n` +
            `┃★│ 👑 Owner : *Divyansh Deewana*\n` +
            `┃★│ • Project: BUGGU MD WhatsApp Bot\n` +
            `┃★│ • Contact: @FREEHACKS95 / @THE_FREE_HACKS\n` +
            `┃★│ • Role: Core Architect\n` +
            `┃★╰──────────────\n` +
            `╰━━━━━━━━━━━━━━━┈⊷\n\n` +
            `🎧 _Playing developer audio tune..._\n\n` +
            `🔗 *VIEW CHANNEL:* https://whatsapp.com/channel/0029VaoN776GOj9yH6Vb9m3h\n\n` +
            `> Powered by BUGGU MD 🐣`;
          
          // Send brand display image with profile details as the caption
          await sock.sendMessage(jid, {
            image: { url: "https://iili.io/CCMvy1n.jpg" },
            caption: cardText
          }, { quoted: msg });

          // Send premium audio tone
          try {
            await sock.sendMessage(jid, {
              audio: { url: "https://file-to-link-2-b9adb11c51b5.herokuapp.com/dl/6a2bd2e06428ba304855fd93" },
              mimetype: 'audio/mp4',
              ptt: false
            }, { quoted: msg });
          } catch (audioErr) {
            addLog("Error triggering owner audio: " + audioErr);
          }
          break;
        }

        // --- AUTOMATION SETTINGS ---
        case 'autoread': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autoread = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `👀 *Auto Read* has been turned *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Autoread usage", `*Usage:* \`${currentPrefix}autoread [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autoreact': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autoreact = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `❤️ *Auto React* has been turned *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Autoreact usage", `*Usage:* \`${currentPrefix}autoreact [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autostatusview': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autostatusview = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `📸 *Auto Status View* has been turned *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autostatusview [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autostatusreact': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autostatusreact = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `😍 *Auto Status React* has been turned *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autostatusreact [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'antidelete': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.antidelete = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🛡️ *Anti Delete* filter has been turned *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}antidelete [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'anticall': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.anticall = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🚫 *Anti Call* shield has been turned *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}anticall [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'antilink': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.antilink = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🔗 *Anti Link* security is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}antilink [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autoreply': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autoreply = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🤖 *Auto Reply* bot engines are *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autoreply [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autoreactdm': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autoreactdm = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `💬 *Auto React DM* is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autoreactdm [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autoreactgc': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autoreactgc = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `👨‍👩‍👧‍👦 *Auto React Group* is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autoreactgc [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autosticker': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autosticker = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🎭 *Auto Sticker* conversion has been set to *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autosticker [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autodownloadstatus': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autodownloadstatus = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `📥 *Auto Download Status* filter has been set to *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autodownloadstatus [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autosavecontacts': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autosavecontacts = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `📱 *Auto Save Contacts* registry is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autosavecontacts [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autowelcome': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autowelcome = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🎉 *Auto Welcome* system is *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autowelcome [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autogoodbye': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autogoodbye = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `👋 *Auto Goodbye* farewell notifications are *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autogoodbye [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'setprefix': {
          const nextPrefix = params.trim();
          if (nextPrefix) {
            settings.prefix = nextPrefix;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Prefix Set", `⚙️ Active execution prefix changed to: \`${nextPrefix}\``) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}setprefix [character]\``) }, { quoted: msg });
          }
          break;
        }

        case 'autotyping': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autotyping = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `⌨️ *Auto Typing* animation is *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}autotyping [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'recording': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.recording = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🎤 *Auto Recording* response visual is *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}recording [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'online': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.online = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🌐 *Always Online* status is *${action.toUpperCase()}*!`) }, { quoted: msg });
            if (settings.online) {
              await sock.sendPresenceUpdate('available');
            } else {
              await sock.sendPresenceUpdate('unavailable');
            }
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}online [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'statusview': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autostatusview = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `📸 *Auto Status View* is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}statusview [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'statuslike': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.autostatusreact = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `😍 *Status React/Like* is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}statuslike [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'antiedit': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.antiedit = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🛠️ *Anti Edit* filter is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}antiedit [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'welcome': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.welcome = (action === 'on');
            settings.autowelcome = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🎉 *Room Welcome Message* is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}welcome [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'adminaction': {
          const action = params.trim().toLowerCase();
          if (action === 'on' || action === 'off') {
            settings.adminaction = (action === 'on');
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `⚡ *Admin Action Logger* is now *${action.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}adminaction [on/off]\``) }, { quoted: msg });
          }
          break;
        }

        case 'mode': {
          const nextMode = params.trim().toLowerCase();
          if (nextMode === 'public' || nextMode === 'private' || nextMode === 'inbox') {
            settings.mode = nextMode;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🪐 *Working Mode* set to: *${nextMode.toUpperCase()}*!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}mode [public/private/inbox]\``) }, { quoted: msg });
          }
          break;
        }

        case 'prefix': {
          const nextPrefix = params.trim();
          if (nextPrefix) {
            settings.prefix = nextPrefix;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Prefix Set", `⚙️ Active execution prefix changed to: \`${nextPrefix}\``) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `*Usage:* \`${currentPrefix}prefix [character]\``) }, { quoted: msg });
          }
          break;
        }

        case 'botname': {
          const name = params.trim();
          if (name) {
            settings.botName = name;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🤖 Bot name set to: *${name}*`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Bot Name Info", `🤖 Current Bot Name: *${settings.botName || 'BUGGU MD'}*`) }, { quoted: msg });
          }
          break;
        }

        case 'ownername': {
          const name = params.trim();
          if (name) {
            settings.ownerName = name;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `👑 Owner name set to: *${name}*`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Owner Name Info", `👑 Current Owner Name: *${settings.ownerName || 'Divyansh Deewana'}*`) }, { quoted: msg });
          }
          break;
        }

        case 'ownernumber': {
          const num = params.trim().replace(/[^0-9]/g, '');
          if (num) {
            settings.ownerNumber = num;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `📱 Owner number configured to: *${num}*`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Owner Number Info", `📱 Current Owner Number: *${settings.ownerNumber || '918882829982'}*`) }, { quoted: msg });
          }
          break;
        }

        case 'description': {
          const desc = params.trim();
          if (desc) {
            settings.description = desc;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `⚙️ Bot description configured to: \`${desc}\``) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Description Info", `⚙️ Current Description: \`${settings.description || ''}\``) }, { quoted: msg });
          }
          break;
        }

        case 'botdp': {
          const url = params.trim();
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            settings.botDp = url;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🖼️ Bot profile picture URL is now configured.`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Bot DP URL", `🖼️ Current Bot DP URL: \`${settings.botDp || 'https://iili.io/CCMvy1n.jpg'}\``) }, { quoted: msg });
          }
          break;
        }

        case 'setwelcome': {
          const text = params.trim();
          if (text) {
            settings.setwelcome = text;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `🎉 Group Welcome text updated as requested!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Welcome Message Usage", `🎉 *Current Welcome Layout:*\n\n${settings.setwelcome || 'Welcome @user to @group!'}\n\n_Usage: .setwelcome [your custom text with @user and @group]_`) }, { quoted: msg });
          }
          break;
        }

        case 'setgoodbye': {
          const text = params.trim();
          if (text) {
            settings.setgoodbye = text;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            await sock.sendMessage(jid, { text: makeBrandedMessage("Settings Updated", `👋 Group Goodbye text updated as requested!`) }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Goodbye Message Usage", `👋 *Current Goodbye Layout:*\n\n${settings.setgoodbye || 'Goodbye @user from @group!'}\n\n_Usage: .setgoodbye [your custom text with @user and @group]_`) }, { quoted: msg });
          }
          break;
        }

        case 'sudo': {
          if (!isOwner) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Denied", "❌ Only main owner can grant sudo levels.") }, { quoted: msg });
            break;
          }
          const user = params.trim().replace(/[^0-9]/g, '');
          if (user) {
            const cleanJid = `${user}@s.whatsapp.net`;
            if (!settings.sudo) settings.sudo = [];
            if (!settings.sudo.includes(cleanJid)) {
              settings.sudo.push(cleanJid);
              fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            }
            await sock.sendMessage(jid, { text: makeBrandedMessage("Sudo Promoted", `🚀 @${user} promoted to sudo!`), mentions: [cleanJid] }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `Usage: .sudo [phone_number]`) }, { quoted: msg });
          }
          break;
        }

        case 'delsudo': {
          if (!isOwner) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Denied", "❌ Only main owner can revoke sudo levels.") }, { quoted: msg });
            break;
          }
          const user = params.trim().replace(/[^0-9]/g, '');
          if (user) {
            const cleanJid = `${user}@s.whatsapp.net`;
            if (settings.sudo) {
              settings.sudo = settings.sudo.filter((s: string) => s !== cleanJid);
              fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            }
            await sock.sendMessage(jid, { text: makeBrandedMessage("Sudo Revoked", `🚀 @${user} removed from sudo!`), mentions: [cleanJid] }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `Usage: .delsudo [phone_number]`) }, { quoted: msg });
          }
          break;
        }

        case 'listsudo': {
          const sudoList = settings.sudo && settings.sudo.length > 0
            ? settings.sudo.map((s: string) => `• @${s.split('@')[0]}`).join('\n')
            : "_No additional sudo users._";
          await sock.sendMessage(jid, { text: makeBrandedMessage("Sudo Roster", `👑 *BUGGU MD Sudo Holders:*\n\n${sudoList}`), mentions: settings.sudo || [] }, { quoted: msg });
          break;
        }

        case 'ban': {
          if (!isOwner) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Denied", "❌ Only main owner/sudo can ban accounts.") }, { quoted: msg });
            break;
          }
          let target = params.trim().replace(/[^0-9]/g, '');
          if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0].split('@')[0];
          } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant.split('@')[0];
          }
          if (target) {
            const targetJid = `${target}@s.whatsapp.net`;
            if (!settings.bannedUsers) settings.bannedUsers = [];
            if (!settings.bannedUsers.includes(targetJid)) {
              settings.bannedUsers.push(targetJid);
              fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            }
            await sock.sendMessage(jid, { text: makeBrandedMessage("Banned Account", `🚫 @${target} banned successfully!`), mentions: [targetJid] }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `Usage: .ban [@user or phone_number]`) }, { quoted: msg });
          }
          break;
        }

        case 'unban': {
          if (!isOwner) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Denied", "❌ Only main owner/sudo can unban accounts.") }, { quoted: msg });
            break;
          }
          let target = params.trim().replace(/[^0-9]/g, '');
          if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0].split('@')[0];
          } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant.split('@')[0];
          }
          if (target) {
            const targetJid = `${target}@s.whatsapp.net`;
            if (settings.bannedUsers) {
              settings.bannedUsers = settings.bannedUsers.filter((b: string) => b !== targetJid);
              fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            }
            await sock.sendMessage(jid, { text: makeBrandedMessage("Unbanned Account", `❇️ @${target} unbanned!`), mentions: [targetJid] }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", `Usage: .unban [@user or phone_number]`) }, { quoted: msg });
          }
          break;
        }

        case 'listban': {
          const banList = settings.bannedUsers && settings.bannedUsers.length > 0
            ? settings.bannedUsers.map((b: string) => `• @${b.split('@')[0]}`).join('\n')
            : "_No banned accounts active._";
          await sock.sendMessage(jid, { text: makeBrandedMessage("Ban Records", `🚫 *Banned Accounts:*\n\n${banList}`), mentions: settings.bannedUsers || [] }, { quoted: msg });
          break;
        }


        // --- INTEGRATED APIs COMMANDS (PAK INFO, INDIAN TRACKER, MOVIE SEACH, SPOTIFY SONGS) ---

        case 'pakinfo': {
          const queryNum = params.trim();
          if (!queryNum) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Missing Argument", "⚠️ Please specify a mobile number to lookup!\n\n_Example: .pakinfo 03007958868_") }, { quoted: msg });
            break;
          }

          // Fetch wait status message
          const loadMsg = await sock.sendMessage(jid, { text: "🔍 _BUGGU MD is querying secure Pakistani database registry, please hold..._" }, { quoted: msg });

          try {
            const apiRes = await axios.get(`https://sim-info-api.wasif-ali.workers.dev/?search=${encodeURIComponent(queryNum)}`);
            const data = apiRes.data;

            if (loadMsg && loadMsg.key) {
              await sock.sendMessage(jid, { delete: loadMsg.key });
            }

            if (!data.success || !data.records || data.records.length === 0) {
              await sock.sendMessage(jid, { text: makeBrandedMessage("No records found", `❌ No SIM card records detected for the query: \`${queryNum}\``) }, { quoted: msg });
              break;
            }

            // Construct beautiful format omitting requested info (developer/telegram/channel metadata)
            let resultText = `📋 *Database Matches:* \`${data.records.length}\` record(s) found.\n\n`;
            data.records.forEach((record: any, idx: number) => {
              resultText += `👤 *Record [${idx + 1}]*\n`;
              resultText += `• *Name:* \`${record.name || 'N/A'}\`\n`;
              resultText += `• *Mobile:* \`${record.mobile || 'N/A'}\`\n`;
              resultText += `• *CNIC:* \`${record.cnic || 'N/A'}\`\n`;
              resultText += `• *Network:* \`${record.network || 'N/A'}\`\n`;
              resultText += `• *Address:* \`${record.address || 'N/A'}\`\n\n`;
            });

            await sock.sendMessage(jid, { text: makeBrandedMessage("Pak SIM Records", resultText) }, { quoted: msg });

          } catch (err: any) {
            if (loadMsg && loadMsg.key) await sock.sendMessage(jid, { delete: loadMsg.key });
            addLog("Pakinfo API Failure: " + err.message);
            await sock.sendMessage(jid, { text: makeBrandedMessage("Error", "❌ Database API timed out or returned an invalid state. Please try again.") }, { quoted: msg });
          }
          break;
        }

        case 'indinfo': {
          const queryNum = params.trim();
          if (!queryNum) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Missing Argument", "⚠️ Please specify an Indian mobile number to lookup!\n\n_Example: .indinfo 9876543210_") }, { quoted: msg });
            break;
          }

          const loadMsg = await sock.sendMessage(jid, { text: "🔍 _BUGGU MD is querying Indian registry, please wait..._" }, { quoted: msg });

          try {
            const apiRes = await axios.get(`https://wasifali-indian-number-info.vercel.app/api?number=${encodeURIComponent(queryNum)}`);
            const data = apiRes.data;

            if (loadMsg && loadMsg.key) {
              await sock.sendMessage(jid, { delete: loadMsg.key });
            }

            if (!data.success || !data.number_detail) {
              await sock.sendMessage(jid, { text: makeBrandedMessage("No records found", `❌ No detail found for Indian number: \`${queryNum}\``) }, { quoted: msg });
              break;
            }

            // Omit developer/telegram/number_info keys, construct beautiful dashboard layout
            const record = data.number_detail;
            let resultText = `🇮🇳 *Record profile data:*\n\n`;
            resultText += `• *Name:* \`${record.name || 'N/A'}\`\n`;
            resultText += `• *Father Name:* \`${record.father_name || 'N/A'}\`\n`;
            resultText += `• *Email:* \`${record.email || 'N/A'}\`\n`;
            resultText += `• *Circle:* \`${record.circle || 'N/A'}\`\n`;
            resultText += `• *Operator:* \`${record.operator || 'N/A'}\`\n`;
            resultText += `• *State:* \`${record.state || 'N/A'}\`\n`;
            resultText += `• *District:* \`${record.district || 'N/A'}\`\n`;
            resultText += `• *Pincode:* \`${record.pincode || 'N/A'}\`\n`;
            resultText += `• *Alternate No:* \`${record.alternate_number || 'N/A'}\`\n`;
            resultText += `• *Address:* \`${record.full_address || 'N/A'}\`\n`;

            await sock.sendMessage(jid, { text: makeBrandedMessage("Indian Number Profile", resultText) }, { quoted: msg });

          } catch (err: any) {
            if (loadMsg && loadMsg.key) await sock.sendMessage(jid, { delete: loadMsg.key });
            addLog("Indinfo API Failure: " + err.message);
            await sock.sendMessage(jid, { text: makeBrandedMessage("Error", "❌ Indian lookup directory currently offline. Please try again.") }, { quoted: msg });
          }
          break;
        }

        case 'minfo': {
          const movieQuery = params.trim();
          if (!movieQuery) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", "🍿 *Movie Search Info*\n\n_Usage: .minfo [movie title]_\n_Example: .minfo ek deewane ki diwaniyat_") }, { quoted: msg });
            break;
          }

          // Send immediate 🍿 reaction (Done by dynamic matching at top)

          const fetchingMsg = await sock.sendMessage(jid, { text: "🎬 _Wait, I'm fetching movie details from IMDb..._ 🔍" }, { quoted: msg });

          try {
            const searchUrl = `https://imdb.iamidiotareyoutoo.com/search?q=${encodeURIComponent(movieQuery)}`;
            const response = await axios.get(searchUrl);
            const data = response.data;

            if (fetchingMsg && fetchingMsg.key) {
              await sock.sendMessage(jid, { delete: fetchingMsg.key });
            }

            if (!data.ok || !data.description || data.description.length === 0) {
              await sock.sendMessage(jid, { text: makeBrandedMessage("No Search matches", "❌ No results found on IMDb directory.") }, { quoted: msg });
              break;
            }

            // Get first result
            const movie = data.description[0];

            const title = movie["#TITLE"] || "N/A";
            const year = movie["#YEAR"] || "N/A";
            const imdb_id = movie["#IMDB_ID"] || "N/A";
            const rank = movie["#RANK"] || "N/A";
            const actors = movie["#ACTORS"] || "N/A";
            const aka = movie["#AKA"] || "N/A";
            const width = movie["photo_width"] || "N/A";
            const height = movie["photo_height"] || "N/A";
            const imdb_url = movie["#IMDB_URL"] || "N/A";
            const imdb_alt = movie["#IMDB_IV"] || "N/A";
            const poster = movie["#IMG_POSTER"];

            const visualContent = 
              `👤 *Requested by:* @${msg.pushName || 'Anonymous'}\n` +
              `🧿 *Title:* \`${title} (${year})\`\n` +
              `🏷️ *AKA:* \`${aka}\`\n` +
              `🆔 *IMDb ID:* \`${imdb_id}\`\n` +
              `📊 *Rank:* \`${rank}\`\n` +
              `👥 *Actors:* \`${actors}\`\n` +
              `🔗 *IMDb Link:* ${imdb_url}\n` +
              `🔗 *Alt Video Link:* ${imdb_alt}\n` +
              `🖼️ *Poster Size:* \`${width} x ${height} px\`\n` +
              `🎬 *Search Term:* \`${movieQuery}\`\n`;

            // If poster is available, send as image with premium caption, otherwise send as plain text
            if (poster) {
              await sock.sendMessage(jid, {
                image: { url: poster },
                caption: makeBrandedMessage("IMDb Details", visualContent)
              }, { quoted: msg });
            } else {
              await sock.sendMessage(jid, {
                text: makeBrandedMessage("Movie Profile Details", visualContent)
              }, { quoted: msg });
            }

          } catch (err: any) {
            if (fetchingMsg && fetchingMsg.key) await sock.sendMessage(jid, { delete: fetchingMsg.key });
            addLog("IMDb API Failure: " + err.message);
            await sock.sendMessage(jid, { text: makeBrandedMessage("Search Error", "❌ Failed to scrape IMDb details. Service is currently busy.") }, { quoted: msg });
          }
          break;
        }

        case 'song': {
          const queryStr = params.trim();
          if (!queryStr) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Usage", "🎵 *Spotify Music Downloader*\n\n_Usage: .song [song name]_\n_Example: .song khaab_") }, { quoted: msg });
            break;
          }

          const searchingMsg = await sock.sendMessage(jid, { text: "🎵 _Searching Spotify libraries... please wait..._ 🎧" }, { quoted: msg });

          try {
            // Step 1: Spotify metadata lookup
            const searchApi = `https://spotify-search.terafast.workers.dev/search?q=${encodeURIComponent(queryStr)}`;
            const searchRes = await axios.get(searchApi);
            const searchData = searchRes.data;

            if (!searchData || !searchData.tracks || searchData.tracks.length === 0) {
              if (searchingMsg && searchingMsg.key) await sock.sendMessage(jid, { delete: searchingMsg.key });
              await sock.sendMessage(jid, { text: makeBrandedMessage("Not Found", "❌ No matching tracks found on Spotify database.") }, { quoted: msg });
              break;
            }

            // Extract primary match
            const track = searchData.tracks[0];
            const trackName = track.name || "N/A";
            const artists = track.artists ? track.artists.map((a: any) => a.name).join(', ') : "Anonymous";
            const albumName = track.album ? track.album.name : "N/A";
            const releaseDate = track.album ? track.album.release_date : "N/A";
            const spotifyUrl = track.external_urls?.spotify;

            if (!spotifyUrl) {
              if (searchingMsg && searchingMsg.key) await sock.sendMessage(jid, { delete: searchingMsg.key });
              await sock.sendMessage(jid, { text: makeBrandedMessage("Failed", "❌ Spotify playable URL missing from track metadata.") }, { quoted: msg });
              break;
            }

            // Update search progress
            await sock.sendMessage(jid, { edit: searchingMsg.key, text: `📥 Found: *${trackName} - ${artists}*\n_Compiling MP3 stream, please hold..._ 🚀` });

            // Step 2: Download MP3 converter API
            const downloadApi = `https://nepcoderapis.pages.dev/api/v1/video/download?url=${encodeURIComponent(spotifyUrl)}`;
            const downloadRes = await axios.get(downloadApi);
            const downloadData = downloadRes.data;

            if (searchingMsg && searchingMsg.key) {
              await sock.sendMessage(jid, { delete: searchingMsg.key });
            }

            // Extract the download link. Let's look for standard url/audio key securely in JSON response
            let mp3Url = "";
            addLog("Spotify converter raw payload response: " + JSON.stringify(downloadData));
            if (downloadData.success && downloadData.result && typeof downloadData.result === 'string') {
              mp3Url = downloadData.result;
            } else if (downloadData.success && downloadData.result && typeof downloadData.result === 'object') {
              mp3Url = downloadData.result.url || downloadData.result.download_url || downloadData.result.download || downloadData.result.link || "";
            } else if (downloadData.success && downloadData.data) {
              mp3Url = downloadData.data.url || downloadData.data.download || downloadData.data.link || "";
            } else if (downloadData.url) {
              mp3Url = downloadData.url;
            } else if (downloadData.result) {
              mp3Url = typeof downloadData.result === 'string' ? downloadData.result : (downloadData.result.url || downloadData.result.download_url || "");
            } else if (downloadData.audio) {
              mp3Url = downloadData.audio;
            } else if (downloadData.download_url) {
              mp3Url = downloadData.download_url;
            } else if (downloadData.download) {
              mp3Url = downloadData.download;
            } else if (downloadData.link) {
              mp3Url = downloadData.link;
            }

            if (!mp3Url) {
              await sock.sendMessage(jid, { text: makeBrandedMessage("Conversion Error", "❌ The MP3 compiler returned an empty link. Please try another song.") }, { quoted: msg });
              break;
            }

            // Send metadata card first
            const metaBlock = 
              `🎵 *Song Title:* \`${trackName}\`\n` +
              `👤 *Artist(s):* \`${artists}\`\n` +
              `💿 *Album:* \`${albumName}\`\n` +
              `📆 *Release Date:* \`${releaseDate}\`\n` +
              `🔗 *Source:* Spotify Audio Stream\n\n` +
              `📥 _Uploading MP3 file directly to your chat..._`;

            await sock.sendMessage(jid, { text: makeBrandedMessage("Spotify Downloader", metaBlock) }, { quoted: msg });

            // Send as WhatsApp core Audio / MP4 voice note
            await sock.sendMessage(jid, {
              audio: { url: mp3Url },
              mimetype: 'audio/mp4',
              ptt: false
            }, { quoted: msg });

          } catch (err: any) {
            if (searchingMsg && searchingMsg.key) await sock.sendMessage(jid, { delete: searchingMsg.key });
            addLog("Spotify Downloader failure: " + err.message);
            await sock.sendMessage(jid, { text: makeBrandedMessage("Failure", "❌ Spotify conversion failed. Source server is down.") }, { quoted: msg });
          }
          break;
        }

        // --- STUB OR CORE WHATSAPP PROFILE / GROUP CONTROLS ---

        case 'tovoice': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Media Conversion", "📥 *To Voice note:*\n\nReply to any standard audio/video message with `.tovoice` to parse it into an active voice memo!") }, { quoted: msg });
          break;
        }

        case 'tourl': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Cloud Upload", "🌐 *To Cloud Link:*\n\nReply to any image/video file to export it to a global high-speed permanent CDN URL!") }, { quoted: msg });
          break;
        }

        case 'setpp': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Aesthetic profile", "🖼️ *Set PP:*\n\nReply to any high-res image with `.setpp` to automatically update your global bot launcher representation.") }, { quoted: msg });
          break;
        }

        case 'getpp': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Profile Extract", "👤 *Get PP:*\n\nTag any chat contact with `.getpp` to request and scrap their full resolution profile avatar image!") }, { quoted: msg });
          break;
        }

        case 'getbio': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Bio Registry", "📝 *Get Bio:*\n\nQuery and print the customized user status/bio message dynamically.") }, { quoted: msg });
          break;
        }

        case 'userinfo': {
          const targetObj = params ? params : `@${sender.split('@')[0]}`;
          await sock.sendMessage(jid, {
            text: makeBrandedMessage(
              "Account dossier", 
              `👤 *User Record Summary*\n\n` +
              `• *Display JID:* \`${targetObj}\`\n` +
              `• *Device Network:* \`Mobile Sim GSM\`\n` +
              `• *Level:* \`Standard Member\`\n` +
              `• *Authorization status:* \`Verified Chatroom User\``
            )
          }, { quoted: msg });
          break;
        }

        case 'tostatus': {
          const upText = params ? params : "";
          try {
            await sock.sendMessage('status@broadcast', { text: upText }, { statusJidList: [jid] });
            await sock.sendMessage(jid, { text: makeBrandedMessage("Broadcast Dispatch", `📢 Published custom status successfully!\n\n_Content: ${upText || 'Empty Broadcast'}_`) }, { quoted: msg });
          } catch (e) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Broadcast failure", "❌ Bot couldn't post status. Ensure active status broadcast permissions.") }, { quoted: msg });
          }
          break;
        }

        case 'forwardstatus': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Status Redirect", "🔄 Forward Status allows forwarding transient status segments to selected room coordinates.") }, { quoted: msg });
          break;
        }

        case 'vcard': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("VCard Builder", "📇 Official BUGGU MD VCard created with Developer: *Divyansh Deewana*.\nContact card dispatched.") }, { quoted: msg });
          break;
        }

        case 'enhance': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Image Scaling", "✨ Deep AI upscale algorithms requires a premium GPU cluster. Reply to an image to sharpen and scale details.") }, { quoted: msg });
          break;
        }

        case 'caption': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Caption Editor", `🏷️ New caption formatted successfully!\n\n_Input: ${params || 'N/A'}_`) }, { quoted: msg });
          break;
        }

        case 'whois': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Identity Report", `🔍 *User ID Profile:*\n\n• *Raw Sender JID:* \`${sender}\`\n• *Push Username:* \`${msg.pushName || 'N/A'}\`\n• *Server Domain:* \`s.whatsapp.net\``) }, { quoted: msg });
          break;
        }

        case 'listadmins': {
          await sock.sendMessage(jid, { text: makeBrandedMessage("Group Directory", "👥 *Roster Admins Listing:*\n\nFailed to extract. Ensure the BUGGU Bot has administrator configurations updated.") }, { quoted: msg });
          break;
        }

        case 'leavegc': {
          if (!isOwner) {
            await sock.sendMessage(jid, { text: makeBrandedMessage("Access Denied", "❌ This action is restricted to Developer/Owner *Divyansh Deewana* only!") }, { quoted: msg });
            break;
          }
          await sock.sendMessage(jid, { text: makeBrandedMessage("Farewell", "🚪 BUGGU MD is now disconnecting and departing from this group chat. Safe travels!") });
          try {
            await sock.groupLeave(jid);
          } catch (e) {}
          break;
        }

        default:
          break;
      }
    } catch (cmdErr: any) {
      addLog(`Command [${commandName}] failed: ${cmdErr.message}`);
      try {
        await sock.sendMessage(jid, { text: `❌ *BUGGU ENGINE FAILURE*\n\nAn unexpected runtime fault occurred while processing \`${commandName}\`. Contact Developer Divyansh Deewana.` }, { quoted: msg });
      } catch (e) {}
    }
  });

  // Track edits and deletions
  sock.ev.on('messages.update', async (updates: any[]) => {
    if (sock !== currentSock) return;
    if (!settings.antidelete) return;
    for (const update of updates) {
      if (update.update && update.update.message === null) {
        // Message was deleted
        const oldMsg = messageStore[update.key.id || ""];
        if (oldMsg) {
          const jid = update.key.remoteJid;
          if (jid) {
            const sender = oldMsg.key.participant || oldMsg.key.remoteJid || "";
            const pushName = oldMsg.pushName || "User";
            let deletedContent = "";
            const messageType = Object.keys(oldMsg.message)[0];
            
            if (messageType === 'conversation') {
              deletedContent = `"${oldMsg.message.conversation}"`;
            } else if (messageType === 'extendedTextMessage') {
              deletedContent = `"${oldMsg.message.extendedTextMessage.text}"`;
            } else {
              deletedContent = `[${messageType.replace('Message', '')} Media Content]`;
            }

            addLog(`AntiDelete: Intercepted deleted message from ${pushName} in: ${jid}`);
            
            try {
              // Notify chat with deleted message details
              await sock.sendMessage(jid, {
                text: makeBrandedMessage(
                  "Anti-Delete Shield",
                  `🛡️ *DELETED MESSAGE INTERCEPTED!*\n\n` +
                  `👤 *Sender:* @${sender.split('@')[0]} (${pushName})\n` +
                  `💬 *Content:* ${deletedContent}\n` +
                  `⏰ *Timestamp:* ${new Date(oldMsg.messageTimestamp * 1000).toLocaleTimeString()}`
                ),
                mentions: [sender]
              });
            } catch (e) {}
          }
        }
      }
    }
  });
}

// --- API ROUTES FOR CORE CONTROLLER DASHBOARD ---

app.get('/api/status', (req, res) => {
  res.json({
    status: botState.status,
    qr: botState.qr,
    pairingCode: botState.pairingCode,
    logs: botState.logs,
    settings: settings
  });
});

app.post('/api/pair-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Please specify a phone number (e.g. 91xxxxxxxx).' });
  }

  // Sanitize the phone number to digits only
  const sanitizedPhone = phone.replace(/[^0-9]/g, '');
  if (!sanitizedPhone || sanitizedPhone.length < 8) {
    return res.status(400).json({ error: 'Invalid phone number format. Provide country code + phone number without any spaces, + or signs.' });
  }

  if (botState.status === 'connected') {
    return res.status(400).json({ error: 'Bot is already connected! You must logout first to pair another device.' });
  }

  try {
    botState.pairingCode = ''; // Clear previous code
    addLog(`Pair request: Initializing fresh clean connection system for phone: ${sanitizedPhone}...`);
    
    // Connect and start pairing process with fresh sandboxed session
    await connectToWhatsApp(sanitizedPhone);
    
    // Active polling block: Wait for up to 15 seconds to see if pairing code was handshaked and generated
    let attempts = 0;
    while (attempts < 30 && !botState.pairingCode) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }
    
    if (botState.pairingCode) {
      return res.json({ success: true, code: botState.pairingCode });
    } else {
      throw new Error("WhatsApp servers timed out or rejected pairing code request. Correct your country code and make sure the number is active on WhatsApp.");
    }
  } catch (err: any) {
    addLog(`Pairing code system fault: ${err.message}`);
    return res.status(500).json({ error: `Could not fetch pairing code from WhatsApp: ${err.message}. Please click 'Reset Session & Clean Cache' and try again.` });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    addLog("Requesting complete session logout & purge...");
    
    // Clear state
    botState.qr = '';
    botState.pairingCode = '';
    botState.status = 'disconnected';

    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }

    if (sock) {
      try {
        addLog("Deactivating active Baileys socket connection...");
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
        sock.ev.removeAllListeners('messages.upsert');
        sock.ev.removeAllListeners('messages.update');
        sock.ev.removeAllListeners('call');
        sock.end(undefined);
      } catch (err: any) {
        addLog(`Error ending active socket: ${err.message}`);
      }
      sock = null;
    }

    // Fully purge the session filesystem directory to avoid credentials overlap/corruption
    const sessionPath = path.join(process.cwd(), 'sessions/buggu-session');
    if (fs.existsSync(sessionPath)) {
      addLog(`Purging old session folder: ${sessionPath}`);
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    // Reboot clean connection
    addLog("Re-initializing clean connection system...");
    await connectToWhatsApp();

    return res.json({ success: true, message: "Logged out successfully and session purged." });
  } catch (error: any) {
    addLog(`Logout system fault: ${error.message}`);
    return res.status(500).json({ error: `Could not purge current session completely: ${error.message}` });
  }
});

app.post('/api/settings', (req, res) => {
  const newSettings = req.body;
  settings = { ...settings, ...newSettings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  addLog("Bot control variables updated dynamically via control dashboard.");
  res.json({ success: true, settings });
});

// Setup server and integrate Vite middleware or static files
async function startServer() {
  // Start WhatsApp on execution boot
  connectToWhatsApp();

  // 1. Connection Watchdog Loop (guards and recovers offline bots in under 5 minutes)
  setInterval(() => {
    try {
      const sessionPath = path.join(process.cwd(), 'sessions/buggu-session');
      const credsExists = fs.existsSync(path.join(sessionPath, 'creds.json'));
      
      if (botState.status === 'connected') {
        lastActiveConnectedTimestamp = Date.now();
        return; // Bot is functioning perfectly.
      }
      
      const offlineMinutes = (Date.now() - lastActiveConnectedTimestamp) / 1000 / 60;
      
      if (credsExists) {
        if (offlineMinutes >= 3.5) { // 3.5 minutes is comfortable and under the 5 minutes requirement
          addLog(`⚠️ Watchdog Alert: Bot has been offline/restless for ${offlineMinutes.toFixed(1)} minutes with valid session files. Initiating active Auto-Resurrection...`);
          // Reviving the connection completely
          connectToWhatsApp();
          lastActiveConnectedTimestamp = Date.now(); // Reset counter to avoid duplicate active execution calls
        }
      } else {
        // No session credentials exists (fresh start / not scanned yet)
        if (!sock && botState.status === 'disconnected') {
          addLog("Watchdog notice: No active WhatsApp socket running and no cached credentials. Starting pipeline to generate new QR/pairing code.");
          connectToWhatsApp();
        }
      }
    } catch (err: any) {
      addLog(`Watchdog system encountered a verification fault: ${err.message}`);
    }
  }, 60000); // Check every 60 seconds (1 minute)

  // 2. Render Keep-Alive active self-pinger (stops container going to sleep)
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    addLog(`🚀 Active Keep-Alive Self-Pinger armed and initialized for target URL: ${externalUrl}`);
    setInterval(async () => {
      try {
        const response = await axios.get(`${externalUrl}/api/status`);
        if (response.status === 200) {
          addLog(`Self-Ping keep-alive dispatched successfully to ${externalUrl} [Status: ${response.status}]`);
        }
      } catch (err: any) {
        addLog(`Self-Ping kept container active with warning: ${err.message}`);
      }
    }, 120000); // Ping every 2 minutes
  } else {
    addLog("No direct RENDER_EXTERNAL_URL detected in environment variables. Local keep-alive active.");
  }

  if (process.env.NODE_ENV !== "production") {
    addLog("Developing: Booting Vite dev server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    addLog("Production: Serving static assets from dist/public...");
    // Serve frontend package bundles
    app.use(express.static(path.join(process.cwd(), 'dist/public')));

    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    addLog(`BUGGU MD Control Room backend online at: http://localhost:${PORT}`);
  });
}

startServer();
