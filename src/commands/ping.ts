import { Command } from '../types/bot';

export const pingCommand: Command = {
  name: 'ping',
  description: 'Checks bot response speed and latency',
  category: 'system',
  aliases: ['speed'],
  execute: async ({ reply, msg }) => {
    const startTime = Date.now();
    
    // First send empty or placeholder response
    const sent = await reply('🏓 *Pinging server...*');
    
    const latency = Date.now() - startTime;
    
    // Update or send new message showing real latency
    await reply(`⚡ *PONG!*
🚀 *Latency:* \`${latency} ms\`
📊 *Status:* Excellent`);
  },
};

export default pingCommand;
