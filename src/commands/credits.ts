import { Command } from '../types/bot';
import { config } from '../config/config';

export const creditsCommand: Command = {
  name: 'credits',
  description: 'Displays system and contributor credits',
  category: 'info',
  aliases: ['thankyou', 'contrib'],
  execute: async ({ reply }) => {
    const text = `🎖️ *BUGGU MD SYSTEM CREDITS*

A special thanks to the people and projects that made *BUGGU MD* possible:

👨‍💻 *Core Programmer:*
- *Divyansh Deewana* — Designed the original command structure, custom server architecture, and React connection control.

🛰️ *Open Source Libraries:*
- *Whiskeysockets/Baileys* — The fundamental WhatsApp Web Api socket translation package.
- *Node-Cache & Pino* — Keeping caches fast and connection statements lightweight.
- *React & Tailwind CSS Teams* — For providing the visual interfaces of the configuration dashboard.

💡 *Platform Sponsor:*
- *Google AI Studio Build* — Providing the sandbox development container.

💖 Thank you for using BUGGU MD! Keep creating amazing automated experiences!`;
    
    await reply(text);
  },
};

export default creditsCommand;
