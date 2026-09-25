require('dotenv').config();
const connectDB = require('./database/connection');
const { createBotClient } = require('./bot/client');
const createWebApp = require('./web/app');

async function main() {
  // 1) Veritabanına bağlan
  await connectDB();

  // 2) Discord botunu başlat
  const client = createBotClient();
  await client.login(process.env.DISCORD_TOKEN);

  // 3) Web dashboard'u başlat
  const app = createWebApp(client);
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🌐 Dashboard çalışıyor: http://localhost:${PORT}`);
  });

  // 4) Sniper bot (opsiyonel) - sadece SNIPER_BOT_TOKEN tanımlıysa çalışır
  if (process.env.SNIPER_BOT_TOKEN) {
    const { startSniperBot } = require('./bot/sniperBot');
    startSniperBot(process.env.SNIPER_BOT_TOKEN);
  } else {
    console.log('ℹ️  Sniper bot kapalı (SNIPER_BOT_TOKEN tanımlı değil)');
  }
}

main().catch((err) => {
  console.error('Başlatma hatası:', err);
  process.exit(1);
});
