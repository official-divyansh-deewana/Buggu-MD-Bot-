import { Command } from '../types/bot';
import { config } from '../config/config';

export const ownerCommand: Command = {
  name: 'owner',
  description: 'Displays developer and owner information',
  category: 'info',
  aliases: ['creator', 'dev'],
  execute: async ({ reply }) => {
    const text = `👑 *DEVELOPER & OWNER INFO*

✨ *Name:* ${config.ownerName}
📱 *WhatsApp Number:* +${config.ownerNumber}
👾 *GitHub:* github.com/divyansh-deewana
💬 *Tagline:* "Coding isn't just a skill, it's an art."

🛡️ *BUGGU MD* is developed and maintained by Divyansh Deewana. You can contact them directly on WhatsApp or social handles for upgrades or customizable integrations.`;
    
    await reply(text);
  },
};

export default ownerCommand;
