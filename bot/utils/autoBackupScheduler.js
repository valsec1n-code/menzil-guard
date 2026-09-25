const { createBackup } = require('./backup');
const ServerBackup = require('../../database/models/ServerBackup');

const ONE_DAY = 24 * 60 * 60 * 1000;
const MAX_AUTO_BACKUPS_PER_GUILD = 7; // son 7 otomatik yedeği tut, eskiyi sil

function startAutoBackupScheduler(client) {
  // Bot açılınca 1 dakika bekleyip ilk yedeği al, sonra her gün tekrarla
  setTimeout(runBackupForAllGuilds, 60 * 1000);
  setInterval(runBackupForAllGuilds, ONE_DAY);

  async function runBackupForAllGuilds() {
    for (const guild of client.guilds.cache.values()) {
      try {
        await createBackup(guild, `Otomatik Yedek - ${new Date().toLocaleDateString('tr-TR')}`, 'sistem (otomatik)');

        // Eski otomatik yedekleri temizle (guild başına en fazla N tane)
        const autoBackups = await ServerBackup.find({ guildId: guild.id, createdBy: 'sistem (otomatik)' }).sort({ createdAt: -1 });
        if (autoBackups.length > MAX_AUTO_BACKUPS_PER_GUILD) {
          const toDelete = autoBackups.slice(MAX_AUTO_BACKUPS_PER_GUILD);
          await ServerBackup.deleteMany({ _id: { $in: toDelete.map(b => b._id) } });
        }
      } catch (e) {
        console.error(`Otomatik yedek hatası (${guild.name}):`, e.message);
      }
    }
  }
}

module.exports = { startAutoBackupScheduler };
