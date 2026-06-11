import { Command } from '../types/bot';
import { config } from '../config/config';

export const aboutCommand: Command = {
  name: 'about',
  description: 'Displays software description and architecture details',
  category: 'info',
  aliases: ['info', 'details'],
  execute: async ({ reply }) => {
    const text = `ℹ️ *ABOUT ${config.botName}*

*BUGGU MD* is a next-generation WhatsApp automations assistant built for speed and durability.

🤖 *CORE ARCHITECTURE:*
- *Connection Layer:* @whiskeysockets/baileys Multi-Device Socket Protocol
- *Runtime Container:* Node.js ES Modules (ESM)
- *Dashboard Web Client:* React 19 + Vite 6 + Tailwind CSS 4
- *API Controller:* Express JS
- *Command Dispatcher:* Modular Category Handler Engine

🎯 *BOT PURPOSE:*
To provide users with zero-lag utility commands, intelligent auto-responses, and simple session management without requiring heavy computer knowledge.

💻 Built with 💖 and dedication by *${config.ownerName}*.`;
    
    await reply(text);
  },
};

export default aboutCommand;
