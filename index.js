const qrcode = require('qrcode-terminal');
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const axios = require('axios');
const app = express();

// Setup Gemini API
const GEN_API_KEY = process.env.GEN_API_KEY;
const apiUrl = 'https://generativeai.googleapis.com/v1/models/gemini:generateText';  // Endpoint API Gemini

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
const { state, saveCreds } = useMultiFileAuthState('./auth_info');
let connection;

// Definisikan nama bot
const botName = 'GeminiBot';

// Cek apakah `authState` sudah valid
if (!state || !state.creds) {
  console.log('No credentials found, please scan the QR code first.');
} else {
  async function startWhatsApp() {
    const { version } = await fetchLatestBaileysVersion();
    connection = makeWASocket({
      version,
      auth: state,  // Gunakan kredensial yang sudah disimpan
      printQRInTerminal: false,  // Nonaktifkan print QR di terminal
    });

    // Tampilkan QR code dalam bentuk ASCII
    qrcode.generate(connection.qr, { small: true }, (qrCodeText) => {
      console.log(qrCodeText);  // QR code dalam bentuk teks
    });

    connection.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        const message = m.messages[0];
        const sender = message.key.remoteJid;
        const text = message.message.conversation;

        // Cek jika pesan datang dari grup
        if (sender.endsWith('@g.us')) return;  // Jangan respon jika pesan datang dari grup

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
}

app.listen(8000, () => {
  console.log('Server is running on port 8000');
});
