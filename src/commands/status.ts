import { Command } from '../types/bot';
import { db } from '../lib/database';
import { botState } from '../lib/baileys';
import os from 'os';

const statusCommand: Command = {
  name: 'status',
  description: 'Display current system indicators, platform diagnostics, count aggregates',
  category: 'System',
  execute: async ({ reply, senderName }) => {
    const memory = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
    const totalMem = Math.round(os.totalmem() / 1024 / 1024);
    const dbCounts = db.getCounts();

    const response = `🤖 *BUGGU MD SYSTEM STATE STATUS*

━━━━━━━━━━━━━━━━━━━━━
👥 *User Registry:* ${dbCounts.users} users cached
👥 *Group Workspaces:* ${dbCounts.groups} active chats
👑 *Premium Subscribers:* ${dbCounts.premium} users
⚡ *State Code:* ${botState.status.toUpperCase()}
💻 *System Host:* ${os.platform()} (${os.arch()})
📦 *Memory Usage:* ${memory}MB / ${totalMem}MB
⚙️ *CPU Cores:* ${os.cpus().length} threads

*Requested by:* ${senderName}
━━━━━━━━━━━━━━━━━━━━━`;
    await reply(response);
  }
};

export default statusCommand;
