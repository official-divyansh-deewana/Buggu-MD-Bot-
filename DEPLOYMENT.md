# 🌐 BUGGU MD - Dual Hosting Architecture Manual

This guide describes how to deploy the **BUGGU MD** suite on a dual-hosting infrastructure:
1. **Frontend Web Dashboard** is deployed on **Vercel** as a fast, responsive, public interface.
2. **Main Bot Backend** is deployed on **Render** as a 24/7 background process to power the WhatsApp WebSocket and AI Command-Handlers.

---

## 🏗️ Split Hosting Design Overview

```
+-----------------------------------+
|       User Browser UI             |
|   (https://your-app.vercel.app)   |
+-----------------+-----------------+
                  |
                  | Fetches Status / Triggers connection via CORS
                  v
+-----------------+-----------------+
|       Render Web Service          |
| (https://your-bot.onrender.com)   |
+-----------------+-----------------+
                  |
                  | Establishes persistent WebSocket
                  v
+-----------------+-----------------+
|          WhatsApp MD              |
+-----------------------------------+
```

---

## 🎨 1. Frontend Website (Vercel)

Vercel acts as the public web interface where you and your users can monitor bot metrics, view active log streams, generate QR connection blocks, and request 8-digit pairing codes.

### Build and Environment Parameters

- **Framework Preset:** `Vite` (or `Other` / `Create React App`)
- **Build Command:** `npm run build` (or `vite build`)
- **Output Directory:** `dist`
- **Root Directory:** `./` (root directory containing `package.json`)

### Required Environment Variable (Vercel Dashboard)

| Variable Key | Suggested Value | Description |
| :--- | :--- | :--- |
| **`VITE_BACKEND_URL`** | `https://your-bot-name.onrender.com` | The public secure domain of your Render Web Service. This enables cross-origin browser fetches. |

### Vercel Deployment Steps

1. Sign in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** > **Project** and import your imported GitHub repository containing **BUGGU MD**.
3. Under **Build & Development Settings**, ensure:
   - Framework preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Expand the **Environment Variables** panel. Add **`VITE_BACKEND_URL`** and paste your Render deployment URL.
5. Click **Deploy**. Vercel will transpile your dashboard using Vite and serve it globally with optimal speed.

---

## 🤖 2. Main Bot Backend (Render)

Render hosts the core application backend which processes the live WhatsApp protocol connection, manages sessions, monitors group links, and triggers automatic responses.

### Server Configuration

- **Service Type:** **Web Service** (ensures Port incoming ingress routing)
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start` (Runs the bundled CommonJS production engine `node dist/server.cjs`)

### Required Environment Variables (Render Dashboard)

Configure these secrets in the **Environment** settings panel on Render:

| Variable Keys | Example Value | Description |
| :--- | :--- | :--- |
| **`GEMINI_API_KEY`** | `AIzaSy...` | Your Google Dev AI Studio API key. Crucial for custom command execution. |
| **`BOT_NAME`** | `BUGGU MD` | Name displayed by the WhatsApp bot client. |
| **`OWNER_NAME`** | `Divyansh Deewana` | Your developer or owner signature. |
| **`OWNER_NUMBER`** | `917014631313` | WhatsApp phone number of the administrator (with country prefix, no spaces). |
| **`PREFIX`** | `.` | Command trigger prefix. Default is `.`. |
| **`NODE_ENV`** | `production` | Switches express and Vite compilers into optimized production pathways. |

### Render Deployment Steps

1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New** > **Web Service**.
3. Link your GitHub repository.
4. Fill out the service settings:
   - **Name:** Choose a unique identifier (e.g., `buggu-md-backend`).
   - **Language:** `Node`
   - **Branch:** `main` (or your active branch)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Under the **Instance Type** section, select **Web Service** (Render will host this 24/7 and automatically allocate dynamic incoming routes on Port `3000`).
6. Click **Advanced** and expand the **Environment Variables** section. Insert all keys from the table above.
7. Click **Create Web Service**. Render compiles server.ts into `dist/server.cjs` and begins executing the background daemon listener.

---

## ⚡ Integration Verification & Diagnostics

Once deployments are online:

1. Copy your newly created Render service address (e.g. `https://buggu-md-backend.onrender.com`).
2. Add it as the `VITE_BACKEND_URL` environment variable in Vercel, and rebuild/redeploy the Vercel app.
3. Open the Vercel dashboard URL inside any browser.
4. You will see coordinates update live in the **Live System Terminal** window.
5. Enter your phone number inside the **Pairing Code** tab, and receive your 8-digit verification string immediately.
6. Alternatively, scan the dynamic QR matrix securely to link your device!
