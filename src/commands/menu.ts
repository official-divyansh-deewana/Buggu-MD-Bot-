import { Command } from '../types/bot';
import { db } from '../lib/database';

export const menuCommand: Command = {
  name: 'menu',
  description: 'Displays the complete and stylish commands menu',
  category: 'System',
  aliases: ['m', 'allmenu', 'commands'],
  execute: async ({ reply, senderName }) => {
    const p = db.data.settings.prefix;
    const bn = db.data.settings.botname;

    const greeting = `👋 *Hey, ${senderName}!* Welcome to *${bn}*!

🤖 *SYSTEM METADATA*
┌─ 🚀 *Bot Label:* ${bn}
├─ 💻 *Developer:* Divyansh Deewana
├─ ⚙️ *Command Prefix:* \` ${p} \`
├─ 👑 *Premium Registry:* Active
└─ 🛡️ *System State:* Operational

━━━━━━━━━━━━━━━━━━━━━
🌟 *BUGGU MD FULL MENU* 🌟
━━━━━━━━━━━━━━━━━━━━━

*🧠 AI POWERED COMMANDS:*
👉 \`${p}ai <prompt>\` - Run Gemini chat assistant
👉 \`${p}image <prompt>\` - Render premium AI imagery
👉 \`${p}code <prompt>\` - Solve compilation queries
👉 \`${p}translate <text>\` - Perform translations
👉 \`${p}summarize <text>\` - Condense texts

*👥 GROUP ADMINISTRATION:*
👉 \`${p}tagall\` - Mention all members
👉 \`${p}hidetag <text>\` - Hidden broadcast
👉 \`${p}group open/close\` - Lock/unlock chat room
👉 \`${p}mute / unmute\` - Turn group chat flow on/off
👉 \`${p}promote @user\` - Grant Admin rights
👉 \`${p}demote @user\` - Revoke Admin rights
👉 \`${p}kick @user\` - Remove member from group
👉 \`${p}add <number>\` - Invite member directly
👉 \`${p}warn @user\` - Issue warnings (Auto kick at 3)
👉 \`${p}unwarn @user\` - Reset warning logs
👉 \`${p}warnings @user\` - Check active warnings
👉 \`${p}invitelink\` - Retrieve group invite URL

*🔌 CONTROL & DIAGNOSTICS:*
👉 \`${p}menu\` - Display current menu screen
👉 \`${p}status\` - Display platform resource diagnostics
👉 \`${p}ping\` - Inspect connection latency
👉 \`${p}alive\` - Confirm online socket status
👉 \`${p}runtime\` - Fetch total bot runtime sessions
👉 \`${p}version\` - View active codebase version
👉 \`${p}about\` - Read development architectures
👉 \`${p}credits\` - Appreciations & Dev acknowledgments
👉 \`${p}owner\` - Retrieve developer vCard

*⚙️ SETTINGS TOGGLES (on/off):*
👉 \`${p}alwaysonline on/off\` - Force online indicators
👉 \`${p}autoread on/off\` - Mark messages as read
👉 \`${p}autoreact on/off\` - Feedbacks with random emojis
👉 \`${p}autotyping on/off\` - Trigger composing state
👉 \`${p}autorecording on/off\` - Trigger recording state
👉 \`${p}autostatusview on/off\` - Read story status updates
👉 \`${p}autostatusreact on/off\` - Emoji reactions to stories
👉 \`${p}welcome on/off\` - Group participation welcomes
👉 \`${p}goodbye on/off\` - Group participation departures
👉 \`${p}antilink on/off\` - Intercept and delete link shares
👉 \`${p}antibadword on/off\` - Filter bad word obscenities
👉 \`${p}antidelete on/off\` - Track deleted messages logs

*📥 INTERNET DOWNLOADERS:*
👉 \`${p}instagram <url>\` - Extract IG Reels & Photos
👉 \`${p}fb <url>\` - Extract Facebook video feeds
👉 \`${p}tiktok <url>\` - Grab TikTok (No Watermark)
👉 \`${p}twitter <url>\` - Save Twitter/X video clips
👉 \`${p}play <query>\` - Audios/Music searches
👉 \`${p}song <query>\` - Transcode audio downloads
👉 \`${p}video <query>\` - Transcode video downloads
👉 \`${p}pinterest <query>\` - Pinterest photo search
👉 \`${p}mediafire <url>\` - Fetch MediaFire folders

*💿 COMPILERS & CONVERTERS:*
👉 \`${p}readmore <text1 | text2>\` - Insert spacer breaks
👉 \`${p}qr <text>\` - Render real barcodes on the fly
👉 \`${p}sticker\` - Compile picture to stickers
👉 \`${p}take <name>\` - Customize sticker pack titles
👉 \`${p}tovoice\` - Transcode media files to voice notes
👉 \`${p}tomp3\` - Convert video files to MP3 files
👉 \`${p}tomp4\` - Render animations back to MP4
👉 \`${p}removebg\` - Remove photo backdrop panels

*👑 PREMIUM SUBSCRIBERS:*
👉 \`${p}addpremium @user\` - Opt user in (Owner only)
👉 \`${p}delpremium @user\` - Revoke privileges (Owner only)
👉 \`${p}checkpremium\` - Inspect subscription tier state
👉 \`${p}premiumlist\` - List all registered VIP user IDs

*🎭 ENTERTAINMENT & FUN:*
👉 \`${p}truth\` / \`${p}dare\` - Play truth-or-dare
👉 \`${p}joke\` - Tell geek coder jokes
👉 \`${p}quote\` - Read philosophy reminders
👉 \`${p}fact\` - Read extraordinary brain trivia
👉 \`${p}pickup\` - Flirty lines
👉 \`${p}roast @user\` - Playful roasts
👉 \`${p}hack\` - Simulate terminal break-ins
👉 \`${p}ship @A @B\` - Check custom chemistry match
👉 \`${p}rate <text>\` - Random rating index score

*🔧 SYSTEM UTILITIES:*
👉 \`${p}weather <city>\` - Read meteorology metrics
👉 \`${p}time\` - Read exact world clocks
👉 \`${p}calc <formula>\` - Solve equations
👉 \`${p}shorturl <url>\` - Shorten links
👉 \`${p}length <string>\` - Count character lengths
👉 \`${p}speedtest\` - Output execution performance index
👉 \`${p}ip <address>\` - Geolocate DNS registries

*👑 OWNER SYSTEM CONTROLS (Owner only):*
👉 \`${p}restart\` - Reboot node process threads
👉 \`${p}shutdown\` - Safely terminate socket
👉 \`${p}broadcast <msg>\` - Bulletin post to all groups
👉 \`${p}block @user\` - Add node block restrictions
👉 \`${p}unblock @user\` - Remove blockage limits
👉 \`${p}leavegc\` - Disconnect bot from active group
👉 \`${p}join <url>\` - Accept group URL invitations
👉 \`${p}setbotname <name>\` - Re-identify bot title
👉 \`${p}setprefix <char>\` - Set trigger characters

━━━━━━━━━━━━━━━━━━━━━
💻 *BUGGU MD — Created by Divyansh Deewana*`;

    await reply(greeting);
  },
};

export default menuCommand;
