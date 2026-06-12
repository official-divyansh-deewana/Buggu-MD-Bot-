import { WASocket, proto, downloadContentFromMessage } from '@whiskeysockets/baileys';
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
import buggumdSettingsCommands from '../commands/buggumdSettings';
import groupCommands from '../commands/group';
import downloadCommands from '../commands/downloads';
import converterCommands from '../commands/converter';
import aiCommands from '../commands/ai';
import funCommands from '../commands/fun';
import utilityCommands from '../commands/utility';
import premiumCommands from '../commands/premium';
import ownerActionCommands from '../commands/ownerAction';
import utilityPluginsCommands from '../commands/utilityPlugins';

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
  ...buggumdSettingsCommands,
  ...groupCommands,
  ...downloadCommands,
  ...converterCommands,
  ...aiCommands,
  ...funCommands,
  ...utilityCommands,
  ...premiumCommands,
  ...ownerActionCommands,
  ...utilityPluginsCommands,
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
  mediaType?: 'image' | 'video' | 'sticker' | 'audio' | 'document' | null;
  mediaBuffer?: Buffer | null;
  mimetype?: string | null;
  fileName?: string | null;
}
export const messageHistory = new Map<string, CachedMessage>();

// Memory helper to download WhatsApp media streams securely without leaking memory
async function getMediaBuffer(messageContent: any, type: 'image' | 'video' | 'sticker' | 'audio' | 'document'): Promise<Buffer | null> {
  try {
    const stream = await downloadContentFromMessage(messageContent, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
  } catch (err) {
    console.warn(`[ANTI-DELETE DOWNLOADER] Non-blocking warning downloading media stream:`, err);
    return null;
  }
}

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
    if (remoteJid === 'status@broadcast' || remoteJid === 'status.broadcast') {
      const globalSet = db.data.settings;
      if (globalSet.autostatusview) {
        console.log(`[STATUS] Auto-viewed status from: ${msg.key.participant}`);
        try {
          await sock.readMessages([
            {
              remoteJid: 'status@broadcast',
              id: msg.key.id!,
              participant: msg.key.participant!
            }
          ]);
        } catch (readErr) {
          console.error('Failed to mark status as read:', readErr);
        }

        if (globalSet.autostatusreact) {
          try {
            await sock.relayMessage(
              'status@broadcast',
              {
                reactionMessage: {
                  key: {
                    remoteJid: 'status@broadcast',
                    id: msg.key.id,
                    participant: msg.key.participant || msg.key.remoteJid,
                    fromMe: false
                  },
                  text: '💚'
                }
              },
              {
                messageId: msg.key.id!,
                statusJidList: [msg.key.participant!]
              }
            );
            console.log(`[STATUS] Auto-reacted 💚 to status update.`);
          } catch (reactErr) {
            console.error('Failed to relay status reaction:', reactErr);
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
    if (isDelete) {
      const isGroup = remoteJid.endsWith('@g.us');
      const antiDeleteEnabled = isGroup 
        ? db.getGroup(remoteJid).antidelete 
        : db.data.settings.antidelete;

      if (antiDeleteEnabled) {
        const deletedId = msg.message.protocolMessage?.key?.id || '';
        const originalMessage = messageHistory.get(deletedId);
        
        if (originalMessage) {
          const timestampStr = new Date(originalMessage.timestamp).toLocaleTimeString();
          
          let alertHeader = `🚨 *BUGGU MD ANTI-DELETE INTERCEPTOR* 🚨\n\n` +
            `👥 *Sender:* @${originalMessage.senderJid.split('@')[0]}\n` +
            `⏱ *Time:* ${timestampStr}\n`;

          if (isGroup) {
            alertHeader += `🏫 *Chat:* Group Room\n`;
          } else {
            alertHeader += `👤 *Chat:* Direct Message\n`;
          }

          // Case 1: Restoring Text Message
          if (!originalMessage.mediaType) {
            await sock.sendMessage(remoteJid, {
              text: `${alertHeader}\n📝 *Original Message:* \n"${originalMessage.text || ''}"\n\n_Restored automatically by BUGGU MD Anti-Delete._`,
              mentions: [originalMessage.senderJid],
            });
          } else {
            // Case 2: Restoring Media
            try {
              if (originalMessage.mediaType === 'image' && originalMessage.mediaBuffer) {
                await sock.sendMessage(remoteJid, {
                  image: originalMessage.mediaBuffer,
                  caption: `${alertHeader}\n📝 *Caption:* \n"${originalMessage.text || ''}"\n\n_Restored automatically by BUGGU MD Anti-Delete._`,
                  mentions: [originalMessage.senderJid],
                });
              } else if (originalMessage.mediaType === 'video' && originalMessage.mediaBuffer) {
                await sock.sendMessage(remoteJid, {
                  video: originalMessage.mediaBuffer,
                  caption: `${alertHeader}\n📝 *Caption:* \n"${originalMessage.text || ''}"\n\n_Restored automatically by BUGGU MD Anti-Delete._`,
                  mentions: [originalMessage.senderJid],
                });
              } else if (originalMessage.mediaType === 'sticker' && originalMessage.mediaBuffer) {
                await sock.sendMessage(remoteJid, {
                  text: `${alertHeader}\n_Self-healed Sticker attachment retrieved below:_`,
                  mentions: [originalMessage.senderJid],
                });
                await sock.sendMessage(remoteJid, {
                  sticker: originalMessage.mediaBuffer
                });
              } else if (originalMessage.mediaType === 'audio' && originalMessage.mediaBuffer) {
                await sock.sendMessage(remoteJid, {
                  text: `${alertHeader}\n_Self-healed Voice Note attachment retrieved below:_`,
                  mentions: [originalMessage.senderJid],
                });
                await sock.sendMessage(remoteJid, {
                  audio: originalMessage.mediaBuffer,
                  mimetype: originalMessage.mimetype || 'audio/ogg; codecs=opus',
                  ptt: true
                });
              } else if (originalMessage.mediaType === 'document' && originalMessage.mediaBuffer) {
                await sock.sendMessage(remoteJid, {
                  document: originalMessage.mediaBuffer,
                  mimetype: originalMessage.mimetype || 'application/octet-stream',
                  fileName: originalMessage.fileName || 'file',
                  caption: `${alertHeader}\n📝 *Document Caption:* \n"${originalMessage.text || ''}"\n\n_Restored automatically by BUGGU MD._`,
                  mentions: [originalMessage.senderJid]
                });
              } else {
                await sock.sendMessage(remoteJid, {
                  text: `${alertHeader}\n📝 *Deleted ${originalMessage.mediaType}:* Media buffer was unavailable.\n\n_Restored by BUGGU MD._`,
                  mentions: [originalMessage.senderJid],
                });
              }
            } catch (mediaSendErr) {
              console.error('[ANTI-DELETE] Failed to dispatch restored media message:', mediaSendErr);
              await sock.sendMessage(remoteJid, {
                text: `${alertHeader}\n⚠️ *Failed to dispatch media attachment:* ${mediaSendErr instanceof Error ? mediaSendErr.message : String(mediaSendErr)}\n\n📝 *Original Caption/Text:* "${originalMessage.text || ''}"`,
                mentions: [originalMessage.senderJid],
              });
            }
          }
        }
      }
    }

    // G. Prefix routing and parser
    const prefix = db.data.settings.prefix || config.prefix;
    const isCommand = body.trim().startsWith(prefix);

    // Reject loop feedback if sent by self, unless it is a command prefix trigger
    if (msg.key.fromMe && !isCommand) return;

    // D. Cache standard message into history with media streaming
    if (msg.key.id) {
      let textContent = body;
      let mType: 'image' | 'video' | 'sticker' | 'audio' | 'document' | null = null;
      let mBuffer: Buffer | null = null;
      let mime: string | null = null;
      let fName: string | null = null;

      const m = msg.message;
      if (m) {
        if (m.imageMessage) {
          mType = 'image';
          mime = m.imageMessage.mimetype || 'image/jpeg';
          textContent = m.imageMessage.caption || '';
          mBuffer = await getMediaBuffer(m.imageMessage, 'image');
        } else if (m.videoMessage) {
          mType = 'video';
          mime = m.videoMessage.mimetype || 'video/mp4';
          textContent = m.videoMessage.caption || '';
          mBuffer = await getMediaBuffer(m.videoMessage, 'video');
        } else if (m.stickerMessage) {
          mType = 'sticker';
          mime = m.stickerMessage.mimetype || 'image/webp';
          mBuffer = await getMediaBuffer(m.stickerMessage, 'sticker');
        } else if (m.audioMessage) {
          mType = 'audio';
          mime = m.audioMessage.mimetype || 'audio/ogg; codecs=opus';
          mBuffer = await getMediaBuffer(m.audioMessage, 'audio');
        } else if (m.documentMessage) {
          mType = 'document';
          mime = m.documentMessage.mimetype || 'application/octet-stream';
          fName = m.documentMessage.fileName || 'file';
          textContent = m.documentMessage.caption || '';
          mBuffer = await getMediaBuffer(m.documentMessage, 'document');
        }
      }

      messageHistory.set(msg.key.id, {
        text: textContent,
        senderName,
        senderJid: cleanSender,
        timestamp: Date.now(),
        mediaType: mType,
        mediaBuffer: mBuffer,
        mimetype: mime,
        fileName: fName,
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
