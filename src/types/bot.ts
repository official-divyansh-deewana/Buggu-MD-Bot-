import { WASocket, proto } from '@whiskeysockets/baileys';

export interface CommandContext {
  sock: WASocket;
  msg: proto.IWebMessageInfo;
  remoteJid: string;
  args: string[];
  fullText: string;
  sender: string;
  senderName: string;
  isOwner: boolean;
  reply: (text: string, options?: any) => Promise<any>;
}

export interface Command {
  name: string;
  description: string;
  category: string;
  aliases?: string[];
  execute: (ctx: CommandContext) => Promise<void> | void;
}
