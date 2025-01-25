const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const genai = require('google-generativeai');
const app = express();

// Setup Gemini API
genai.configure({ apiKey: process.env.GEN_API_KEY }); // Pastikan API key ada di file .env

// Setup for Baileys authentication
const { state, saveCreds } = useMultiFileAuthState('./auth_info');

let connection;

// Define bot's name
const botName = 'Xenovia AI';  // Change this to your desired bot name

async function startWhatsApp() {
  const { version } = await fetchLatestBaileysVersion();
  connection = makeWASocket({
    version,
    auth: state,  // Reuse credentials from saved state
    printQRInTerminal: true,  // Prints the QR code for login
  });

  // Listen for incoming messages
  connection.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      const message = m.messages[0];
      const sender = message.key.remoteJid;
      const text = message.message.conversation;

      // Check if the message is from a group
      if (sender.endsWith('@g.us')) {
        console.log('Message is from a group, ignoring...');
        return;  // Don't respond if it's from a group
      }

      console.log(`Received message: ${text} from ${sender}`);

      // Send message to Gemini for processing
      const response = await genai.chat({ prompt: text });
      
      // Send back response with bot's name
      const responseText = `Hello, I'm ${botName}! Here's the response: ${response.text}`;
      await sendMessage(sender, responseText);
    }
  });

  // Save credentials on session close
  connection.ev.on('connection.update', (update) => {
    if (update.connection === 'close') {
      saveCreds();
    }
  });

  // When connected, show message
  connection.ev.on('connection.update', update => {
    if (update.connection === 'open') {
      console.log('WhatsApp connected');
    }
  });
}

async function sendMessage(to, message) {
  await connection.sendMessage(to, { text: message });
}

// Start the WhatsApp bot
startWhatsApp();

// Setup Express to listen on port 8000 (optional)
app.listen(8000, () => {
  console.log('Server is running on port 8000');
});
