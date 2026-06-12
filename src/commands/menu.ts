import { Command } from '../types/bot';
import { db } from '../lib/database';
import { config } from '../config/config';

export const menuCommand: Command = {
  name: 'menu',
  description: 'Displays the complete and stylish interactive menu system',
  category: 'System',
  aliases: ['m', 'allmenu', 'commands'],
  execute: async ({ sock, remoteJid, msg, sender }) => {
    const p = db.data.settings.prefix || config.prefix || '.';
    const bn = db.data.settings.botname || config.botName || 'BUGGU MD';
    const ownerName = config.ownerName || 'Divyansh Deewana';

    const menuCaption = `╭━━━〔 *${bn.toUpperCase()}* 〕━━━┈⊷
┃★╭──────────────
┃★│ 👑 *Owner :* ${ownerName}
┃★│ ⚙️ *Prefix :* \` ${p} \`
┃★│ 🛡️ *System :* Operational
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
📋 *ᴄʜᴏᴏsᴇ ᴀ ᴄᴀᴛᴇɢᴏʀʏ ᴛᴏ ᴇxᴘʟᴏʀᴇ:*
> _ʀᴇᴘʟʏ ᴡɪᴛʜ ᴛʜᴇ ᴍᴀᴛᴄʜɪɴɢ ɴᴜᴍʙᴇʀ ᴛᴏ ᴏᴘᴇɴ ᴛʜᴇ ᴍᴇɴᴜ_

 ➦✧ -〘 *ʙᴏᴛ ᴍᴇɴᴜ* 〙 -  ✧━┈⊷
┃✧ ➦♦⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆✧━┈⊷
┃✧│  ❶  *ᴅᴏᴡɴʟᴏᴅᴇᴅ ᴍᴇɴᴜ*
┃✧│  ❷ *ɢʀᴏᴜᴘ ᴍᴇɴᴜ*
┃✧│  ❸ *ғᴜɴ ᴍᴇɴᴜ*
┃✧│  ❹  *ᴏᴡɴᴇʀ ᴍᴇɴᴜ*
┃✧│  ❺  *ᴀɪ ᴍᴇɴᴜ*
┃✧│  ❻  *ᴀɴɪᴍᴇ ᴍᴇɴᴜ*
┃✧│  ❼  *ᴄᴏɴᴠᴇʀᴛ ᴍᴇɴᴜ*
┃✧│  ❽  *ᴏᴛʜᴇʀ ᴍᴇɴᴜ*
┃✧│  ❾  *ʀᴇᴀᴄʏ ᴍᴇɴᴜ*
┃✧│  ❿  *ᴍᴀɪɴ ᴍᴇɴᴜ*
┃✧ ➥ ⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆✧━┈⊷
 ➥⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆⋆✧━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`;

    const contextInfo = {
      mentionedJid: [sender],
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363348739987203@newsletter',
        newsletterName: ownerName,
        serverMessageId: 143
      }
    };

    let sentMsg: any = null;

    try {
      // 1. Send the beautifully designed Menu Image
      sentMsg = await sock.sendMessage(
        remoteJid,
        {
          image: { url: config.botImage || 'https://files.catbox.moe/yj7zp0.png' },
          caption: menuCaption,
          contextInfo: contextInfo
        },
        { quoted: msg as any }
      );

      // 2. Play the beautiful audio file shortly after
      try {
        setTimeout(async () => {
          await sock.sendMessage(remoteJid, {
            audio: { url: 'https://files.catbox.moe/wzodz1.mp3' },
            mimetype: 'audio/mp4',
            ptt: true,
          }, { quoted: msg as any });
        }, 1200);
      } catch (audioErr) {
        console.warn('Failed to stream menu audio track:', audioErr);
      }

    } catch (err) {
      console.error('Failed to send main menu:', err);
      // Fallback to text message
      sentMsg = await sock.sendMessage(
        remoteJid,
        { text: menuCaption, contextInfo: contextInfo },
        { quoted: msg as any }
      );
    }

    if (!sentMsg?.key?.id) return;
    const messageID = sentMsg.key.id;

    // Beautiful categorised submenus populated perfectly matching our codebase
    const menuData: Record<string, { title: string; content: string }> = {
      '1': {
        title: "📥 *Download Menu* 📥",
        content: `╭━━━〔 *Download Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🌐 *Social Media*
┃★│ • facebook [url] (or fb)
┃★│ • instagram [url] (or ig)
┃★│ • tiktok [url] (or tt)
┃★│ • twitter [url] (or x)
┃★│ • pinterest [query] (or pin)
┃★│ • mediafire [url]
┃★│ • apk [app]
┃★│ • spotify [query]
┃★╰──────────────
┃★╭──────────────
┃★│ 🎵 *Music/Video*
┃★│ • play [query]
┃★│ • song [query]
┃★│ • video [query]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '2': {
        title: "👥 *Group Menu* 👥",
        content: `╭━━━〔 *Group Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🛠️ *Management*
┃★│ • grouplink (or invitelink)
┃★│ • group open / close
┃★│ • promote @user
┃★│ • demote @user
┃★│ • kick @user
┃★│ • add <number>
┃★│ • mute / unmute
┃★╰──────────────
┃★╭──────────────
┃★│ ⚡ *Warnings & Config*
┃★│ • warn @user
┃★│ • unwarn @user
┃★│ • warnings @user
┃★│ • setgname <text>
┃★│ • setgdesc <text>
┃★│ • setgpp [quoted img]
┃★╰──────────────
┃★╭──────────────
┃★│ 🏷️ *Tagging*
┃★│ • tagall
┃★│ • tagadmins
┃★│ • hidetag [text]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '3': {
        title: "😄 *Fun Menu* 😄",
        content: `╭━━━〔 *Fun Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🎭 *Interactive*
┃★│ • flirt (or pickup)
┃★│ • joke
┃★│ • fact
┃★│ • quote
┃★│ • roast @user
┃★│ • hack @user
┃★│ • ship @A @B
┃★│ • rate <text>
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '4': {
        title: "👑 *Owner Menu* 👑",
        content: `╭━━━〔 *Owner Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ ⚠️ *Restricted*
┃★│ • block @user
┃★│ • unblock @user
┃★│ • restart
┃★│ • shutdown
┃★│ • broadcast <text>
┃★│ • leavegc
┃★│ • join <url>
┃★╰──────────────
┃★╭──────────────
┃★│ ℹ️ *Info Tools*
┃★│ • setbotname <text>
┃★│ • setprefix <char>
┃★│ • addpremium @user
┃★│ • delpremium @user
┃★│ • listpremium (or premiumlist)
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '5': {
        title: "🤖 *AI Menu* 🤖",
        content: `╭━━━〔 *AI Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 💬 *Chat & Gen*
┃★│ • ai [prompt] (or Gemini)
┃★│ • llama3 [prompt] (or llama)
┃★│ • code [prompt]
┃★│ • translate <text>
┃★│ • summarize <text>
┃★╰──────────────
┃★╭──────────────
┃★│ 🖼️ *Media AI*
┃★│ • image [prompt]
┃★│ • sora [video prompt] (or t2v)
┃★│ • remini [quoted image] (or enhance)
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '6': {
        title: "🎎 *Anime Menu* 🎎",
        content: `╭━━━〔 *Anime Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🎎 *Anime Gallery*
┃★│ • animegirl (Coming soon)
┃★│ • waifu (Coming soon)
┃★│ • neko (Coming soon)
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '7': {
        title: "🔄 *Convert Menu* 🔄",
        content: `╭━━━〔 *Convert Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🖼️ *Media*
┃★│ • sticker (quoted image)
┃★│ • take <pack name>
┃★│ • tovoice (quoted audio/video)
┃★│ • tomp3 (quoted video)
┃★│ • tomp4 (quoted animated sticker)
┃★│ • qr [text]
┃★│ • removebg (quoted image)
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '8': {
        title: "📌 *Other Menu* 📌",
        content: `╭━━━〔 *Other Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🕒 *Utilities*
┃★│ • weather <city>
┃★│ • time
┃★│ • calc <expr>
┃★│ • shorturl <link>
┃★│ • length <string>
┃★│ • countryinfo <country> (or cinfo)
┃★│ • viewonce [quoted view-once message]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '9': {
        title: "💞 *Reactions Menu* 💞",
        content: `╭━━━〔 *Reactions Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ ❤️ *Expressions*
┃★│ • cuddle @user
┃★│ • hug @user
┃★│ • kiss @user
┃★│ • lick @user
┃★│ • pat @user
┃★│ • blush
┃★│ • smile
┃★│ • happy
┃★│ • wink
┃★│ • poke
┃★╰──────────────
┃★╭──────────────
┃★│ 😂 *Action & Play*
┃★│ • bully @user
┃★│ • bonk @user
┃★│ • yeet @user
┃★│ • slap @user
┃★│ • kill @user
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      },
      '10': {
        title: "🏠 *Main Menu* 🏠",
        content: `╭━━━〔 *Main Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ ℹ️ *Bot Info*
┃★│ • ping
┃★│ • alive
┃★│ • runtime
┃★│ • version
┃★│ • about
┃★│ • credits
┃★│ • owner (or creator)
┃★│ • status
┃★╰──────────────
┃★╭──────────────
┃★│ ⚙️ *Settings*
┃★│ • alwaysonline on/off
┃★│ • autoread on/off
┃★│ • autoreact on/off
┃★│ • auttyping on/off
┃★│ • autorecording on/off
┃★│ • autostatusview on/off
┃★│ • autostatusreact on/off
┃★│ • welcome on/off
┃★│ • goodbye on/off
┃★│ • antilink on/off
┃★│ • antibadword on/off
┃★│ • antidelete on/off
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${bn.toUpperCase()}`
      }
    };

    // Self-contained message replier with improved error handling
    const handler = async (msgData: any) => {
      try {
        const receivedMsg = msgData.messages?.[0];
        if (!receivedMsg?.message) return;

        // Verify if it is a reply referencing our menu message ID
        const stanzaId = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId;
        if (stanzaId !== messageID) return;

        const bodyText = (
          receivedMsg.message.conversation ||
          receivedMsg.message.extendedTextMessage?.text ||
          ''
        ).trim();

        if (menuData[bodyText]) {
          const selectedMenu = menuData[bodyText];
          
          try {
            await sock.sendMessage(
              remoteJid,
              {
                image: { url: 'https://files.catbox.moe/yj7zp0.png' },
                caption: selectedMenu.content,
                contextInfo: contextInfo
              },
              { quoted: receivedMsg }
            );

            await sock.sendMessage(remoteJid, {
              react: { text: '✅', key: receivedMsg.key }
            });
          } catch (err) {
            console.error('Failed to send sub-menu images, trying fallback:', err);
            await sock.sendMessage(
              remoteJid,
              { text: selectedMenu.content, contextInfo: contextInfo },
              { quoted: receivedMsg }
            );
          }
        } else if (/^[1-9]$|^10$/.test(bodyText)) {
          // Fallback if option input is invalid
          await sock.sendMessage(
            remoteJid,
            { text: `❌ *Invalid Option:* "${bodyText}" is not listed in categories. Reply 1 to 10 only.` },
            { quoted: receivedMsg }
          );
        }
      } catch (e) {
        console.error('Menu listener error:', e);
      }
    };

    // Register live event updater
    sock.ev.on('messages.upsert', handler);

    // Clean up memory buffer / event logs after 5 minutes
    setTimeout(() => {
      try {
        sock.ev.off('messages.upsert', handler);
      } catch (_) {}
    }, 300000);
  },
};

export default menuCommand;
