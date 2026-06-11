import { Command } from '../types/bot';
import { db } from '../lib/database';

const configToggles = [
  { key: 'alwaysonline', label: 'Always-Online Mode', global: true },
  { key: 'autoread', label: 'Auto-Read Message Mark', global: true },
  { key: 'autoreact', label: 'Auto-React Emoji Feedback', global: true },
  { key: 'autotyping', label: 'Auto-Composing Presence', global: true },
  { key: 'autorecording', label: 'Auto-Recording Presence', global: true },
  { key: 'autostatusview', label: 'Auto-Status Viewing Tracker', global: true },
  { key: 'autostatusreact', label: 'Auto-Status Emoji Reactions', global: true },
  { key: 'welcome', label: 'Welcome Greetings Switch', global: false },
  { key: 'goodbye', label: 'Goodbye Farewells Switch', global: false },
  { key: 'antilink', label: 'Anti-Link Protections', global: false },
  { key: 'antibadword', label: 'Anti-Badword Scan Filters', global: false },
  { key: 'antidelete', label: 'Message Anti-Deletion Logs', global: false },
];

const toggleCommands: Command[] = configToggles.map((toggle) => {
  return {
    name: toggle.key,
    description: `Configure ${toggle.label} on or off`,
    category: 'Settings',
    aliases: [`${toggle.key}on`, `${toggle.key}off`],
    execute: async ({ reply, args, remoteJid, isOwner }) => {
      // Direct owners/admins check depending on what is toggled
      if (!isOwner && toggle.global) {
        await reply('❌ *Owner Privilege Required:* Only structural owners can change global parameters.');
        return;
      }

      const isGroup = remoteJid.endsWith('@g.us');
      if (!isGroup && !toggle.global) {
        await reply('❌ *Workspace Constraint:* This toggle is configured on a per-group level. Execute it inside a group chat.');
        return;
      }

      // Check toggled target value
      let turnOn = false;
      const firstArg = args[0]?.toLowerCase();
      
      // Auto query state if no argument provided
      if (!firstArg) {
        let currentVal = false;
        if (toggle.global) {
          currentVal = (db.data.settings as any)[toggle.key];
        } else {
          currentVal = !!(db.getGroup(remoteJid) as any)[toggle.key];
        }
        await reply(`ℹ️ *${toggle.label} Status Check:* Currently *${currentVal ? 'ON (Activated)' : 'OFF (Deactivated)'}*. Try appending *on* or *off* to change.`);
        return;
      }

      if (firstArg === 'on' || firstArg === '1' || firstArg === 'enable' || firstArg === 'true') {
        turnOn = true;
      } else if (firstArg === 'off' || firstArg === '0' || firstArg === 'disable' || firstArg === 'false') {
        turnOn = false;
      } else {
        await reply(`❌ *Syntax Error:* Use \`${db.data.settings.prefix}${toggle.key} on\` or \`${db.data.settings.prefix}${toggle.key} off\`.`);
        return;
      }

      // Action the update
      if (toggle.global) {
        (db.data.settings as any)[toggle.key] = turnOn;
        db.save();
        await reply(`✅ *Configuration Propagated:* Global setting *${toggle.label}* has been set to *${turnOn ? 'ENABLED' : 'DISABLED'}*.`);
      } else {
        // Group toggle
        db.updateGroup(remoteJid, { [toggle.key]: turnOn });
        await reply(`✅ *Workspace Lock Updated:* This group's *${toggle.label}* has been set to *${turnOn ? 'ENABLED' : 'DISABLED'}*.`);
      }
    }
  };
});

export default toggleCommands;
