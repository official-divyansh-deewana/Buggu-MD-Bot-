import { WASocket, proto } from '@whiskeysockets/baileys';
import { Command, CommandContext } from '../types/bot';
import { config } from '../config/config';
import { db } from '../lib/database';

// Import basic commands
import menuCommand from '../commands/menu';
import ownerCommand from '../commands/owner';
import pingCommand from '../commands/ping';
import aliveCommand from '../commands/alive';
import helpCommand from '../commands/help';
import aboutCommand from '../commands/about';
import runtimeCommand from '../commands/runtime';
import versionCommand from '../commands/version';
import settingsCommand from '../commands/settings';
import creditsCommand from '../commands/credits';
import statusCommand from '../commands/status';

// Import category command lists
import settingsToggleCommands from '../commands/settingsToggle';
import groupCommands from '../commands/group';
import downloadCommands from '../commands/downloads';
import converterCommands from '../commands/converter';
import aiCommands from '../commands/ai';
import funCommands from '../commands/fun';
import utilityCommands from '../commands/utility';
import premiumCommands from '../commands/premium';
import ownerActionCommands from '../commands/ownerAction';

// Compile full list of commands
const commandList: Command[] = [
  menuCommand,
  ownerCommand,
  pingCommand,
  aliveCommand,
  helpCommand,
  aboutCommand,
  runtimeCommand,
  versionCommand,
  settingsCommand,
  creditsCommand,
  statusCommand,
  ...settingsToggleCommands,
  ...groupCommands,
  ...downloadCommands,
  ...converterCommands,
  ...aiCommands,
  ...funCommands,
  ...utilityCommands,
  ...premiumCommands,
  ...ownerActionCommands,
];

// Initialize lookup maps
const commands = new Map<string, Command>();
const aliases = new Map<string, Command>();

for (const cmd of commandList) {
  commands.set(cmd.name.toLowerCase(), cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      aliases.set(alias.toLowerCase(), cmd);
    }
  }
}

// In-memory message store for Anti-Delete mechanism
export interface CachedMessage {
  text: string;
  senderName: string;
  senderJid: string;
  timestamp: number;
}
export const messageHistory = new Map<string, CachedMessage>();

// Memory array to keep track of recently run command logs for the dashboard
export interface CommandLog {
  command: string;
  sender: string;
  timestamp: string;
  success: boolean;
}
export const recentCommandLogs: CommandLog[] = [];

// Badword filter list
const badWordsList = ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick'];

export async function handleMessage(sock: WASocket, msg: proto.IWebMessageInfo) {
  try {
    const remoteJid = msg.key.remoteJid || '';
    if (!remoteJid) return;

    // A. Hook 1: Handle Auto Status View & Status Reactions
    if (remoteJid === 'status.broadcast') {
      const globalSet = db.data.settings;
      if (globalSet.autostatusview) {
        console.log(`[STATUS] Auto-viewed status from: ${msg.key.participant}`);
        await sock.readMessages([msg.key]);

        if (globalSet.autostatusreact) {
          const statusEmojis = ['🔥', '❤️', '👀', '👍', '💯', '✨'];
          const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
          try {
            await sock.sendMessage(remoteJid, {
              react: { text: randomEmoji, key: msg.key }
            }, { statusJidList: [msg.key.participant!] });
            console.log(`[STATUS] Auto-reacted ${randomEmoji} to status.`);
          } catch (reactErr) {
            console.error('Failed to auto-react to status:', reactErr);
          }
        }
      }
      return;
    }

    // Reject message if it does not have payload
    if (!msg.message) return;

    // C. Get text body of message
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      '';

    const sender = msg.key.participant || msg.key.remoteJid || '';
    const cleanSender = sender.split(':')[0] + '@s.whatsapp.net';
    const senderName = msg.pushName || 'User';

    // Log incoming message metadata for deployment logs and monitoring
    console.log(`[MESSAGE] Incoming: ${body ? `"${body}"` : '[Media/System Message]'} from: ${senderName} (${cleanSender}) | JID: ${remoteJid}`);

    // B. Hook 2: Capture deleted messages for Anti-Delete logs
    const isDelete = msg.message.protocolMessage?.type === 0;
    if (isDelete && remoteJid.endsWith('@g.us')) {
      const dbGroup = db.getGroup(remoteJid);
      if (dbGroup.antidelete) {
        const deletedId = msg.message.protocolMessage?.key?.id || '';
        const originalMessage = messageHistory.get(deletedId);
        
        if (originalMessage) {
          const timestampStr = new Date(originalMessage.timestamp).toLocaleTimeString();
          await sock.sendMessage(remoteJid, {
            text: `🚨 *ANTI-DELETE INTERCEPTOR* 🚨\n\n👥 *Sender:* @${originalMessage.senderJid.split('@')[0]}\n⏱️ *Sent Time:* ${timestampStr}\n\n📝 *Original Message:* \n"${originalMessage.text}"\n\n_Restored automatically by BUGGU MD Anti-Delete._`,
            mentions: [originalMessage.senderJid],
          });
        }
      }
    }

    // G. Prefix routing and parser
    const prefix = db.data.settings.prefix || config.prefix;
    const isCommand = body.trim().startsWith(prefix);

    // Reject loop feedback if sent by self, unless it is a command prefix trigger
    if (msg.key.fromMe && !isCommand) return;

    // D. Cache standard message into history
    if (body && msg.key.id) {
      messageHistory.set(msg.key.id, {
        text: body,
        senderName,
        senderJid: cleanSender,
        timestamp: Date.now(),
      });

      // Keep cache size low
      if (messageHistory.size > 500) {
        const firstKey = messageHistory.keys().next().value;
        if (firstKey) messageHistory.delete(firstKey);
      }
    }

    // E. Hook 3: Global Presence Options
    const globalSet = db.data.settings;
    if (globalSet.alwaysonline) {
      await sock.sendPresenceUpdate('available');
    }
    if (body && globalSet.autoread) {
      await sock.readMessages([msg.key]);
    }
    if (body && globalSet.autotyping) {
      await sock.sendPresenceUpdate('composing', remoteJid);
    }
    if (body && globalSet.autorecording) {
      await sock.sendPresenceUpdate('recording', remoteJid);
    }
    if (body && globalSet.autoreact) {
      const reactEmojis = ['🤖', '👍', '❤️', '🔥', '✨', '⚡'];
      const chosenReact = reactEmojis[Math.floor(Math.random() * reactEmojis.length)];
      await sock.sendMessage(remoteJid, { react: { text: chosenReact, key: msg.key } });
    }

    // F. Hook 4: Group protections (Anti-link / Anti-badword)
    const isGroup = remoteJid.endsWith('@g.us');
    const isOwner = msg.key.fromMe || cleanSender.includes(config.ownerNumber) || config.ownerNumber.includes(cleanSender.split('@')[0]);

    if (isGroup && !isOwner) {
      const dbGroup = db.getGroup(remoteJid);
      
      // I. Anti-Link
      if (dbGroup.antilink) {
        const hasLink = /(https?:\/\/[^\s]+|chat\.whatsapp\.com\/[^\s]+|wa\.me\/[^\s]+)/gi.test(body);
        if (hasLink) {
          // Check if sender is admin
          try {
            const meta = await sock.groupMetadata(remoteJid);
            const participants = meta.participants || [];
            const isSenderAdmin = participants.find((p) => p.id === cleanSender)?.admin;
            
            if (!isSenderAdmin) {
              await sock.sendMessage(remoteJid, {
                text: `🚫 *ANTI-LINK TRIGGERED:* @${cleanSender.split('@')[0]}, URL links are prohibited inside this group. Deleting message...`,
                mentions: [cleanSender]
              });
              await sock.sendMessage(remoteJid, { delete: msg.key });
              return;
            }
          } catch (auditErr) {
            console.error('Failed to run antilink admin check:', auditErr);
          }
        }
      }

      // II. Anti-Badword
      if (dbGroup.antibadword) {
        const lowerBody = body.toLowerCase();
        const hasBadWord = badWordsList.some((word) => lowerBody.includes(word));
        
        if (hasBadWord) {
          try {
            const meta = await sock.groupMetadata(remoteJid);
            const participants = meta.participants || [];
            const isSenderAdmin = participants.find((p) => p.id === cleanSender)?.admin;

            if (!isSenderAdmin) {
              // Increase warnings
              const currentWarns = dbGroup.warns[cleanSender] || 0;
              const nextWarns = currentWarns + 1;
              dbGroup.warns[cleanSender] = nextWarns;
              db.save();

              await sock.sendMessage(remoteJid, {
                text: `🚫 *BADWORD SCANNED:* @${cleanSender.split('@')[0]}, obscene vocabulary is restricted here. Deleting message... (Warning ${nextWarns}/3)`,
                mentions: [cleanSender]
              });
              
              await sock.sendMessage(remoteJid, { delete: msg.key });

              if (nextWarns >= 3) {
                await sock.sendMessage(remoteJid, {
                  text: `🚨 @${cleanSender.split('@')[0]} has been warned 3 times for obscenities. Removing user...`,
                  mentions: [cleanSender]
                });
                await sock.groupParticipantsUpdate(remoteJid, [cleanSender], 'remove');
              }
              return;
            }
          } catch (auditErr) {
            console.error('Failed anti-badwords execution:', auditErr);
          }
        }
      }
    }

    // G. Prefix routing and parser
    const trimmedBody = body.trim();
    if (!trimmedBody.startsWith(prefix)) return;

    const noPrefixBody = trimmedBody.slice(prefix.length).trim();
    const parts = noPrefixBody.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Lookup command
    const cmd = commands.get(commandName) || aliases.get(commandName);
    if (!cmd) return;

    // Build reply context helper
    const reply = async (text: string, options: any = {}) => {
      return sock.sendMessage(remoteJid, { text, ...options }, { quoted: msg as any });
    };

    const newLog: CommandLog = {
      command: prefix + commandName + (args.length ? ' ' + args.join(' ') : ''),
      sender: senderName,
      timestamp: new Date().toLocaleTimeString(),
      success: true,
    };

    // Execute
    try {
      await cmd.execute({
        sock,
        msg,
        remoteJid,
        args,
        fullText: noPrefixBody,
        sender: cleanSender,
        senderName,
        isOwner,
        reply,
      });
      recentCommandLogs.unshift(newLog);
    } catch (cmdError) {
      console.error(`[BUGGU MD Error in cmd ${commandName}]:`, cmdError);
      newLog.success = false;
      recentCommandLogs.unshift(newLog);
      await reply(`❌ *Execution Interruption:* ${cmdError instanceof Error ? cmdError.message : String(cmdError)}`);
    }

    if (recentCommandLogs.length > 20) {
      recentCommandLogs.pop();
    }

  } catch (err) {
    console.error('[BUGGU MD Global Handler Error]', err);
  }
}
