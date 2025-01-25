require('dotenv').config();
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const axios = require('axios');
const app = express();

// Setup Gemini API
const GEN_API_KEY = process.env.GEN_API_KEY;
const apiUrl = 'https://generativeai.googleapis.com/v1/models/gemini:generateText';  // Endpoint API Gemini (pastikan ini benar)

// Fungsi untuk mengirim prompt ke API Gemini
async function sendToGemini(prompt) {
  try {
    const response = await axios.post(apiUrl, {
      prompt: prompt,
      api_key: GEN_API_KEY,
    });
    return response.data;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

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

      // Kirim pesan ke Gemini untuk diproses
      const response = await sendToGemini(text);

      if (response && response.generatedText) {
        const responseText = `Hello, I'm ${botName}! Here's the response: ${response.generatedText}`;
        await sendMessage(sender, responseText);
      } else {
        await sendMessage(sender, "Sorry, I couldn't process your request.");
      }
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
