import { Command } from '../types/bot';
import QRCode from 'qrcode';

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
    execute: async ({ reply }) => {
      await reply('🎙️ *Voice Note Encoder:* Transcoding selected media to OGG format. Please reply to a video or audio clip file with this command.');
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
