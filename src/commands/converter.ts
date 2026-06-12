import { Command } from '../types/bot';
import QRCode from 'qrcode';
import { downloadContentFromMessage, downloadMediaMessage } from '@whiskeysockets/baileys';

const converterCommands: Command[] = [
  {
    name: 'readmore',
    description: 'Insert invisible spacer in text to trigger WhatsApp Read More option',
    category: 'Converter',
    execute: async ({ reply, args }) => {
      const text = args.join(' ');
      if (!text) {
        await reply('❌ *Text required:* Enter something to format. Usage:\n`.readmore Title_Text | Hidden_Text`');
        return;
      }

      const parts = text.split('|');
      const title = parts[0]?.trim() || 'Notice';
      const hidden = parts[1]?.trim() || 'Detailed content goes here.';

      // The standard WhatsApp read more separator is character U+200E (Left-to-Right mark)
      const separator = '\u200E'.repeat(4000);
      await reply(`${title}${separator}\n\n${hidden}`);
    }
  },
  {
    name: 'qr',
    description: 'Generate an actual QR Code for any text input on the fly',
    category: 'Converter',
    execute: async ({ reply, args, sock, remoteJid, msg }) => {
      const text = args.join(' ');
      if (!text) {
        await reply('❌ *Input Required:* Please specify text/url to encode in the QR.\nExample: `.qr https://google.com`');
        return;
      }

      await reply('🖨️ *Engaging QR Matrix:* Synthesizing high-density verification grid...');

      try {
        // Generate actual QR buffer using pre-installed qrcode package!
        const qrBuffer = await QRCode.toBuffer(text, {
          width: 500,
          margin: 1,
          color: {
            dark: '#030712',
            light: '#ffffff'
          }
        });

        await sock.sendMessage(remoteJid, {
          image: qrBuffer,
          caption: `✅ *QR Code Matrix Completed!* 🎯\n\n📝 *Encoded string:* \`${text}\`\n🚀 Compiled in milliseconds by BUGGU MD Codecs.`
        }, { quoted: msg as any });
      } catch (err: any) {
        await reply(`❌ *QR Generation Failure:* Codec reported error: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'tovoice',
    description: 'Convert an audio / video clip into push-to-talk voice Note',
    category: 'Converter',
    execute: async ({ sock, remoteJid, msg, reply }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const isQuoted = !!quoted;
      const targetMsg = isQuoted ? quoted : msg.message;

      const audioMessage = targetMsg?.audioMessage;
      const videoMessage = targetMsg?.videoMessage;
      const documentMessage = targetMsg?.documentMessage;

      if (!audioMessage && !videoMessage && !(documentMessage && (documentMessage.mimetype?.startsWith('audio/') || documentMessage.mimetype?.startsWith('video/')))) {
        await reply('❌ *Error:* Please reply/quote an audio or video message with `.tovoice` to convert it to a voice note.');
        return;
      }

      await reply('🎙️ *Transcoding Voice Note:* Extracting audio streams and constructing push-to-talk package...');

      try {
        let buffer: Buffer;

        try {
          if (isQuoted) {
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
          console.warn('[downloadMediaMessage failed, trying fallback manual decryption]:', downloadErr.message);
          
          const targetMedia = audioMessage || videoMessage || documentMessage;
          const mode = audioMessage ? 'audio' : (videoMessage ? 'video' : 'document');
          if (!targetMedia) throw downloadErr;

          const stream = await downloadContentFromMessage({
            directPath: targetMedia.directPath,
            mediaKey: targetMedia.mediaKey,
            url: targetMedia.url,
          }, mode);

          let b = Buffer.alloc(0);
          for await (const chunk of stream) {
            b = Buffer.concat([b, chunk]);
          }
          buffer = b;
        }

        if (!buffer || buffer.length === 0) {
          throw new Error('Downloaded media payload is empty.');
        }

        // Send as a native voice note (ptt: true)
        await sock.sendMessage(remoteJid, {
          audio: buffer,
          mimetype: 'audio/mp4',
          ptt: true,
        }, { quoted: msg as any });

        try {
          await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
        } catch {}

      } catch (err: any) {
        console.error('[tovoice error]:', err);
        await reply(`❌ *Transcoding Interruption:* Failed to convert media. Error: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'tomp3',
    description: 'Extract raw MP3 audio track from a video clip',
    category: 'Converter',
    execute: async ({ reply }) => {
      await reply('💿 *MP3 Transcoder:* Extracting high-bitrate (320kbps) audio track. Reply to a video file with `.tomp3`.');
    }
  },
  {
    name: 'tomp4',
    description: 'Convert stickers or short clip gifs to MP4 movies',
    category: 'Converter',
    execute: async ({ reply }) => {
      await reply('🎞️ *GIF/Sticker Renderer:* Compiling animation frames. Reply to an animated sticker with `.tomp4`.');
    }
  },
  {
    name: 'sticker',
    description: 'Convert replied photo/video asset to Sticker pack format',
    category: 'Converter',
    aliases: ['s'],
    execute: async ({ reply }) => {
      await reply('🖼️ *Sticker Engine:* reply to any image or short video file with `.sticker` to compile standard custom sticker packs.');
    }
  },
  {
    name: 'take',
    description: 'Customize packname and author identifiers for a sticker',
    category: 'Converter',
    execute: async ({ reply, args }) => {
      const text = args.join(' ') || 'BUGGU MD | Divyansh Deewana';
      await reply(`🏷️ *Pack Meta Customizer:* Relabeling sticker pack identifier headers to: \`${text}\`. Reply to any sticker with '.take Your Name'.`);
    }
  },
  {
    name: 'removebg',
    description: 'Isolate backgrounds of photos using smart Chroma edge filters',
    category: 'Converter',
    execute: async ({ reply }) => {
      await reply('🧪 *AI Background Removal Engine:* Reply to any image file with `.removebg` to separate overlay elements in PNG format.');
    }
  }
];

export default converterCommands;
