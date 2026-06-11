import { Command } from '../types/bot';
import { config } from '../config/config';

export const settingsCommand: Command = {
  name: 'settings',
  description: 'Displays current bot settings and variables',
  category: 'system',
  aliases: ['config', 'set'],
  execute: async ({ reply }) => {
    const text = `⚙️ *LOGICAL SYSTEM SETTINGS*

🤖 *Bot Name:* ${config.botName}
👑 *Owner Name:* ${config.ownerName}
📞 *Dev Number:* +${config.ownerNumber}
🔑 *Prefix:* \` ${config.prefix} \`
📡 *Log Verbosity:* \` ${config.logLevel} \`
🗄️ *Session directory:* \` ${config.sessionPath} \`
🏠 *Web Server Port:* \` ${config.port} \`
🔄 *Auto-Reconnect:* Enabled (Max 15 retries)

_These values are loaded from environment variables and can be adjusted through the cloud environment settings or a .env file._`;
    
    await reply(text);
  },
};

export default settingsCommand;
