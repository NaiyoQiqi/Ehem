require('dotenv').config();
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const { OpenAI } = require('openai');
const app = express();

// Setup OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Setup untuk autentikasi Baileys
const { state, saveCreds } = useMultiFileAuthState('./auth_info');
let connection;

// Definisikan nama bot
const botName = 'GeminiBot';

async function startWhatsApp() {
  const { version } = await fetchLatestBaileysVersion();
  connection = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
  });

  connection.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      const message = m.messages[0];
      const sender = message.key.remoteJid;
      const text = message.message.conversation;

      if (sender.endsWith('@g.us')) return;  // Jangan respon jika pesan datang dari grup

      console.log(`Received message: ${text} from ${sender}`);

      const translationResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: `Translate this text to Indonesian: ${text}` },
        ],
      });

      const translatedText = translationResponse.choices[0].message.content;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: translatedText }],
      });

      const responseText = `Hello, I'm ${botName}! Here's the response: ${response.choices[0].message.content}`;
      await sendMessage(sender, responseText);
    }
  });

  connection.ev.on('connection.update', (update) => {
    if (update.connection === 'close') saveCreds();
  });

  connection.ev.on('connection.update', update => {
    if (update.connection === 'open') console.log('WhatsApp connected');
  });
}

async function sendMessage(to, message) {
  await connection.sendMessage(to, { text: message });
}

startWhatsApp();

app.listen(8000, () => {
  console.log('Server is running on port 8000');
});
