import { Command } from '../types/bot';
import { db } from '../lib/database';

const buggumdSettingsCommands: Command[] = [
  {
    name: 'antidelete',
    description: 'Configure and monitor deleted messages (Anti-delete engine)',
    category: 'Settings',
    execute: async ({ reply, args, remoteJid, isOwner }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied:* Only bot owners can toggle the BUGGU MD Anti-Delete monitor.');
        return;
      }

      const subcommand = args[0]?.toLowerCase();
      if (!subcommand) {
        const isGroup = remoteJid.endsWith('@g.us');
        const globalEnabled = db.data.settings.antidelete;
        const groupEnabled = isGroup ? db.getGroup(remoteJid).antidelete : false;

        await reply(
          `╭══✦〔 *BUGGU MD ANTIDELETE* 〕✦══╮\n` +
          `│\n` +
          `│ 🌐 *Global Status:* ${globalEnabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
          `│ 👥 *Group (this chat):* ${isGroup ? (groupEnabled ? '🟢 ENABLED' : '🔴 DISABLED') : 'N/A'}\n` +
          `│\n` +
          `│ ⚙️ *Usage commands:*\n` +
          `│ 💡 \`.antidelete on\` - Turn ON globally\n` +
          `│ 💡 \`.antidelete off\` - Turn OFF globally\n` +
          `│ 💡 \`.antidelete group on\` - Turn ON for this group\n` +
          `│ 💡 \`.antidelete group off\` - Turn OFF for this group\n` +
          `╰══✦═✦═✦═✦═✦═✦═✦═✦══╯`
        );
        return;
      }

      if (subcommand === 'on' || subcommand === 'enable') {
        db.data.settings.antidelete = true;
        db.save();
        await reply('✅ *Anti-Delete Propagated:* Global Anti-Delete tracking is now *ENABLED*.');
      } else if (subcommand === 'off' || subcommand === 'disable') {
        db.data.settings.antidelete = false;
        db.save();
        await reply('❌ *Anti-Delete Propagated:* Global Anti-Delete tracking is now *DISABLED*.');
      } else if (subcommand === 'group') {
        const isGroup = remoteJid.endsWith('@g.us');
        if (!isGroup) {
          await reply('❌ *Workspace Constraint:* Group toggles can only be executed within a group chat.');
          return;
        }

        const secondArg = args[1]?.toLowerCase();
        if (secondArg === 'on' || secondArg === 'enable') {
          db.updateGroup(remoteJid, { antidelete: true });
          await reply('✅ *Group Guard Lock:* Anti-Delete is now *ENABLED* for this group.');
        } else if (secondArg === 'off' || secondArg === 'disable') {
          db.updateGroup(remoteJid, { antidelete: false });
          await reply('❌ *Group Guard Lock:* Anti-Delete is now *DISABLED* for this group.');
        } else {
          await reply('❌ *Syntax Error:* Use `.antidelete group on` or `.antidelete group off`.');
        }
      } else {
        await reply('❌ *Syntax Error:* Use `.antidelete on` / `off` or `.antidelete group on` / `off`.');
      }
    }
  },
  {
    name: 'autorecording',
    description: 'Configure Auto-Recording Presence indicator (globally)',
    category: 'Settings',
    execute: async ({ reply, args, isOwner }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied:* Only bot owners can configure the auto-recording presence.');
        return;
      }

      const subcommand = args[0]?.toLowerCase();
      if (!subcommand) {
        const enabled = db.data.settings.autorecording;
        await reply(
          `╭══✦〔 *BUGGU MD AUTORECORDING* 〕✦══╮\n` +
          `│\n` +
          `│ 🎙️ *Current Status:* ${enabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
          `│\n` +
          `│ ⚙️ *Usage commands:*\n` +
          `│ 💡 \`.autorecording on\` - Enable fake recording voice indicator\n` +
          `│ 💡 \`.autorecording off\` - Disable fake recording voice indicator\n` +
          `╰══✦═✦═✦═✦═✦═✦═✦═✦══╯`
        );
        return;
      }

      if (subcommand === 'on' || subcommand === 'enable') {
        db.data.settings.autorecording = true;
        db.save();
        await reply('🟢 *Presence Re-aligned:* Fake recording voice indicator is now *ENABLED* globally!');
      } else if (subcommand === 'off' || subcommand === 'disable') {
        db.data.settings.autorecording = false;
        db.save();
        await reply('❌ *Presence Re-aligned:* Fake recording voice indicator is now *DISABLED* globally.');
      } else {
        await reply('❌ *Syntax Error:* Use `.autorecording on` or `.autorecording off`.');
      }
    }
  },
  {
    name: 'autostatus',
    description: 'Configure state indicators for viewing and reacting to WhatsApp stories',
    category: 'Settings',
    execute: async ({ reply, args, isOwner }) => {
      if (!isOwner) {
        await reply('❌ *Access Denied:* Only bot owners can edit auto-status viewer profiles.');
        return;
      }

      const subcommand = args[0]?.toLowerCase();
      if (!subcommand) {
        const viewEnabled = db.data.settings.autostatusview;
        const reactEnabled = db.data.settings.autostatusreact;
        await reply(
          `╭══✦〔 *BUGGU MD AUTO-STATUS SETTINGS* 〕✦══╮\n` +
          `│\n` +
          `│ 📱 *Auto Status View:* ${viewEnabled ? '🟢 ENABLED (Seen status automatically)' : '🔴 DISABLED'}\n` +
          `│ 💫 *Status Emoji React (💚):* ${reactEnabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
          `│\n` +
          `│ ⚙️ *Usage commands:*\n` +
          `│ 💡 \`.autostatus on\` - Enable auto status auto-seen\n` +
          `│ 💡 \`.autostatus off\` - Disable auto status auto-seen\n` +
          `│ 💡 \`.autostatus react on\` - Enable emoji reactions on statuses\n` +
          `│ 💡 \`.autostatus react off\` - Disable emoji reactions on statuses\n` +
          `╰══✦═✦═✦═✦═✦═✦═✦═✦══╯`
        );
        return;
      }

      if (subcommand === 'on' || subcommand === 'enable') {
        db.data.settings.autostatusview = true;
        db.save();
        await reply('✅ *Auto Status Monitor:* Auto viewing of contact story updates is now *ENABLED*.');
      } else if (subcommand === 'off' || subcommand === 'disable') {
        db.data.settings.autostatusview = false;
        db.save();
        await reply('❌ *Auto Status Monitor:* Auto viewing of contact story updates is now *DISABLED*.');
      } else if (subcommand === 'react') {
        const secondArg = args[1]?.toLowerCase();
        if (secondArg === 'on' || secondArg === 'enable') {
          db.data.settings.autostatusreact = true;
          db.save();
          await reply('💚 *Status Reactions:* Automated green heart emoji reactions to stories are now *ENABLED*!');
        } else if (secondArg === 'off' || secondArg === 'disable') {
          db.data.settings.autostatusreact = false;
          db.save();
          await reply('❌ *Status Reactions:* Automated green heart emoji reactions to stories are now *DISABLED*.');
        } else {
          await reply('❌ *Syntax Error:* Use `.autostatus react on` or `.autostatus react off`.');
        }
      } else {
        await reply('❌ *Syntax Error:* Use `.autostatus on`/`off` or `.autostatus react on`/`off`.');
      }
    }
  }
];

export default buggumdSettingsCommands;
