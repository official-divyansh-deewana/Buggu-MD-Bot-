import { Command } from '../types/bot';
import { config } from '../config/config';

export const aliveCommand: Command = {
  name: 'alive',
  description: 'Verifies if the bot is alive and running',
  category: 'system',
  aliases: ['status', 'on'],
  execute: async ({ reply }) => {
    const text = `🟢 *${config.botName} IS ALIVE!*

🚀 *Current State:* Full Active & Fast
🕒 *Timestamp:* ${new Date().toLocaleTimeString()}
📱 *Connection:* Secure MD Socket
💻 *System:* High Speed Cloud Run Container

_"Everything is working perfectly. Type *${config.prefix}menu* to see what I can do for you!"_`;
    
    await reply(text);
  },
};

export default aliveCommand;
// 
