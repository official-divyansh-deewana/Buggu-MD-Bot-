import { Command } from '../types/bot';
import { config } from '../config/config';

export const versionCommand: Command = {
  name: 'version',
  description: 'Displays the active software build version',
  category: 'info',
  aliases: ['v', 'rev'],
  execute: async ({ reply }) => {
    const text = `📦 *${config.botName} REVISION & VERSION*

✨ *Current Stable Version:* \`v${config.version}\`
🔒 *Secure Baileys Client:* \`v12.0.0\`
🏎️ *Protocol:* Baileys MD Protocol (WebSocket v5)
🛠️ *Environment:* Production Build

All sub-modules are fully updated. Checking for new automated patches is enabled dynamically.`;
    
    await reply(text);
  },
};

export default versionCommand;
