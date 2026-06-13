export interface Command {
  name: string;
  emoji: string;
  category: 'AUTOMATION' | 'SECURITY' | 'MEDIA' | 'PROFILE' | 'STATUS' | 'GROUP' | 'SYSTEM' | 'UTILITIES';
  description: string;
  usage: string;
}

export const COMMANDS: Command[] = [
  {
    name: "ping",
    emoji: "⚡",
    category: "SYSTEM",
    description: "Check bot's latency and system stability.",
    usage: ".ping"
  },
  {
    name: "menu",
    emoji: "📜",
    category: "SYSTEM",
    description: "Display main dashboard menu of BUGGU MD.",
    usage: ".menu"
  },
  {
    name: "list",
    emoji: "📋",
    category: "SYSTEM",
    description: "Display all available commands from A to Z in categorization view.",
    usage: ".list"
  },
  {
    name: "owner",
    emoji: "👑",
    category: "SYSTEM",
    description: "Display developer profiles and trigger owner tune.",
    usage: ".owner"
  },
  {
    name: "autoread",
    emoji: "👀",
    category: "AUTOMATION",
    description: "Automatically read all incoming WhatsApp messages instantly.",
    usage: ".autoread [on/off]"
  },
  {
    name: "autoreact",
    emoji: "❤️",
    category: "AUTOMATION",
    description: "Automatically react to incoming chats with beautiful presets.",
    usage: ".autoreact [on/off]"
  },
  {
    name: "autostatusview",
    emoji: "📸",
    category: "AUTOMATION",
    description: "Auto view all contacts status/stories immediately.",
    usage: ".autostatusview [on/off]"
  },
  {
    name: "autostatusreact",
    emoji: "😍",
    category: "AUTOMATION",
    description: "React dynamically to contacts status uploads.",
    usage: ".autostatusreact [on/off]"
  },
  {
    name: "autoreply",
    emoji: "🤖",
    category: "AUTOMATION",
    description: "Auto-reply to incoming messages based on intelligent AI routing.",
    usage: ".autoreply [on/off]"
  },
  {
    name: "autoreactdm",
    emoji: "💬",
    category: "AUTOMATION",
    description: "Auto-react exclusively in Direct Messages.",
    usage: ".autoreactdm [on/off]"
  },
  {
    name: "autoreactgc",
    emoji: "👨\u200d👩\u200d👧\u200d👦",
    category: "AUTOMATION",
    description: "Auto-react exclusively in WhatsApp Groups.",
    usage: ".autoreactgc [on/off]"
  },
  {
    name: "autosticker",
    emoji: "🎭",
    category: "AUTOMATION",
    description: "Automatically convert incoming images/videos into stickers.",
    usage: ".autosticker [on/off]"
  },
  {
    name: "autodownloadstatus",
    emoji: "📥",
    category: "AUTOMATION",
    description: "Auto-save status uploads locally or forward them to you.",
    usage: ".autodownloadstatus [on/off]"
  },
  {
    name: "autosavecontacts",
    emoji: "📱",
    category: "AUTOMATION",
    description: "Dynamically save temporary incoming chat contacts.",
    usage: ".autosavecontacts [on/off]"
  },
  {
    name: "autowelcome",
    emoji: "🎉",
    category: "AUTOMATION",
    description: "Send automated premium greeting cards on new group entrances.",
    usage: ".autowelcome [on/off]"
  },
  {
    name: "autogoodbye",
    emoji: "👋",
    category: "AUTOMATION",
    description: "Send farewell signals when members leave groups.",
    usage: ".autogoodbye [on/off]"
  },
  {
    name: "antidelete",
    emoji: "🛡️",
    category: "SECURITY",
    description: "Prevent status or message deletions. Tracks and forwards revoked blocks.",
    usage: ".antidelete [on/off]"
  },
  {
    name: "anticall",
    emoji: "🚫",
    category: "SECURITY",
    description: "Automatically reject incoming audio and video calls.",
    usage: ".anticall [on/off]"
  },
  {
    name: "antilink",
    emoji: "🔗",
    category: "SECURITY",
    description: "Kick/warn users who send links in community groups.",
    usage: ".antilink [on/off]"
  },
  {
    name: "tovoice",
    emoji: "🎤",
    category: "MEDIA",
    description: "Convert video or audio files to standard WhatsApp voice notes.",
    usage: ".tovoice [reply to media]"
  },
  {
    name: "tourl",
    emoji: "🌐",
    category: "MEDIA",
    description: "Upload videos, files or images to global cloud host return CDN link.",
    usage: ".tourl [reply to media]"
  },
  {
    name: "enhance",
    emoji: "✨",
    category: "MEDIA",
    description: "Enhance image aesthetics with sharp scaling filters.",
    usage: ".enhance [reply to image]"
  },
  {
    name: "song",
    emoji: "🎵",
    category: "MEDIA",
    description: "Search Spotify track database and download standard MP3 file.",
    usage: ".song [track name / query]"
  },
  {
    name: "setpp",
    emoji: "🖼️",
    category: "PROFILE",
    description: "Update the bot's standard WhatsApp Profile Picture.",
    usage: ".setpp [reply to image]"
  },
  {
    name: "getpp",
    emoji: "👤",
    category: "PROFILE",
    description: "Query and extract a contact's profile photo.",
    usage: ".getpp [tag user / click reply]"
  },
  {
    name: "getbio",
    emoji: "📝",
    category: "PROFILE",
    description: "Retrieve about/bio profile configurations of tagged users.",
    usage: ".getbio [tag user]"
  },
  {
    name: "userinfo",
    emoji: "📋",
    category: "PROFILE",
    description: "Construct detailed dossier card on targeted account.",
    usage: ".userinfo [tag user]"
  },
  {
    name: "tostatus",
    emoji: "📢",
    category: "STATUS",
    description: "Publish texts, photos, or media directly to WhatsApp Status.",
    usage: ".tostatus [text/caption]"
  },
  {
    name: "forwardstatus",
    emoji: "🔄",
    category: "STATUS",
    description: "Forward selected media status block to targeted contact logs.",
    usage: ".forwardstatus"
  },
  {
    name: "vcard",
    emoji: "📇",
    category: "UTILITIES",
    description: "Generate beautiful official contact VCards.",
    usage: ".vcard [parameters]"
  },
  {
    name: "caption",
    emoji: "🏷️",
    category: "UTILITIES",
    description: "Edit image captions or construct formatting filters.",
    usage: ".caption [new caption]"
  },
  {
    name: "whois",
    emoji: "🔍",
    category: "UTILITIES",
    description: "Perform global search lookup details on JIDs and accounts.",
    usage: ".whois [JID / tag]"
  },
  {
    name: "pakinfo",
    emoji: "🔍",
    category: "UTILITIES",
    description: "Fetch premium registry details for Pakistani mobile numbers.",
    usage: ".pakinfo [mobile mobile_number]"
  },
  {
    name: "indinfo",
    emoji: "🔍",
    category: "UTILITIES",
    description: "Query and find detailed registry profiles for Indian phone numbers.",
    usage: ".indinfo [indian mobile_number]"
  },
  {
    name: "minfo",
    emoji: "🍿",
    category: "UTILITIES",
    description: "Query IMDb search engine to extract film records and info details.",
    usage: ".minfo [movie title]"
  },
  {
    name: "listadmins",
    emoji: "👥",
    category: "GROUP",
    description: "Format and display full community administrators roster.",
    usage: ".listadmins"
  },
  {
    name: "leavegc",
    emoji: "🚪",
    category: "GROUP",
    description: "Leave active group chat elegantly with exit announcement.",
    usage: ".leavegc"
  },
  {
    name: "setprefix",
    emoji: "⚙️",
    category: "SYSTEM",
    description: "Configure primary action indicator prefixes dynamically.",
    usage: ".setprefix [character]"
  },
  {
    name: "alive",
    emoji: "🐣",
    category: "SYSTEM",
    description: "Check bot's alive status, active configurations, and runtime settings.",
    usage: ".alive"
  },
  {
    name: "help",
    emoji: "❓",
    category: "SYSTEM",
    description: "Display general help and interactive menu categories.",
    usage: ".help"
  },
  {
    name: "settings",
    emoji: "⚙️",
    category: "SYSTEM",
    description: "View all active automation toggle controls and server preferences.",
    usage: ".settings"
  },
  {
    name: "newsletter",
    emoji: "📢",
    category: "SYSTEM",
    description: "Display official BUGGU MD updates and channel join-links.",
    usage: ".newsletter"
  },
  {
    name: "channel",
    emoji: "📺",
    category: "SYSTEM",
    description: "Explore official BUGGU developer community channels.",
    usage: ".channel"
  }
];
