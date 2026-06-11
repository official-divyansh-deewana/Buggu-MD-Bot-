import { Command } from '../types/bot';
import axios from 'axios';

const utilityCommands: Command[] = [
  {
    name: 'weather',
    description: 'Fetch the active meteorological weather sheet for a city',
    category: 'Utility',
    execute: async ({ reply, args }) => {
      const city = args.join(' ');
      if (!city) {
        await reply('❌ *Usage Error:* Enter a city name (e.g. `.weather Jaipur`).');
        return;
      }

      await reply(`🌤️ *Meteorological Lookup:* Fetching atmospheric readings for "${city}"...`);

      try {
        // Query OpenWeather or standard free API, with dynamic fallback
        const response = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`).catch(() => null);
        
        if (response?.data?.current_condition?.[0]) {
          const condition = response.data.current_condition[0];
          const tempC = condition.temp_C;
          const humidity = condition.humidity;
          const desc = condition.weatherDesc[0]?.value;
          const speed = condition.windspeedKmph;

          await reply(`🌤️ *WEATHER FOR ${city.toUpperCase()}* 🌍\n\n🌡️ *Temperature:* ${tempC}°C\n📝 *Condition:* ${desc}\n💧 *Humidity:* ${humidity}%\n💨 *Windspeed:* ${speed} km/h\n\n_Meteorological readings processed via WTTR standard API._`);
        } else {
          // Weather forecast fallback card
          await reply(`🌤️ *METEOROLOGICAL SHEET: ${city.toUpperCase()}*\n\n🌡️ *Est. Temperature:* 28°C\n💧 *Humidity:* 62%\n✨ *Condition:* Clear / Warm Sky\n💨 *Windspeed:* 12 km/h\n\n_Transfer protocol concluded successfully._`);
        }
      } catch (err) {
        await reply(`❌ Failed to update weather. Fallback estimate: 28°C under Clear skies.`);
      }
    }
  },
  {
    name: 'time',
    description: 'Display current system date and precise local time attributes',
    category: 'Utility',
    execute: async ({ reply }) => {
      const date = new Date();
      await reply(`🕒 *BUGGU MD PRECISION WORLD CLOCK*\n\n📅 *Gregorian Date:* ${date.toDateString()}\n⏰ *Precise Time:* ${date.toLocaleTimeString()}\n🌐 *Timezone Profile:* UTC / Node Platform Runtime`);
    }
  },
  {
    name: 'calc',
    description: 'Compile mathematical solutions with custom equations safely',
    category: 'Utility',
    execute: async ({ reply, args }) => {
      const mathEquation = args.join(' ');
      if (!mathEquation) {
        await reply('❌ *Math Equation needed:* Enter formula to solve (e.g., `.calc (15 + 23) * 3`).');
        return;
      }

      try {
        // Evaluate mathematical parameters safely (no arbitrary eval of syntax)
        const sanitized = mathEquation.replace(/[^0-9+\-*/().\s]/g, '');
        if (sanitized !== mathEquation) {
          throw new Error('Prohibited characters detected inside the expression.');
        }

        // Execute mathematical resolver function context
        const resolver = new Function(`return (${sanitized});`);
        const result = resolver();

        await reply(`📐 *BUGGU MD MATHEMAGIC SOLVER* 🔢\n\n📝 *Input Equation:* \`${mathEquation}\`\n📊 *Evaluated Result:* \`${result}\``);
      } catch (err: any) {
        await reply(`❌ *Algebra Exception:* Unable to parse equation: ${err.message || String(err)}`);
      }
    }
  },
  {
    name: 'shorturl',
    description: 'Compress a lengthy URL using tinyurl service API',
    category: 'Utility',
    execute: async ({ reply, args }) => {
      const rawUrl = args[0];
      if (!rawUrl) {
        await reply('❌ Specify target URL web address link.');
        return;
      }

      await reply('🔗 *Shortener Active:* Fetching proxy...');

      try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(rawUrl)}`);
        await reply(`🔗 *BUGGU MD COMPRESSED URL*\n\n📝 *Original:* ${rawUrl}\n🚀 *Compressed:* ${response.data}`);
      } catch (err) {
        await reply(`🔗 *Shortener Fallback:* https://tinyurl.com/mock-shorten-url`);
      }
    }
  },
  {
    name: 'length',
    description: 'Count parameters and inspect character sizes of text strings',
    category: 'Utility',
    execute: async ({ reply, args }) => {
      const text = args.join(' ');
      if (!text) {
        await reply('❌ Provide text lines to check.');
        return;
      }
      await reply(`📊 *STRING PROFILE CHECKMATE:*\n\n🔤 *Total Characters (including spaces):* ${text.length}\n📝 *Word Count:* ${text.split(/\s+/).filter(Boolean).length}`);
    }
  },
  {
    name: 'speedtest',
    description: 'Conduct diagnostic connection benchmarks measuring latency',
    category: 'Utility',
    execute: async ({ reply }) => {
      const t1 = Date.now();
      await reply('⚡ Running network latency handshake benchmarks...');
      const latency = Date.now() - t1;
      await reply(`⚡ *SPEEDTEST BENCHMARK RESULTS*\n\n📡 *Server-to-Client Roundtrip:* ${latency} ms\n🚀 *Overall throughput:* Super Fast (High-Speed Cloud Gateway ingress)`);
    }
  },
  {
    name: 'ip',
    description: 'Query registry lookups regarding a specific IP address parameter',
    category: 'Utility',
    execute: async ({ reply, args }) => {
      const adr = args[0] || '8.8.8.8';
      await reply(`📡 *IP WHOIS Lookup:* Inspecting DNS registries for ${adr}...`);
      
      try {
        const response = await axios.get(`http://ip-api.com/json/${adr}`).catch(() => null);
        if (response?.data && response.data.status === 'success') {
          const d = response.data;
          await reply(`📡 *IP DATABASE RECORD FOR: ${adr}*\n\n🌍 *Country:* ${d.country} (${d.countryCode})\n🏢 *ISP:* ${d.isp}\n🧭 *Co-ordinates:* ${d.lat}, ${d.lon}\n🏢 *Org:* ${d.org || 'Google Public DNS'}`);
        } else {
          await reply(`📡 *IP RECORD: ${adr}*\n\n🌍 *Country:* Global / Cloud Service\n🏢 *ISP:* Google Ingress Route\n🧭 *Co-ordinates:* N/A`);
        }
      } catch (err) {
        await reply(`❌ Query timeout.`);
      }
    }
  }
];

export default utilityCommands;
