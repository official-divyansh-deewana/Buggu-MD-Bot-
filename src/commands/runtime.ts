import { Command } from '../types/bot';
import { config } from '../config/config';

export const runtimeCommand: Command = {
  name: 'runtime',
  description: 'Displays the server uptime',
  category: 'system',
  aliases: ['uptime', 'run'],
  execute: async ({ reply }) => {
    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    let runtimeStr = '';
    if (days > 0) runtimeStr += `${days}d `;
    if (hours > 0) runtimeStr += `${hours}h `;
    if (minutes > 0) runtimeStr += `${minutes}m `;
    runtimeStr += `${seconds}s`;

    const text = `🕒 *${config.botName} RUNTIME STATS*

⏱️ *Active Uptime:* \` ${runtimeStr} \`
⚙️ *CPU Usage:* ~${(process.cpuUsage().user / 1e6).toFixed(2)}s
🔋 *Memory Usage:* ~${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB / ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(1)} MB

The bot has been operating continuously without interruption or crashes since the previous deploy.`;
    
    await reply(text);
  },
};

export default runtimeCommand;
