const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const genai = require('google-generativeai');
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
  }
}

// Setup untuk autentikasi Baileys
const { state, saveCreds } = useMultiFileAuthState('./auth_info');  // Menyimpan kredensial di folder auth_info
let connection;

// Definisikan nama bot
const botName = 'GeminiBot';

async function startWhatsApp() {
  const { version } = await fetchLatestBaileysVersion();
  connection = makeWASocket({
    version,
    auth: state, // Gunakan kredensial yang sudah disimpan
    printQRInTerminal: true, // Cetak QR code di terminal untuk pemindaian pertama kali
  });

  connection.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      const message = m.messages[0];
      const sender = message.key.remoteJid;
      const text = message.message.conversation;

      // Cek apakah pesan datang dari grup
      if (sender.endsWith('@g.us')) {
        console.log('Message is from a group, ignoring...');
        return;  // Jangan respon jika pesan datang dari grup
      }

      console.log(`Received message: ${text} from ${sender}`);

      // Kirim pesan ke Gemini untuk diproses
      const response = await sendToGemini(text);
      
      // Kirim kembali respon dengan nama bot
      const responseText = `Hello, I'm ${botName}! Here's the response: ${response.text}`;
      await sendMessage(sender, responseText);
    }
  });

  // Simpan kredensial saat sesi ditutup
  connection.ev.on('connection.update', (update) => {
    if (update.connection === 'close') {
      saveCreds();
    }
  });

  connection.ev.on('connection.update', update => {
    if (update.connection === 'open') {
      console.log('WhatsApp connected');
    }
  });
}

async function sendMessage(to, message) {
  await connection.sendMessage(to, { text: message });
}

// Mulai bot WhatsApp
startWhatsApp();

// Setup Express untuk mendengarkan di port 8000 (opsional)
app.listen(8000, () => {
  console.log('Server is running on port 8000');
});
