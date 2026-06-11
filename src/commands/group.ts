import { Command } from '../types/bot';
import { db } from '../lib/database';

const assertAdminAndBotAdmin = async (
  sock: any,
  remoteJid: string,
  sender: string,
  isOwner: boolean,
  reply: any
): Promise<{ participants: any[]; isAdmin: boolean; isBotAdmin: boolean } | null> => {
  if (!remoteJid.endsWith('@g.us')) {
    await reply('❌ *Workspace Constraint:* This command can only be executed within a valid group chat context.');
    return null;
  }

  try {
    const meta = await sock.groupMetadata(remoteJid);
    const participants = meta.participants || [];
    
    const cleanSender = sender.split(':')[0] + '@s.whatsapp.net';
    const senderObj = participants.find((p: any) => p.id === cleanSender || p.id === sender);
    const isSenderAdmin = senderObj?.admin === 'admin' || senderObj?.admin === 'superadmin' || isOwner;

    const cleanBot = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
    const botObj = participants.find((p: any) => p.id === cleanBot);
    const isBotAdmin = botObj?.admin === 'admin' || botObj?.admin === 'superadmin';

    return { participants, isAdmin: isSenderAdmin, isBotAdmin };
  } catch (err) {
    console.error('Failed to resolve group participants/metadata:', err);
    await reply('❌ *System Exception:* Failed to audit workspace parameters. Ensure I am still a member inside this chat.');
    return null;
  }
};

const extractUserJid = (args: string[], msg: any): string | null => {
  // Check if tagged/mentioned
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length > 0) return mentions[0];

  // Check if replied to message
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;

  // Check if numerical phone input in args
  if (args.length > 0) {
    const cleanNumber = args[0].replace(/[^0-9]/g, '');
    if (cleanNumber.length >= 9) {
      return `${cleanNumber}@s.whatsapp.net`;
    }
  }

  return null;
};

const groupCommands: Command[] = [
  {
    name: 'tagall',
    description: 'Mention everyone in the current group workspace',
    category: 'Group',
    execute: async ({ sock, remoteJid, reply, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Group administrative privileges are required to mention all members.');
        return;
      }

      const listString = audited.participants.map((p, idx) => `${idx + 1}. @${p.id.split('@')[0]}`).join('\n');
      const mentions = audited.participants.map((p) => p.id);

      await sock.sendMessage(remoteJid, {
        text: `📢 *WORKSPACE BROADCAST MENTION*\n\n${listString}\n\n_Execute on-demand by Administrators._`,
        mentions,
      });
    }
  },
  {
    name: 'hidetag',
    description: 'Send a hidden tag announcement message',
    category: 'Group',
    execute: async ({ sock, remoteJid, reply, args, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Group administrators only.');
        return;
      }

      const text = args.join(' ') || '📢 Attention everyone!';
      const mentions = audited.participants.map((p) => p.id);

      await sock.sendMessage(remoteJid, {
        text,
        mentions,
      });
    }
  },
  {
    name: 'invitelink',
    description: 'Fetch the active invite URL link of this group',
    category: 'Group',
    execute: async ({ sock, remoteJid, reply, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isBotAdmin) {
        await reply('❌ *Action Impossibility:* I require group administrative permissions to request invite links.');
        return;
      }

      try {
        const code = await sock.groupInviteCode(remoteJid);
        const link = `https://chat.whatsapp.com/${code}`;
        await reply(`🔗 *Group Invite Link Lookup:*\n\n${link}`);
      } catch (err: any) {
        await reply(`❌ *Operation Failed:* Unable to fetch invite link. Error: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'group',
    description: 'Lock or unlock the group chat configuration (open/close)',
    category: 'Group',
    execute: async ({ sock, remoteJid, reply, args, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Group administrator privilege is required.');
        return;
      }
      if (!audited.isBotAdmin) {
        await reply('❌ *Action Impossibility:* I must be an administrator to lock or unlock this room.');
        return;
      }

      const action = args[0]?.toLowerCase();
      if (action === 'open') {
        await sock.groupSettingUpdate(remoteJid, 'not_announcement');
        await reply('🔓 *Group Settings Configured:* The workspace is now unlocked. All cached members are permitted to post.');
      } else if (action === 'close') {
        await sock.groupSettingUpdate(remoteJid, 'announcement');
        await reply('🔒 *Group Settings Configured:* The workspace is locked. Only administrators are allowed to post messages.');
      } else {
        await reply('❌ *Syntax Error:* Use `.group open` or `.group close`.');
      }
    }
  },
  {
    name: 'promote',
    description: 'Promote a chat member to Group Administrator status',
    category: 'Group',
    execute: async ({ sock, msg, remoteJid, reply, args, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Administrative rights requested.');
        return;
      }
      if (!audited.isBotAdmin) {
        await reply('❌ *I am not Admin:* Please promote me first.');
        return;
      }

      const targetJid = extractUserJid(args, msg);
      if (!targetJid) {
        await reply('❌ *Error:* Please tag or mention the user, reply to their message, or specify their number.');
        return;
      }

      try {
        await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'promote');
        await reply(`👑 @${targetJid.split('@')[0]} has been successfully promoted to administrator status.`, { mentions: [targetJid] });
      } catch (err: any) {
        await reply(`❌ *Operation Failed:* ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'demote',
    description: 'Demote an administrator back to standard member status',
    category: 'Group',
    execute: async ({ sock, msg, remoteJid, reply, args, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Group administrators only.');
        return;
      }
      if (!audited.isBotAdmin) {
        await reply('❌ *I am not Admin:* Please promote me first.');
        return;
      }

      const targetJid = extractUserJid(args, msg);
      if (!targetJid) {
        await reply('❌ *Error:* Tag or mention target user to demote.');
        return;
      }

      try {
        await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'demote');
        await reply(`⚠️ @${targetJid.split('@')[0]} was demoted from administrator role.`, { mentions: [targetJid] });
      } catch (err: any) {
        await reply(`❌ *Operation Failed:* ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'kick',
    description: 'Remove/kick a workspace member',
    category: 'Group',
    execute: async ({ sock, msg, remoteJid, reply, args, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Administrator rights required.');
        return;
      }
      if (!audited.isBotAdmin) {
        await reply('❌ *I am not Admin:* Please promote me.');
        return;
      }

      const targetJid = extractUserJid(args, msg);
      if (!targetJid) {
        await reply('❌ *Error:* Tag or mention target user to kick.');
        return;
      }

      try {
        await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'remove');
        await reply(`🚪 Removed @${targetJid.split('@')[0]} from this chat workspace.`, { mentions: [targetJid] });
      } catch (err: any) {
        await reply(`❌ *Operation Failed:* ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'add',
    description: 'Add or invite a number to the group',
    category: 'Group',
    execute: async ({ sock, msg, remoteJid, reply, args, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Administrators only.');
        return;
      }
      if (!audited.isBotAdmin) {
        await reply('❌ *I am not Admin.*');
        return;
      }

      const targetJid = extractUserJid(args, msg);
      if (!targetJid) {
        await reply('❌ *Error:* Specify phone number to invite or add.');
        return;
      }

      try {
        await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
        await reply(`✅ Added @${targetJid.split('@')[0]} to this chat.`, { mentions: [targetJid] });
      } catch (err: any) {
        await reply(`❌ *Operation Failed:* Users may have security filters requiring direct link invites. Error: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'mute',
    description: 'Quick lock for group conversation flow',
    category: 'Group',
    execute: async ({ sock, remoteJid, reply, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied.*');
        return;
      }
      if (!audited.isBotAdmin) {
        await reply('❌ *Missing Rights.*');
        return;
      }

      await sock.groupSettingUpdate(remoteJid, 'announcement');
      await reply('🔒 *Conversation Silenced:* Space muted. Only administrators are allowed to message.');
    }
  },
  {
    name: 'unmute',
    description: 'Quick unlock group conversation flow',
    category: 'Group',
    execute: async ({ sock, remoteJid, reply, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied.*');
        return;
      }
      if (!audited.isBotAdmin) {
        await reply('❌ *Missing Rights.*');
        return;
      }

      await sock.groupSettingUpdate(remoteJid, 'not_announcement');
      await reply('🔓 *Conversation Restored:* Space unsilenced. All members can message.');
    }
  },
  {
    name: 'warn',
    description: 'Warn a group member for violation. (Triggers kick at 3 warnings)',
    category: 'Group',
    execute: async ({ sock, msg, remoteJid, reply, args, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Administrators only.');
        return;
      }

      const targetJid = extractUserJid(args, msg);
      if (!targetJid) {
        await reply('❌ *Error:* Tag, mention, or reply to someone to warn them.');
        return;
      }

      const groupData = db.getGroup(remoteJid);
      const currentWarns = groupData.warns[targetJid] || 0;
      const nextWarns = currentWarns + 1;

      groupData.warns[targetJid] = nextWarns;
      db.save();

      if (nextWarns >= 3) {
        await reply(`🚨 *Warning Threshold Exceeded (3/3):* @${targetJid.split('@')[0]} has been kicked out of the group.`, { mentions: [targetJid] });
        if (audited.isBotAdmin) {
          try {
            await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'remove');
          } catch (err) {
            await reply('❌ Failed to execute participant removal. Make sure I am group administrator.');
          }
        } else {
          await reply('⚠️ I am not administrator. Please remove this user manually.');
        }
      } else {
        await reply(`⚠️ *WORKSPACE WARNING ISSUED (Warning ${nextWarns}/3):* @${targetJid.split('@')[0]} has been warned for server violation. Play nice!`, { mentions: [targetJid] });
      }
    }
  },
  {
    name: 'unwarn',
    description: 'Reset warning counters of a user',
    category: 'Group',
    execute: async ({ sock, msg, remoteJid, reply, args, sender, isOwner }) => {
      const audited = await assertAdminAndBotAdmin(sock, remoteJid, sender, isOwner, reply);
      if (!audited) return;

      if (!audited.isAdmin) {
        await reply('❌ *Access Denied:* Group administrative privilege required.');
        return;
      }

      const targetJid = extractUserJid(args, msg);
      if (!targetJid) {
        await reply('❌ *Error:* Tag or mention target user to unwarn.');
        return;
      }

      const groupData = db.getGroup(remoteJid);
      groupData.warns[targetJid] = 0;
      db.save();

      await reply(`✅ *Warnings Cleared:* @${targetJid.split('@')[0]} warnings have been reset to 0.`, { mentions: [targetJid] });
    }
  },
  {
    name: 'warnings',
    description: 'List outstanding warnings of a user',
    category: 'Group',
    execute: async ({ sock, msg, remoteJid, reply, args, sender, isOwner }) => {
      const isGroup = remoteJid.endsWith('@g.us');
      if (!isGroup) {
        await reply('❌ Run this in a group chat.');
        return;
      }

      const targetJid = extractUserJid(args, msg) || sender;
      const groupData = db.getGroup(remoteJid);
      const warns = groupData.warns[targetJid] || 0;

      await reply(`📊 *Warning Tally Profile:* @${targetJid.split('@')[0]} has *${warns}/3* active violations on record.`, { mentions: [targetJid] });
    }
  },
];

export default groupCommands;
