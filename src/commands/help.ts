import { Command } from '../types/bot';
import { config } from '../config/config';

export const helpCommand: Command = {
  name: 'help',
  description: 'Explains how to operate the bot and command parameters',
  category: 'general',
  aliases: ['manual', 'instructions'],
  execute: async ({ reply }) => {
    const text = `📕 *${config.botName} OPERATION MANUAL*

This is a modular Multi-Device WhatsApp automation tool.

💡 *GENERAL GUIDELINES:*
1. Make sure to use the active prefix \` ${config.prefix} \` before any command.
2. Ensure you spell the command name exactly.
3. To view all command categories, call: *${config.prefix}menu*

🛠️ *COMMAND SPECIFICS:*
👉 \`${config.prefix}ping\` - Check latency or lag issues.
👉 \`${config.prefix}runtime\` - See if database/session caching files are active.
👉 \`${config.prefix}settings\` - Verify owner, name, and prefixes.
👉 \`${config.prefix}owner\` - Retrieve direct email/contact card for bugs and feature requests.

💬 If you have custom needs or encounter bugs, please invoke *${config.prefix}owner* for help.`;
    
    await reply(text);
  },
};

export default helpCommand;
