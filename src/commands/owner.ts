import { Command } from '../types/bot';
import { config } from '../config/config';
import { db } from '../lib/database';

export const ownerCommand: Command = {
  name: 'owner',
  description: 'Displays developer and owner contact details',
  category: 'System',
  aliases: ['creator', 'dev'],
  execute: async ({ sock, remoteJid, msg }) => {
    const ownerNumber = config.ownerNumber || '917014631313';
    const ownerName = config.ownerName || 'Divyansh Deewana';
    const bn = db.data.settings.botname || config.botName || 'BUGGU MD';

    const cleanNumber = ownerNumber.replace(/[^0-9]/g, '');

    const vcard = 'BEGIN:VCARD\n' +
                  'VERSION:3.0\n' +
                  `FN:${ownerName}\n` +  
                  `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:${cleanNumber}\n` + 
                  'END:VCARD';

    try {
      // 1. Send the active interactive vCard for contacts
      await sock.sendMessage(remoteJid, {
        contacts: {
          displayName: ownerName,
          contacts: [{ vcard }]
        }
      }, { quoted: msg as any });

      // 2. Send the owner contact message with beautiful image and details
      const caption = `╭━━〔 *${bn.toUpperCase().replace(/\s+/g, '_')}* 〕━━┈⊷\n` +
                      `┃◈╭─────────────·๏\n` +
                      `┃◈┃• *Here is the owner details*\n` +
                      `┃◈┃• *Name* - ${ownerName}\n` +
                      `┃◈┃• *Number* +${cleanNumber}\n` +
                      `┃◈┃• *Version*: 2.0.0 Beta\n` +
                      `┃◈└───────────┈⊷\n` +
                      `╰──────────────┈⊷\n` +
                      `> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʙᴜɢɢᴜ ᴍᴅ ❣️*`;

      await sock.sendMessage(remoteJid, {
        image: { url: 'https://files.catbox.moe/yj7zp0.png' },
        caption: caption,
        contextInfo: {
          mentionedJid: [`${cleanNumber}@s.whatsapp.net`],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363348739987203@newsletter',
            newsletterName: `*${ownerName}*`,
            serverMessageId: 143
          }
        }
      }, { quoted: msg as any });

      // 3. Send the custom owner audio clip automatically
      await sock.sendMessage(remoteJid, {
        audio: { url: 'https://files.catbox.moe/4fz6jh.mp3' },
        mimetype: 'audio/mp4',
        ptt: true
      }, { quoted: msg as any });

    } catch (error: any) {
      console.error('Owner command error:', error);
      await sock.sendMessage(remoteJid, {
        text: `❌ *Error executing Owner command:* ${error.message || String(error)}`
      }, { quoted: msg as any });
    }
  }
};

export default ownerCommand;
