import { Command } from '../types/bot';
import { db } from '../lib/database';
import { config } from '../config/config';

const ownerActionCommands: Command[] = [
  {
    name: 'restart',
    description: 'Safely restart the WhatsApp Bot Node process (Owner only)',
    category: 'Owner',
    execute: async ({ reply, isOwner }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied:* Only bot owners can execute system process restarts.');
        return;
      }

      await reply('🔄 *BUGGU MD DAEMON DISPATCHER:* Saving local files and terminating process. Auto-scaler wrapper will boot bot up again inside 2 seconds...');
      
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }
  },
  {
    name: 'shutdown',
    description: 'Permanently shutdown the Bot sequence (Owner only)',
    category: 'Owner',
    execute: async ({ reply, isOwner }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied:* Bot owners only.');
        return;
      }

      await reply('💤 *BUGGU MD DAEMON SHUTDOWN:* Silencing socket, wiping caching structures, and shutting down service permanently.');
      
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  },
  {
    name: 'broadcast',
    description: 'Broadcast a bulletin announcement to all active groups (Owner only)',
    category: 'Owner',
    aliases: ['bc'],
    execute: async ({ reply, args, isOwner, sock }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied:* Owners only.');
        return;
      }

      const announcementText = args.join(' ');
      if (!announcementText) {
        await reply('❌ *Broadcast parameter empty:* Please type words to broadcast.');
        return;
      }

      const groups = Object.keys(db.data.groups);
      if (groups.length === 0) {
        await reply('❌ *Broadcaster Error:* No active group workspaces registered inside database nodes.');
        return;
      }

      await reply(`📡 *Broadcasting broadcast packet to ${groups.length} workspaces...*`);

      let completed = 0;
      for (const groupId of groups) {
        try {
          await sock.sendMessage(groupId, {
            text: `📡 *BUGGU MD OWNER BROADCAST BULLETIN* 📢\n\n${announcementText}\n\n_Distributed automatically by owner Divyansh Deewana._`
          });
          completed++;
        } catch (err) {
          console.error(`Failed to broadcast to Jid: ${groupId}`, err);
        }
      }

      await reply(`✅ *Broadcast task completed!* Transmitted content to *${completed}/${groups.length}* groups.`);
    }
  },
  {
    name: 'block',
    description: 'Add a phone number to WhatsApp blocks log (Owner only)',
    category: 'Owner',
    execute: async ({ reply, args, isOwner, sock, msg }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied.*');
        return;
      }

      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
      let targetJid = mentions[0] || quotedParticipant;

      if (!targetJid && args[0]) {
        const cleanStr = args[0].replace(/[^0-9]/g, '');
        if (cleanStr.length >= 9) targetJid = `${cleanStr}@s.whatsapp.net`;
      }

      if (!targetJid) {
        await reply('❌ Mention contact to block.');
        return;
      }

      try {
        await sock.updateBlockStatus(targetJid, 'block');
        await reply(`🔒 *Socket blockade confirmed:* Blocked @${targetJid.split('@')[0]}`, { mentions: [targetJid] });
      } catch (err: any) {
        await reply(`❌ *Block error:* ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'unblock',
    description: 'Remove high-level WhatsApp contact block (Owner only)',
    category: 'Owner',
    execute: async ({ reply, args, isOwner, sock, msg }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied.*');
        return;
      }

      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
      let targetJid = mentions[0] || quotedParticipant;

      if (!targetJid && args[0]) {
        const cleanStr = args[0].replace(/[^0-9]/g, '');
        if (cleanStr.length >= 9) targetJid = `${cleanStr}@s.whatsapp.net`;
      }

      if (!targetJid) {
        await reply('❌ Mention contact to unblock.');
        return;
      }

      try {
        await sock.updateBlockStatus(targetJid, 'unblock');
        await reply(`🔓 *Socket blockade released:* Unblocked @${targetJid.split('@')[0]}`, { mentions: [targetJid] });
      } catch (err: any) {
        await reply(`❌ *Unblock error:* ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'leavegc',
    description: 'Instruct bot client to safely leave group chat workspace (Owner only)',
    category: 'Owner',
    execute: async ({ reply, isOwner, sock, remoteJid }) => {
      if (!isOwner) {
        await reply('❌ *Owner privilege required.*');
        return;
      }

      if (!remoteJid.endsWith('@g.us')) {
        await reply('❌ Command can only be triggered inside a group.');
        return;
      }

      await reply('🚪 *Leaving group chat room as commanded...* Goodbye!');
      await sock.groupLeave(remoteJid);
    }
  },
  {
    name: 'join',
    description: 'Command WhatsApp Bot client to join a group via invite link (Owner only)',
    category: 'Owner',
    execute: async ({ reply, args, isOwner, sock }) => {
      if (!isOwner) {
        await reply('❌ *Owner privilege required.*');
        return;
      }

      const link = args[0];
      if (!link) {
        await reply('❌ Provide a valid group link to join. Example:\n`.join https://chat.whatsapp.com/CodeHere`');
        return;
      }

      try {
        const code = link.split('chat.whatsapp.com/')[1];
        if (!code) {
          await reply('❌ *Invalid URL Form:* Unable to parse invite code token.');
          return;
        }

        await sock.groupAcceptInvite(code);
        await reply('✅ *Invite accepted:* Group joined successfully!');
      } catch (err: any) {
        await reply(`❌ Failed to join group: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'setppbot',
    description: 'Set custom bot Profile Photo (Owner only)',
    category: 'Owner',
    execute: async ({ reply, isOwner }) => {
      if (!isOwner) {
        await reply('❌ *Owner privilege required.*');
        return;
      }
      await reply('🖼️ *Profile Picture Update:* To change, reply to any image chat message with `.setppbot`.');
    }
  },
  {
    name: 'setbotname',
    description: 'Reprogram bot label identity name (Owner only)',
    category: 'Owner',
    execute: async ({ reply, args, isOwner }) => {
      if (!isOwner) {
        await reply('❌ *Owner privilege required.*');
        return;
      }

      const name = args.join(' ');
      if (!name) {
        await reply('❌ Provide a dynamic BOT name.');
        return;
      }

      db.data.settings.botname = name;
      db.save();
      config.botName = name;

      await reply(`🤖 *Identity Updated:* Bot name is renamed to: *${name}* successfully! Updates saved.`);
    }
  },
  {
    name: 'setprefix',
    description: 'Reconfigure command prefix triggers directly (Owner only)',
    category: 'Owner',
    execute: async ({ reply, args, isOwner }) => {
      if (!isOwner) {
        await reply('❌ *Owner privilege required.*');
        return;
      }

      const prefix = args[0];
      if (!prefix || prefix.length > 2) {
        await reply('❌ Provide a valid single character or double character prefix trigger (e.g. `.` or `!`).');
        return;
      }

      db.data.settings.prefix = prefix;
      db.save();
      config.prefix = prefix;

      await reply(`⚡ *Command Prefix Updated:* Triggers re-aligned to \`${prefix}\`. Try executing commands using \`${prefix}menu\`.`);
    }
  }
];

export default ownerActionCommands;
