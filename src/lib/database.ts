import fs from 'fs';
import path from 'path';
import { config } from '../config/config';

export interface UserData {
  id: string;
  name: string;
  isPremium?: boolean;
}

export interface GroupData {
  id: string;
  antilink?: boolean;
  antibadword?: boolean;
  antidelete?: boolean;
  welcome?: boolean;
  goodbye?: boolean;
  mute?: boolean;
  warns: Record<string, number>;
}

export interface GlobalSettings {
  alwaysonline: boolean;
  autoread: boolean;
  autoreact: boolean;
  autotyping: boolean;
  autorecording: boolean;
  autostatusview: boolean;
  autostatusreact: boolean;
  antidelete: boolean;
  prefix: string;
  botname: string;
}

export interface DatabaseSchema {
  users: Record<string, UserData>;
  groups: Record<string, GroupData>;
  settings: GlobalSettings;
  premium: string[];
}

const dbDir = path.dirname(path.join(process.cwd(), config.sessionPath));
const dbPath = path.join(dbDir, 'database.json');

const defaultDb: DatabaseSchema = {
  users: {},
  groups: {},
  settings: {
    alwaysonline: false,
    autoread: false,
    autoreact: false,
    autotyping: false,
    autorecording: false,
    autostatusview: false,
    autostatusreact: false,
    antidelete: false,
    prefix: config.prefix,
    botname: config.botName,
  },
  premium: [],
};

class DatabaseManager {
  private db: DatabaseSchema = { ...defaultDb };

  constructor() {
    this.load();
  }

  public get data(): DatabaseSchema {
    return this.db;
  }

  // Reload data from disk
  public load() {
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, 'utf8');
        this.db = JSON.parse(raw);
        
        // Ensure nested structure safety
        if (!this.db.users) this.db.users = {};
        if (!this.db.groups) this.db.groups = {};
        if (!this.db.premium) this.db.premium = [];
        if (!this.db.settings) {
          this.db.settings = { ...defaultDb.settings };
        } else {
          this.db.settings = {
            ...defaultDb.settings,
            ...this.db.settings,
          };
        }
      } else {
        this.db = { ...defaultDb };
        this.save();
      }
    } catch (err) {
      console.error('[DATABASE LOAD ERROR]', err);
      this.db = { ...defaultDb };
    }
  }

  // Save database schema back to disk
  public save() {
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(dbPath, JSON.stringify(this.db, null, 2), 'utf8');
    } catch (err) {
      console.error('[DATABASE SAVE ERROR]', err);
    }
  }

  // Group helpers
  public getGroup(groupId: string): GroupData {
    if (!this.db.groups[groupId]) {
      this.db.groups[groupId] = {
        id: groupId,
        antilink: false,
        antibadword: false,
        antidelete: false,
        welcome: false,
        goodbye: false,
        mute: false,
        warns: {},
      };
      this.save();
    }
    return this.db.groups[groupId];
  }

  public updateGroup(groupId: string, update: Partial<GroupData>) {
    const group = this.getGroup(groupId);
    this.db.groups[groupId] = {
      ...group,
      ...update,
    };
    this.save();
  }

  // User helpers
  public getUser(userId: string, name: string = 'User'): UserData {
    if (!this.db.users[userId]) {
      this.db.users[userId] = {
        id: userId,
        name,
        isPremium: false,
      };
      this.save();
    }
    return this.db.users[userId];
  }

  public updateUser(userId: string, update: Partial<UserData>) {
    const user = this.getUser(userId);
    this.db.users[userId] = {
      ...user,
      ...update,
    };
    this.save();
  }

  // Premium Management
  public addPremium(jid: string) {
    const formatted = jid.toLowerCase().trim();
    if (!this.db.premium.includes(formatted)) {
      this.db.premium.push(formatted);
      this.save();
    }
  }

  public removePremium(jid: string) {
    const formatted = jid.toLowerCase().trim();
    this.db.premium = this.db.premium.filter((id) => id !== formatted);
    this.save();
  }

  public isPremium(jid: string): boolean {
    const formatted = jid.toLowerCase().trim();
    return this.db.premium.includes(formatted);
  }

  // Get total counts for dashboard usage
  public getCounts() {
    return {
      users: Object.keys(this.db.users).length,
      groups: Object.keys(this.db.groups).length,
      premium: this.db.premium.length,
    };
  }
}

export const db = new DatabaseManager();
export default db;
