import { Command } from '../types/bot';
import { db } from '../lib/database';

const premiumCommands: Command[] = [
  {
    name: 'addpremium',
    description: 'Grant Premium privileges to a user (Owner only)',
    category: 'Owner',
    execute: async ({ reply, args, isOwner, msg }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied:* Only bot owners are authorized to manage premium subscription lists.');
        return;
      }

      // Check mentions or input
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
      
      let targetJid = mentions[0] || quotedParticipant;
      if (!targetJid && args[0]) {
        const cleanNo = args[0].replace(/[^0-9]/g, '');
        if (cleanNo.length >= 9) {
          targetJid = `${cleanNo}@s.whatsapp.net`;
        }
      }

      if (!targetJid) {
        await reply('❌ *Usage Error:* Tag or mention a contact, or provide their phone number.\nExample:\n`.addpremium @user`');
        return;
      }

      db.addPremium(targetJid);
      await reply(`👑 *PREMIUM STATUS GRANTED:* @${targetJid.split('@')[0]} has been enrolled into premium status tiers successfully!`, {
        mentions: [targetJid],
      });
    }
  },
  {
    name: 'delpremium',
    description: 'Revoke Premium privileges from a user (Owner only)',
    category: 'Owner',
    execute: async ({ reply, args, isOwner, msg }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied:* Bot owners only.');
        return;
      }

      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
      
      let targetJid = mentions[0] || quotedParticipant;
      if (!targetJid && args[0]) {
        const cleanNo = args[0].replace(/[^0-9]/g, '');
        if (cleanNo.length >= 9) {
          targetJid = `${cleanNo}@s.whatsapp.net`;
        }
      }

      if (!targetJid) {
        await reply('❌ *Usage:* Tag or mention target contact.');
        return;
      }

      db.removePremium(targetJid);
      await reply(`🚪 *PREMIUM STATUS REVOKED:* @${targetJid.split('@')[0]} premium status tiers have been terminated.`, {
        mentions: [targetJid],
      });
    }
  },
  {
    name: 'premiumlist',
    description: 'Display all enrolled premium contacts',
    category: 'Premium',
    execute: async ({ reply, sock, remoteJid }) => {
      const plist = db.data.premium;
      if (plist.length === 0) {
        await reply('👑 *Premium Subscription Registry:* There are currently no users enrolled in the premium log.');
        return;
      }

      const strList = plist.map((id, idx) => `👑 ${idx + 1}. @${id.split('@')[0]}`).join('\n');
      await sock.sendMessage(remoteJid, {
        text: `👑 *BUGGU MD PREMIUM SUBSCRIBER LEDGER*\n\n${strList}\n\n_System audits active._`,
        mentions: plist,
      });
    }
  },
  {
    name: 'checkpremium',
    description: 'Audit if you or a target member is premium subscriber',
    category: 'Premium',
    execute: async ({ reply, msg, sender }) => {
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const targetJid = mentions[0] || quotedParticipant || sender;

      const cleanTarget = targetJid.split(':')[0] + '@s.whatsapp.net';
      const sitsPremium = db.isPremium(cleanTarget);

      await reply(
        sitsPremium
          ? `👑 *Roster Audit:* @${cleanTarget.split('@')[0]} holds an active *PREMIUM LEVEL* subscription tier.`
          : `👥 *Roster Audit:* @${cleanTarget.split('@')[0]} is currently running standard free-tier conversation threads.`,
        { mentions: [cleanTarget] }
      );
    }
  }
];

export default premiumCommands;
