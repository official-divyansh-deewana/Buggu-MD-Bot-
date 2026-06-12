import { Command } from '../types/bot';
import { downloadContentFromMessage, downloadMediaMessage } from '@whiskeysockets/baileys';
import axios from 'axios';

// Native, dependency-free multipart buffer uploader for files (to catbox.moe)
async function uploadToCatbox(buffer: Buffer): Promise<string | null> {
  try {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="reqtype"\r\n\r\n` +
      `fileupload\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="fileToUpload"; filename="temp.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    
    const body = Buffer.concat([header, buffer, footer]);
    
    const res = await axios.post('https://catbox.moe/user/api.php', body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      timeout: 30000,
    });
    
    return typeof res.data === 'string' ? res.data.trim() : null;
  } catch (err) {
    console.error('Error uploading to Catbox:', err);
    return null;
  }
}

const utilityPluginsCommands: Command[] = [
  {
    name: 'countryinfo',
    description: 'Displays detailed statistics and facts about a given country',
    category: 'Utility',
    aliases: ['country', 'cinfo'],
    execute: async ({ reply, args, remoteJid, sock, msg }) => {
      const q = args.join(' ').trim();
      if (!q) {
        await reply('❌ *Usage Error:* Please provide a country name.\n\n📌 *Example:* `.countryinfo India`');
        return;
      }

      try {
        const apiUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(q)}?fullText=true`;
        const { data } = await axios.get(apiUrl, { timeout: 15000 });

        if (!Array.isArray(data) || data.length === 0) {
          await reply(`❌ *Search Error:* No information could be found for country "*${q}*".`);
          return;
        }

        const info = data[0];
        const name = info.name?.common || q;
        const capital = info.capital ? info.capital.join(", ") : "N/A";
        const continent = info.continents ? info.continents.join(", ") : "N/A";
        const phoneCode = info.idd?.root
          ? info.idd.root + (info.idd.suffixes ? info.idd.suffixes[0] : "")
          : "N/A";
        const areaKm = info.area ? `${info.area.toLocaleString()} km²` : "N/A";
        const currency = info.currencies
          ? Object.values(info.currencies)
              .map((c: any) => `${c.name} (${c.symbol || ''})`)
              .join(", ")
          : "N/A";
        const languages = info.languages
          ? Object.values(info.languages).join(", ")
          : "N/A";
        const drivingSide = info.car?.side || "N/A";
        const isoCodes = info.cca2 ? `${info.cca2}, ${info.cca3}` : "N/A";
        const tld = info.tld ? info.tld.join(", ") : "N/A";
        const borders = info.borders && info.borders.length > 0
            ? info.borders.join(", ")
            : "No neighboring land borders.";

        const text =
          `🌍 *BUGGU MD COUNTRY PROFILE: ${name.toUpperCase()}* 🌍\n\n` +
          `🏛 *Capital:* ${capital}\n` +
          `📍 *Continent:* ${continent}\n` +
          `📞 *Phone Dialing Code:* ${phoneCode}\n` +
          `📏 *Territorial Area:* ${areaKm}\n` +
          `🚗 *Driving Side:* ${drivingSide}\n` +
          `💱 *National Currency:* ${currency}\n` +
          `🔤 *Official Languages:* ${languages}\n` +
          `🌍 *ISO Country Codes:* ${isoCodes}\n` +
          `🌎 *Internet Top-Level Domain (TLD):* ${tld}\n\n` +
          `🔗 *Bordering Neighbours:* ${borders}\n\n` +
          `_Compiled automatically by BUGGU MD country index engine._`;

        const flagUrl = info.flags?.png || info.flags?.svg || null;

        if (flagUrl) {
          await sock.sendMessage(remoteJid, {
            image: { url: flagUrl },
            caption: text
          }, { quoted: msg as any });
        } else {
          await reply(text);
        }
      } catch (err: any) {
        await reply(`❌ *Network Error:* Failed to fetch details for country. Reason: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'flirt',
    description: 'Get a playful, romantic, or cheeky flirt line',
    category: 'Fun',
    aliases: ['pickup', 'lovem'],
    execute: async ({ reply }) => {
      try {
        const shizokeys = 'luckytechhubbot';
        const res = await axios.get(`https://api.shizo.top/api/quote/flirt?apikey=${shizokeys}`, { timeout: 10000 });
        const flirtMessage = res.data?.result || 'Is there an airport nearby or is that just my heart taking off?';
        await reply(`💖 *BUGGU MD LOVE ENGINE:* \n\n"${flirtMessage}" 🌸`);
      } catch (err) {
        const fallbackQuotes = [
          "Do you have a map? I keep getting lost in your eyes.",
          "Are you a Wi-Fi router? Because I'm feeling a strong connection.",
          "Is your name Google? Because you have everything I’ve been searching for.",
          "Are you a parking ticket? Because you’ve got 'FINE' written all over you."
        ];
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        await reply(`💖 *BUGGU MD LOVE ENGINE:* \n\n"${randomQuote}" 🌸`);
      }
    }
  },
  {
    name: 'llama3',
    description: 'Power and interact with the Llama3 artificial intelligence',
    category: 'AI',
    aliases: ['llama', 'ai3'],
    execute: async ({ reply, args, sock, remoteJid, msg }) => {
      const q = args.join(' ').trim();
      if (!q) {
        await reply('⚠️ *Syntax Error:* Please supply a query for the Llama3 artificial intelligence.\n\n📌 *Example:* `.llama3 Explain quantum computing`');
        return;
      }

      await sock.sendMessage(remoteJid, { react: { text: "⏳", key: msg.key } });

      try {
        const apiUrl = `https://api.davidcyriltech.my.id/ai/llama3?text=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });

        let aiResponse = '';
        if (typeof response.data === "string") {
          aiResponse = response.data.trim();
        } else if (typeof response.data === "object") {
          aiResponse = response.data.response || response.data.result || JSON.stringify(response.data);
        }

        if (!aiResponse) {
          aiResponse = "❌ System response blank.";
        }

        const AI_IMG = "https://files.catbox.moe/suqejh.jpg";

        await sock.sendMessage(remoteJid, {
          image: { url: AI_IMG },
          caption: `🤖 *BUGGU MD LLAMA-3 INTELLIGENCE* 🤖\n\n${aiResponse}\n\n_Answered instantly via DavidCyril Cloud API._`
        }, { quoted: msg as any });

        await sock.sendMessage(remoteJid, { react: { text: "✅", key: msg.key } });
      } catch (error: any) {
        await sock.sendMessage(remoteJid, { react: { text: "❌", key: msg.key } });
        await reply(`❌ *System Latency error:* Failed to reach Llama3 node: ${error.message}`);
      }
    }
  },
  {
    name: 'pair',
    description: 'Request a pairing code to link a secondary Whatsapp client',
    category: 'Connectivity',
    aliases: ['getcode', 'linkcode'],
    execute: async ({ reply, args }) => {
      const q = args.join(' ').trim();
      if (!q) {
        await reply("❌ *Syntax Error:* Please provide a valid WhatsApp number (including country code).\n\n📌 *Example:* `.pair 91701XXXXXXX`");
        return;
      }

      const cleanNumber = q.replace(/[^0-9]/g, '');
      if (cleanNumber.length < 6 || cleanNumber.length > 15) {
        await reply("❌ *Validation Error:* That phone spacing pattern is invalid. Use international format (e.g., 91xxxxxxxxxx).");
        return;
      }

      await reply("⏳ *BUGGU MD PAIRING ENGINE:* Fetching pairing connection from remote credential server...");

      try {
        const response = await axios.get(`https://arslan-md-pair-site.onrender.com/pair?number=${cleanNumber}`, { timeout: 25000 });
        if (response.data && response.data.code) {
          const code = response.data.code;
          if (code === "Service Unavailable") {
            throw new Error('Server reported Service Unavailable');
          }
          await reply(`✅ *BUGGU MD SECURE PAIRING CODE:* \n\n🗝️ CODE: *${code}*\n\n> _This code is generated exclusively for ${cleanNumber}. Do not share it!_`);
        } else {
          throw new Error('Empty payload');
        }
      } catch (err: any) {
        await reply(`⚠️ *Server Handshake Failure:* The remote pairing server is busy or down. Please try again later. Error: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'remini',
    description: 'Enhance image resolutions and details using AI Remini',
    category: 'Media',
    aliases: ['enhance', 'hdr'],
    execute: async ({ reply, msg, sock, remoteJid, args }) => {
      let imageUrl = '';

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMessage = quoted?.imageMessage || msg.message?.imageMessage;

      if (imageMessage) {
        try {
          let buffer: Buffer;
          try {
            if (quoted) {
              const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
              const fakeMessage = {
                key: {
                  remoteJid: remoteJid,
                  id: contextInfo?.stanzaId,
                  participant: contextInfo?.participant || remoteJid,
                },
                message: quoted
              };
              buffer = await downloadMediaMessage(
                fakeMessage as any,
                'buffer',
                {},
                {
                  logger: sock.logger,
                  reuploadRequest: sock.updateMediaMessage
                }
              ) as Buffer;
            } else {
              buffer = await downloadMediaMessage(
                msg as any,
                'buffer',
                {},
                {
                  logger: sock.logger,
                  reuploadRequest: sock.updateMediaMessage
                }
              ) as Buffer;
            }
          } catch (downloadErr: any) {
            console.warn('[remini downloadMediaMessage failed, trying fallback manual decryption]:', downloadErr.message);
            
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let b = Buffer.from([]);
            for await (const chunk of stream) {
              b = Buffer.concat([b, chunk]);
            }
            buffer = b;
          }
          
          const catboxUrl = await uploadToCatbox(buffer);
          if (catboxUrl) {
            imageUrl = catboxUrl;
          }
        } catch (downloadErr: any) {
          await reply(`❌ *Buffer Extraction Error:* ${downloadErr.message}`);
          return;
        }
      } else if (args[0] && args[0].startsWith('http')) {
        imageUrl = args[0];
      }

      if (!imageUrl) {
        await reply(
          `╭══✦〔 📸 *BUGGU MD REMINI ENGINE* 〕✦══╮\n` +
          `│\n` +
          `│ *Usage details:*\n` +
          `│ 💡 Reply to any image with \`.remini\`\n` +
          `│ 💡 Input a web URL link: \`.remini <url>\`\n` +
          `│\n` +
          `╰══✦═✦═✦═✦═✦═✦═✦═✦══╯`
        );
        return;
      }

      await reply('⚡ *Remini processing:* Enhancing image textures, lights, and faces via Remini AI clusters. Please wait 15-30s...');

      try {
        const apiUrl = `https://api.princetechn.com/api/tools/remini?apikey=prince&url=${encodeURIComponent(imageUrl)}`;
        const response = await axios.get(apiUrl, { timeout: 60000 });

        if (response.data && response.data.success && response.data.result) {
          const result = response.data.result;
          const enhancedUrl = result.image_url;

          if (enhancedUrl) {
            await sock.sendMessage(remoteJid, {
              image: { url: enhancedUrl },
              caption: '✨ *Image Enhanced Successfully via BUGGU MD Remini!* ✨'
            }, { quoted: msg as any });
          } else {
            throw new Error('No image URL in result');
          }
        } else {
          throw new Error('Enhancer returned invalid or unsuccessful transaction.');
        }
      } catch (err: any) {
        await reply(`❌ *Enhancement Interrupted:* Could not enhance selected picture: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'sora',
    description: 'Transform your text input into AI generated video clips',
    category: 'AI',
    aliases: ['txt2video', 't2v'],
    execute: async ({ reply, args, sock, remoteJid, msg }) => {
      const q = args.join(' ').trim();
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
      const prompt = q || quotedText;

      if (!prompt) {
        await reply('❌ *Syntax Error:* Please type or quote a descriptive video prompt.\n\n📌 *Example:* `.sora Cinematic shot of a futuristic neon city street.`');
        return;
      }

      await sock.sendMessage(remoteJid, { react: { text: "⏳", key: msg.key } });
      await reply('⏳ *BUGGU MD SORA PIPELINE:* Dispatching creative prompt sequence to text-to-video AI node...');

      try {
        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/ai/txt2video?text=${encodeURIComponent(prompt)}`;
        const { data } = await axios.get(apiUrl, { timeout: 75000, headers: { 'user-agent': 'Mozilla/5.0' } });

        const videoUrl = data?.videoUrl || data?.result || data?.data?.videoUrl;
        if (!videoUrl) {
          throw new Error('API did not reply with a video stream endpoint.');
        }

        await sock.sendMessage(remoteJid, {
          video: { url: videoUrl },
          mimetype: 'video/mp4',
          caption: `🎥 *BUGGU MD SORA AI GENERATION* 🎥\n\n📝 *Prompt:* "${prompt}"\n\n_Rendered automatically by Sora Engine._`
        }, { quoted: msg as any });

        await sock.sendMessage(remoteJid, { react: { text: "✅", key: msg.key } });
      } catch (err: any) {
        await sock.sendMessage(remoteJid, { react: { text: "❌", key: msg.key } });
        await reply(`❌ *Sora Failure:* Unable to construct video clip: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'spotify',
    description: 'Search and download tracks from Spotify playlists',
    category: 'Downloads',
    execute: async ({ reply, args, sock, remoteJid, msg }) => {
      const query = args.join(' ').trim();
      if (!query) {
        await reply('❌ *Usage Error:* Input a song title or keywords.\n\n📌 *Example:* `.spotify con calma`');
        return;
      }

      await reply('🔍 *Spotify Engine:* Searching, indexing, and downloading audio from Spotify libraries...');

      try {
        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(apiUrl, { timeout: 25000, headers: { 'user-agent': 'Mozilla/5.0' } });

        if (!data?.status || !data?.result) {
          throw new Error('Spotify API returned non-successful response.');
        }

        const r = data.result;
        const audioUrl = r.audio;
        if (!audioUrl) {
          await reply('❌ *Audio Not Found:* No downloadable stream could be retrieved for this track.');
          return;
        }

        const caption = `🎵 *BUGGU MD SPOTIFY PLAYER* 🎵\n\n` +
          `📝 *Title:* ${r.title || r.name || 'Unknown Track'}\n` +
          `👤 *Artist:* ${r.artist || 'Unknown Artist'}\n` +
          `⏱ *Duration:* ${r.duration || 'N/A'}\n` +
          `🔗 *Spotify URL:* ${r.url || 'N/A'}`;

        if (r.thumbnails) {
          await sock.sendMessage(remoteJid, {
            image: { url: r.thumbnails },
            caption: caption
          }, { quoted: msg as any });
        } else {
          await reply(caption);
        }

        await sock.sendMessage(remoteJid, {
          audio: { url: audioUrl },
          mimetype: 'audio/mpeg',
          fileName: `${(r.title || r.name || 'track').replace(/[\\/:*?"<>|]/g, '')}.mp3`
        }, { quoted: msg as any });

      } catch (err: any) {
        await reply(`❌ *Spotify Fetch Interrupted:* Failed to retrieve content from Spotify: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'viewonce',
    description: 'Bypass and retrieve the original media from a View-Once message',
    category: 'Utility',
    aliases: ['vv', 'retrieve'],
    execute: async ({ reply, msg, sock, remoteJid }) => {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quotedMessage) {
        await reply('❌ *Usage Error:* Please reply directly to a WhatsApp View-Once photo or video.');
        return;
      }

      const isViewOnceImage = quotedMessage.imageMessage?.viewOnce === true || 
                            quotedMessage.viewOnceMessage?.message?.imageMessage ||
                            msg.message?.viewOnceMessage?.message?.imageMessage;
                            
      const isViewOnceVideo = quotedMessage.videoMessage?.viewOnce === true || 
                            quotedMessage.viewOnceMessage?.message?.videoMessage ||
                            msg.message?.viewOnceMessage?.message?.videoMessage;

      let mediaMessage: any = null;
      if (isViewOnceImage) {
        mediaMessage = quotedMessage.imageMessage || 
                       quotedMessage.viewOnceMessage?.message?.imageMessage ||
                       msg.message?.viewOnceMessage?.message?.imageMessage;
      } else if (isViewOnceVideo) {
        mediaMessage = quotedMessage.videoMessage || 
                       quotedMessage.viewOnceMessage?.message?.videoMessage ||
                       msg.message?.viewOnceMessage?.message?.videoMessage;
      }

      if (!mediaMessage) {
        await reply('❌ *Context Error:* No View-Once media could be detected in this quoted message thread.');
        return;
      }

      await reply('🔓 *View-Once Decryptor:* Downloading and self-healing encrypted media stream...');

      try {
        let buffer: Buffer;
        try {
          const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
          const fakeMessage = {
            key: {
              remoteJid: remoteJid,
              id: contextInfo?.stanzaId || msg.key.id,
              participant: contextInfo?.participant || msg.key.participant || remoteJid,
            },
            message: quotedMessage
          };
          buffer = await downloadMediaMessage(
            fakeMessage as any,
            'buffer',
            {},
            {
              logger: sock.logger,
              reuploadRequest: sock.updateMediaMessage
            }
          ) as Buffer;
        } catch (downloadErr: any) {
          console.warn('[reveal downloadMediaMessage failed, trying fallback manual decryption]:', downloadErr.message);
          
          const type = isViewOnceImage ? 'image' : 'video';
          const stream = await downloadContentFromMessage(mediaMessage, type);
          let b = Buffer.from([]);
          for await (const chunk of stream) {
            b = Buffer.concat([b, chunk]);
          }
          buffer = b;
        }

        const caption = mediaMessage.caption || '';
        const header = `🔓 *BUGGU MD VIEW-ONCE DECRYPTOR* 🔓\n\n` +
          `🎭 *Type:* ${isViewOnceImage ? 'Image 📸' : 'Video 📹'}\n` +
          `${caption ? `📝 *Caption:* "${caption}"` : ''}\n\n` +
          `_Healed and re-served automatically by BUGGU MD._`;

        if (isViewOnceImage) {
          await sock.sendMessage(remoteJid, {
            image: buffer,
            caption: header
          }, { quoted: msg as any });
        } else {
          await sock.sendMessage(remoteJid, {
            video: buffer,
            caption: header,
            mimetype: 'video/mp4'
          }, { quoted: msg as any });
        }
      } catch (err: any) {
        await reply(`❌ *Decryption Failure:* Could not extract View-Once attachment: ${err.message || String(err)}`);
      }
    }
  }
];

export default utilityPluginsCommands;
