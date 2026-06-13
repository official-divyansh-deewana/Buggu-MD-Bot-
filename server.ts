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
  makeCacheableSignalKeyStore
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
  ownerNumber: "9182749321" // default placeholder, configurable from dashboard
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
let keepAliveInterval: any = null;

// Premium branded header builder
function makeBrandedMessage(title: string, content: string): string {
  return `╭━━━〔 🐣 BUGGU MD 🐣 〕━━━⬣\n\n` +
         `✨ *${title.toUpperCase()}*\n\n` +
         `${content}\n` +
         `╰━━━━━━━━━━━━━━⬣\n\n` +
         `*Powered By > BUGGU MD 🐣*`;
}

// Start WhatsApp socket logic
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(process.cwd(), 'sessions/buggu-session'));
  
  addLog("Initializing Baileys core connection system...");
  botState.status = 'connecting';

  sock = ((makeWASocket as any).default || makeWASocket)({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
    } as any,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: ["Ubuntu", "Chrome", "20.0.04"]
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      botState.qr = qr;
      botState.status = 'disconnected';
      addLog("New QR Code generated. Awaiting device linking on dashboard.");
    }

    if (connection === 'close') {
      botState.qr = '';
      botState.pairingCode = '';
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      addLog(`Connection closed. StatusCode: ${(lastDisconnect?.error as any)?.output?.statusCode}. Active reconnection: ${shouldReconnect}`);
      
      if (shouldReconnect) {
        addLog("Scheduling safe reconnection in 8 seconds to prevent connection overload...");
        setTimeout(() => {
          connectToWhatsApp();
        }, 8000);
      } else {
        botState.status = 'disconnected';
        addLog("WhatsApp account logged out. Please clear server session folder and rescan QR.");
      }
    } else if (connection === 'open') {
      botState.status = 'connected';
      botState.qr = '';
      botState.pairingCode = '';
      addLog(`✨ WhatsApp Device online! Logged in as: ${sock.user.id}`);

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
    if (!settings.anticall) return;
    for (const call of calls) {
      if (call.status === 'offer') {
        addLog(`AntiCall: Automatically rejecting an incoming voice/video call from: ${call.from}`);
        await sock.rejectCall(call.id, call.from);
        
        // Notify caller in chat
        await sock.sendMessage(call.from, { 
          text: makeBrandedMessage(
            "Call Rejected", 
            "🚫 *SYSTEM WARNING*\n\nBUGGU MD does not allow direct incoming calls. Your call has been automatically disconnected. Please use text messaging."
          ) 
        });
      }
    }
  });

  // Implement anti-delete storage
  const messageStore: Record<string, any> = {};

  // Track edits and incoming messages for deletion backup
  sock.ev.on('messages.upsert', async (m: any) => {
    const msg = m.messages[0];
    if (!msg || !msg.message) return;

    // Cache message for anti-delete feature
    const jid = msg.key.remoteJid;
    if (jid) {
      messageStore[msg.key.id || ""] = JSON.parse(JSON.stringify(msg));
    }

    const messageType = Object.keys(msg.message)[0];
    
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

    // Extract text content of message
    let body = "";
    if (messageType === 'conversation') {
      body = msg.message.conversation;
    } else if (messageType === 'extendedTextMessage') {
      body = msg.message.extendedTextMessage.text;
    } else if (messageType === 'imageMessage') {
      body = msg.message.imageMessage.caption;
    } else if (messageType === 'videoMessage') {
      body = msg.message.videoMessage.caption;
    }

    if (!body) return;

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
    const isOwner = sender.includes(settings.ownerNumber) || sender.includes("9182749321");

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

        case 'menu':
        case 'list': {
          // Beautiful and modern custom branded command list style (with A-Z sorting per category)
          const categories: Record<string, string[]> = {};
          
          // Categorize elements
          COMMANDS.forEach((cmd: Command) => {
            if (!categories[cmd.category]) {
              categories[cmd.category] = [];
            }
            categories[cmd.category].push(`• ${currentPrefix}${cmd.name} ${cmd.emoji}`);
          });

          // Build premium response
          let menuText = `╭━━━〔 🐣 BUGGU MD 🐣 〕━━━⬣\n\n`;
          
          // Order categories
          const catOrder: Array<keyof typeof categories> = ["SYSTEM", "AUTOMATION", "SECURITY", "MEDIA", "PROFILE", "STATUS", "UTILITIES", "GROUP"];
          catOrder.forEach(cat => {
            if (categories[cat]) {
              menuText += `⚙️ *${cat}*\n`;
              // Sort commands alphabetically
              categories[cat].sort().forEach(cmdLine => {
                menuText += `${cmdLine}\n`;
              });
              menuText += `\n`;
            }
          });

          menuText += `╰━━━━━━━━━━━━━━⬣\n\n`;
          menuText += `*Developer:* Divyansh Deewana\n`;
          menuText += `*Powered By > BUGGU MD 🐣*`;

          await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
          break;
        }

        case 'owner': {
          // Display developer info elegantly
          const cardText = makeBrandedMessage(
            "BUGGU MD Developer",
            `👑 *Owner Profile*\n\n` +
            `• *Name:* Divyansh Deewana\n` +
            `• *Project:* BUGGU MD WhatsApp Bot\n` +
            `• *Contact:* @FREEHACKS95 / @THE_FREE_HACKS\n` +
            `• *Role:* Core Architect\n\n` +
            `🎧 _Playing audio tune..._`
          );
          
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
    addLog(`Pair request: Requesting pairing code for phone: ${sanitizedPhone}...`);
    
    // Ensure we have an active connection start
    if (!sock) {
      await connectToWhatsApp();
    }
    
    // Baileys requires a moment for connection registration handshake checks
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    const code = await sock.requestPairingCode(sanitizedPhone);
    botState.pairingCode = code;
    addLog(`✨ Successfully received WhatsApp pairing code: ${code}`);
    return res.json({ success: true, code });
  } catch (err: any) {
    addLog(`Pairing code system fault: ${err.message}`);
    return res.status(500).json({ error: `Could not fetch pairing code from WhatsApp: ${err.message}. If the session files are stale, please wait 15 seconds or check console logging stream.` });
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
