import dotenv from 'dotenv';
dotenv.config();

export const config = {
  botName: process.env.BOT_NAME || 'BUGGU MD',
  ownerName: process.env.OWNER_NAME || 'Divyansh Deewana',
  ownerNumber: process.env.OWNER_NUMBER || '917014631313', // default placeholder
  prefix: process.env.PREFIX || '.',
  version: '1.2.0',
  sessionPath: 'sessions/buggu-md',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'silent', // 'silent' keeps the Baileys terminal clean, 'info' / 'debug' for diagnostic logging
  ownerImage: 'https://i.ibb.co/twfrpLDy/x.jpg',
  botImage: 'https://i.ibb.co/tT1Z8nV6/x.jpg',
};

export default config;
