require('dotenv').config();
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@adiwajshing/baileys');
const express = require('express');
const { OpenAI } = require('openai');
const app = express();

// Setup OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fungsi untuk mengirim prompt ke API OpenAI
async function sendToOpenAI(prompt) {
  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',  // Pilih model sesuai kebutuhan
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
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
    auth: state, // Gunakan kredensial yang sudah disimpan
    printQRInTerminal: true, // Cetak QR code di terminal
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

      // Kirim pesan ke OpenAI untuk diproses
      const response = await sendToOpenAI(text);

      // Kirim kembali respon dengan nama bot
      const responseText = `Hello, I'm ${botName}! Here's the response: ${response}`;
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
