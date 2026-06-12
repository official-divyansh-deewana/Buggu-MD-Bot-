import { Command } from '../types/bot';
import { config } from '../config/config';

export const ownerCommand: Command = {
  name: 'owner',
  description: 'Displays developer and owner information',
  category: 'info',
  aliases: ['creator', 'dev'],
  execute: async ({ sock, remoteJid, msg }) => {
    const ownerName = '𓆩〭〬🐣⃪⃮⃔⃝꯭꯭〬ꯦ꯭꯭Ꭷɣ֯֯፝֟͠ɛ 𝐁սԍ͢ԍ𝛖';
    const ownerNumber = config.ownerNumber;

    // Send owner contact vcard
    const vcard = 'BEGIN:VCARD\n'
                + 'VERSION:3.0\n'
                + `FN:${ownerName}\n`
                + 'ORG:BUGGU MD Owner;\n'
                + `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n`
                + 'END:VCARD';

    // Caption for the owner profile picture
    const caption = `👑 *BUGGU MD DEVELOPER & OWNER* 👑\n\n`
                  + `✨ *Name:* ${ownerName}\n`
                  + `📱 *WhatsApp Number:* +${ownerNumber}\n`
                  + `👾 *GitHub:* github.com/divyansh-deewana\n`
                  + `💬 *Tagline:* "Coding isn't just a skill, it's an art."\n\n`
                  + `🛡️ *BUGGU MD* is developed and maintained by Divyansh Deewana. You can contact them directly on WhatsApp or social handles for upgrades or customizable integrations.`;

    // 1. Send owner details card with image first
    await sock.sendMessage(remoteJid, {
      image: { url: config.ownerImage || 'https://i.ibb.co/twfrpLDy/x.jpg' },
      caption: caption
    }, { quoted: msg as any });

    // 2. Send the active interactive vCard for quick saving
    await sock.sendMessage(remoteJid, {
      contacts: {
        displayName: ownerName,
        contacts: [{ vcard }]
      }
    }, { quoted: msg as any });
  },
};

export default ownerCommand;
