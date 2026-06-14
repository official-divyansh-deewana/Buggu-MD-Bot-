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
  },
  {
    name: "welcome",
    emoji: "👋",
    category: "AUTOMATION",
    description: "Toggle automated welcome greeting notifications on group entry.",
    usage: ".welcome [on/off]"
  },
  {
    name: "autotyping",
    emoji: "⌨️",
    category: "AUTOMATION",
    description: "Toggle auto typing simulation behavior on incoming messages.",
    usage: ".autotyping [on/off]"
  },
  {
    name: "recording",
    emoji: "🎤",
    category: "AUTOMATION",
    description: "Toggle auto voice recording simulation behavior.",
    usage: ".recording [on/off]"
  },
  {
    name: "online",
    emoji: "🌐",
    category: "AUTOMATION",
    description: "Force bot to stay always available online on WhatsApp.",
    usage: ".online [on/off]"
  },
  {
    name: "statusview",
    emoji: "📸",
    category: "AUTOMATION",
    description: "Toggle status auto viewing system.",
    usage: ".statusview [on/off]"
  },
  {
    name: "statuslike",
    emoji: "😍",
    category: "AUTOMATION",
    description: "Toggle status auto liking and reacting system.",
    usage: ".statuslike [on/off]"
  },
  {
    name: "antiedit",
    emoji: "🛠️",
    category: "SECURITY",
    description: "Track message edits and print original content into chat.",
    usage: ".antiedit [on/off]"
  },
  {
    name: "adminaction",
    emoji: "⚡",
    category: "SECURITY",
    description: "Log group administrative promotions and demotions live.",
    usage: ".adminaction [on/off]"
  },
  {
    name: "mode",
    emoji: "🪐",
    category: "SYSTEM",
    description: "Toggle bot responder audience mode to public, private, or inbox solo.",
    usage: ".mode [public/private/inbox]"
  },
  {
    name: "prefix",
    emoji: "⚙️",
    category: "SYSTEM",
    description: "Configure bot response indicator prefix alias.",
    usage: ".prefix [character]"
  },
  {
    name: "botname",
    emoji: "🤖",
    category: "SYSTEM",
    description: "Double-check or modify target bot label designation.",
    usage: ".botname [new name]"
  },
  {
    name: "ownername",
    emoji: "👑",
    category: "SYSTEM",
    description: "Double-check or modify core developer name credential.",
    usage: ".ownername [new name]"
  },
  {
    name: "ownernumber",
    emoji: "📱",
    category: "SYSTEM",
    description: "Double-check or change primary registered owner contact JID.",
    usage: ".ownernumber [phone]"
  },
  {
    name: "description",
    emoji: "⚙️",
    category: "SYSTEM",
    description: "Check or configure server status description card.",
    usage: ".description [text]"
  },
  {
    name: "botdp",
    emoji: "🖼️",
    category: "SYSTEM",
    description: "View or configure bot default profile picture asset link.",
    usage: ".botdp [imageUrl]"
  },
  {
    name: "setwelcome",
    emoji: "🎉",
    category: "AUTOMATION",
    description: "Set customized group entry welcome notification layout.",
    usage: ".setwelcome [text]"
  },
  {
    name: "setgoodbye",
    emoji: "👋",
    category: "AUTOMATION",
    description: "Set customized group departure goodbye layout.",
    usage: ".setgoodbye [text]"
  },
  {
    name: "sudo",
    emoji: "🚀",
    category: "SECURITY",
    description: "Add a phone number to standard sudo master list.",
    usage: ".sudo [phone]"
  },
  {
    name: "delsudo",
    emoji: "🚪",
    category: "SECURITY",
    description: "Remove phone number from master sudo registry.",
    usage: ".delsudo [phone]"
  },
  {
    name: "listsudo",
    emoji: "👑",
    category: "SECURITY",
    description: "View all master sudo key holders listed on the bot.",
    usage: ".listsudo"
  },
  {
    name: "ban",
    emoji: "🚫",
    category: "SECURITY",
    description: "Ban targeted account from executing bot controls.",
    usage: ".ban [@user / phone]"
  },
  {
    name: "unban",
    emoji: "❇️",
    category: "SECURITY",
    description: "Pardon account to regain active bot lookup permissions.",
    usage: ".unban [@user / phone]"
  },
  {
    name: "listban",
    emoji: "📂",
    category: "SECURITY",
    description: "View compiled list of all restricted user directories.",
    usage: ".listban"
  }
];
