const TempBan = require('../../database/models/TempBan');

function startTempBanScheduler(client) {
  setInterval(async () => {
    try {
      const expired = await TempBan.find({ unbanAt: { $lte: new Date() } });

      for (const record of expired) {
        const guild = client.guilds.cache.get(record.guildId);
        if (guild) {
          await guild.members.unban(record.userId, 'Geçici ban süresi doldu').catch(() => {});
        }
        await TempBan.deleteOne({ _id: record._id });
      }
    } catch (e) {
      console.error('Geçici ban kontrolü hatası:', e.message);
    }
  }, 60 * 1000); // her 1 dakikada bir kontrol et
}

module.exports = { startTempBanScheduler };
