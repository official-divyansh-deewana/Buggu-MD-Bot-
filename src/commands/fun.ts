import { Command } from '../types/bot';

const truths = [
  'What is your biggest fear that you have never told anyone?',
  'Have you ever lied about your age to get into somewhere?',
  'What is the most embarrassing thing in your web search history?',
  'Who was your first secret crush inside this chat workspace?',
  'If you had to marry any active chatbot, which one would you choose?',
  'What is the funniest rumor you have ever heard about yourself?',
];

const dares = [
  'Send a ridiculous Voice Note singing your favorite nursery rhyme.',
  'Change your WhatsApp Profile description status to: "Powered by BUGGU MD" for 24 hours.',
  'Send your most embarrassing meme or photo to this current group chat right now!',
  'Unmute your microphone and read the last text you sent out loud inside private chat.',
  'Tag any random contact in this group and tell them why they are amazing.',
];

const facts = [
  'Wombat feces are cube-shaped, which stops them from rolling away and helps them mark territory.',
  'Bananas are slightly radioactive because they contain high levels of potassium.',
  'Honey never spoils. You can eat 3,000-year-old Egyptian tomb honey safely.',
  'The first computer bug was an actual real moth found trapped inside a relay in 1947.',
  'Before Erasers were invented, people used rolled-up moist breadcrumbs to erase writing pencil marks.',
];

const quotes = [
  '"The only limit to our realization of tomorrow will be our doubts of today." — Franklin D. Roosevelt',
  '"Code is like humor. When you have to explain it, it’s bad." — Cory House',
  '"The mind is everything. What you think you become." — Buddha',
  '"Simplicity is the soul of efficiency." — Austin Freeman',
  '"Strive not to be a success, but rather to be of value." — Albert Einstein',
];

const jokes = [
  'Why do programmers wear glasses? Because they can’t C#!',
  'How many programmers does it take to change a lightbulb? None, that’s a hardware problem!',
  'Why did the React components feel detached? They had no context!',
  'A SQL query walks into a bar, walks up to two tables and asks, "Can I join you?"',
  'There are 10 types of people in the world: those who understand binary, and those who don’t.',
];

const pickups = [
  'Are you a keyboard? Because you are definitely my type.',
  'Are you a computer program? Because you have fully optimized my heart.',
  'Are you an API? Because I want to fetch resources from you all day.',
  'Do you have a map? Because I keep getting lost in your style.',
  'No server latency could slow down my connection to you.',
];

const funCommands: Command[] = [
  {
    name: 'truth',
    description: 'Get a clean truth question',
    category: 'Fun',
    execute: async ({ reply, senderName }) => {
      const q = truths[Math.floor(Math.random() * truths.length)];
      await reply(`🤔 *TRUTH CHOC:* @${senderName}\n\n"${q}"`);
    }
  },
  {
    name: 'dare',
    description: 'Get an action challenge dare',
    category: 'Fun',
    execute: async ({ reply, senderName }) => {
      const d = dares[Math.floor(Math.random() * dares.length)];
      await reply(`⚡ *DARE CHALLENGE:* @${senderName}\n\n"${d}"`);
    }
  },
  {
    name: 'fact',
    description: 'Fetch interesting trivia trivia fact',
    category: 'Fun',
    execute: async ({ reply }) => {
      const f = facts[Math.floor(Math.random() * facts.length)];
      await reply(`💡 *BUGGU MD MIND EXTRA FACT:*\n\n"${f}"`);
    }
  },
  {
    name: 'quote',
    description: 'Get a beautiful philosophical quote',
    category: 'Fun',
    execute: async ({ reply }) => {
      const q = quotes[Math.floor(Math.random() * quotes.length)];
      await reply(`✨ *INSPIRATION CAPSULE:*\n\n${q}`);
    }
  },
  {
    name: 'joke',
    description: 'Tell a funny programmer or computer joke',
    category: 'Fun',
    execute: async ({ reply }) => {
      const j = jokes[Math.floor(Math.random() * jokes.length)];
      await reply(`🤪 *BUGGU MD LAUGHTER:*\n\n${j}`);
    }
  },
  {
    name: 'pickup',
    description: 'Get a geeky coding pickup line',
    category: 'Fun',
    execute: async ({ reply }) => {
      const p = pickups[Math.floor(Math.random() * pickups.length)];
      await reply(`💘 *PICKUP FLIRT VALVE:*\n\n${p}`);
    }
  },
  {
    name: 'ship',
    description: 'Matchmake or check the chemistry score of two tags',
    category: 'Fun',
    execute: async ({ reply, args }) => {
      const target1 = args[0] || 'You';
      const target2 = args[1] || 'BUGGU MD';
      const lovePercent = Math.floor(Math.random() * 101);

      let emoji = '💔 (Disaster)';
      if (lovePercent > 75) emoji = '💖 (Heavenly Match!)';
      else if (lovePercent > 45) emoji = '🤝 (Perfect friendship core)';

      await reply(`🧪 *CHEMISTRY MATCH CALCULATOR*\n\n❤️ *Partner A:* ${target1}\n🤝 *Partner B:* ${target2}\n\n💹 *Compatibility Index:* ${lovePercent}%\n🔥 *Verdict:* ${emoji}`);
    }
  },
  {
    name: 'rate',
    description: 'Rate something from 1 to 100',
    category: 'Fun',
    execute: async ({ reply, args }) => {
      const query = args.join(' ');
      if (!query) {
        await reply('❌ What do you want me to rate? (e.g. `.rate My Coding`)');
        return;
      }
      const score = Math.floor(Math.random() * 101);
      await reply(`📊 *BUGGU MD RATING HUB*\n\n🔍 *Item:* "${query}"\n⭐ *Rating:* ${score}/100`);
    }
  },
  {
    name: 'hack',
    description: 'Engage a visually stunning hacker simulation matrix sequence',
    category: 'Fun',
    execute: async ({ reply, args }) => {
      const target = args.join(' ') || 'this server workspace';
      await reply(`👾 [SYSTEM INIT] Spawning overlay kernel for: "${target}"...\n💀 Fetching socket ports...\n📡 Injecting backdoors into secure cache...`);
      
      // Delay slightly for hilarious simulation effect
      setTimeout(async () => {
        await reply(`🔒 [EXPLOIT SUCCEEDED] Root control confirmed.\n👤 User: Admin_System_MD\n💰 Transferring premium database logs...\n\n👾 *${target.toUpperCase()} SHIELD TERMINATED!* (Just simulate)`);
      }, 3000);
    }
  },
  {
    name: 'roast',
    description: 'Playfully roast a person',
    category: 'Fun',
    execute: async ({ reply, args }) => {
      const target = args.join(' ') || 'You';
      const roasts = [
        `Hey ${target}, I'd explain it to you, but I don't have enough bandwidth for that level of processing.`,
        `${target}, you're the reason they had to print details on shampoo bottles.`,
        `If ${target} was a compiler, they would throw 200 errors on empty code.`,
        `${target}, my code runs much faster than your mental cycles.`,
      ];
      const r = roasts[Math.floor(Math.random() * roasts.length)];
      await reply(`🔥 *BUGGU MD ROAST LOGS:*\n\n"${r}"`);
    }
  }
];

export default funCommands;
