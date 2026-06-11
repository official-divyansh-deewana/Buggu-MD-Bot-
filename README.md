# 🐣 BUGGU MD 

A high-performance, production-ready WhatsApp Multi-Device Bot framework centered around an ES Modules + Express server architecture, powered by `@whiskeysockets/baileys` and dynamic Google Gemini 3.5 Flash server-side models. It comes with a stunning black geometric balanced web dashboard to control socket states, QR authentication, and live activity streams.

Developed with precision and craft by **Divyansh Deewana**.

---

## 🛠️ Tech Stack & Architecture

- **Runtime:** Node.js (with standard ESM modules)
- **Server Scaffold:** Express.js (on default ingress Port `3000`)
- **WhatsApp Web Protocol Implementation:** Baileys Client Socket
- **UI Framework:** React 18+ coupled with Vite compiled headers
- **AI Core:** Google Gemini `@google/genai` (with lazy client-side security limits)
- **Database Core:** Highly responsive local JSON persistent storage engine (`sessions/database.json`)
- **Styling:** Tailwinds Utility Classes with Geometric Balance aesthetics

---

## 🚀 Key Features

### 1. Dual Authentication Suite
- **QR Display:** Dynamically renders the live Baileys authenticator QR matrix onto the React client dashboard inside the browser.
- **8-Digit Pairing Code:** Connect by simply entering the phone number with country prefix and copy-pasting the matching pairing prompt code.

### 2. Global Toggles & Automated Triggers
- **Always-Online:** Triggers persistent `available` presence ticks.
- **Auto-Read:** Instantly reports messages as viewed.
- **Auto-React:** Selects and posts random emoji feedbacks.
- **Story Status Automations:** Views and reacts to contacts' story status broadsheets automatically.

### 3. Smart Workspace Guards
- **Anti-Link Shield:** Automatically scans, issues warnings, and deletes URL link drops inside group chats.
- **Anti-Badword Scanner:** Detects obscenities, increments warning tallies, and deletes the message.
- **Warning Threshold (3/3 Kicks):** Kicks members automatically when warn logs hit 3/3 limits.
- **Anti-Delete Interceptor:** Holds an in-memory message history index to capture and repost messages that get deleted in active rooms.

### 4. Dynamic Commands Categories
- **AI Assistant:** `.ai`, `.image` (text-to-image), `.code`, `.translate`, `.summarize`
- **Group Administration:** `.tagall`, `.hidetag`, `.mute`, `.unmute`, `.promote`, `.demote`, `.kick`, `.add`, `.warn`, `.unwarn`, `.warnings`
- **Downloader Suite:** `.instagram`, `.fb`, `.tiktok`, `.twitter`, `.play`, `.song`, `.video`, `.pinterest`, `.mediafire`
- **Converter Engine:** `.readmore`, `.qr` (buffer generator), `.sticker`, `.take`, `.tovoice`, `.tomp3`, `.tomp4`, `.removebg`
- **Entertainment/Fun Games:** `.truth`, `.dare`, `.fact`, `.quote`, `.joke`, `.pickup`, `.roast`, `.hack`, `.ship`, `.rate`
- **Utilities:** `.weather`, `.time`, `.calc`, `.shorturl`, `.length`, `.speedtest`, `.ip`
- **System Diagnostics:** `.menu`, `.status`, `.ping`, `.alive`, `.runtime`, `.version`
- **Owner Privileges:** `.restart`, `.shutdown`, `.broadcast`, `.block`, `.unblock`, `.leavegc`, `.join`, `.setbotname`, `.setprefix`
- **Premium Subscription System:** `.addpremium`, `.delpremium`, `.checkpremium`, `.premiumlist`

---

## 📦 Installation & Setup

1. **Clone and Navigate:**
   ```bash
   git clone <repository_url>
   cd BUGGU-MD
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory (matching the `.env.example` structure):
   ```env
   # Admin details
   BOT_NAME="BUGGU MD"
   OWNER_NAME="Divyansh Deewana"
   OWNER_NUMBER="917014631313"
   PREFIX="."

   # Server Parameters
   PORT=3000
   NODE_ENV="production"

   # AI configuration (Get this at AI Studio > Secrets)
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Build and Transpile Assets:**
   ```bash
   npm run build
   ```

5. **Start Production Service Daemon:**
   ```bash
   npm start
   ```

---

## 🌐 High-Availability Deployment (Vercel + Render)

For professional, high-availability setups, BUGGU MD is optimized for a split-hosting model:

- **Frontend Website:** Hosted on **Vercel** as a lightweight, super-fast public single-page application.
- **Main Bot Backend:** Hosted on **Render** (as a **Web Service**) to process 24/7 background WhatsApp Web sockets and handle Gemini model calls.

Please refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for full split-hosting set-up specifications, environment variable bindings (`VITE_BACKEND_URL`), and step-by-step instructions.

---

## 🏆 Credits

- **Developer:** [Divyansh Deewana](https://github.com/DivyanshDeewana)
- **WhatsApp Web API:** Developed with `@whiskeysockets/baileys`
- **Design Inspiration:** Geometric Balanced Visual Themes
