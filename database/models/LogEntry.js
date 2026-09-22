const mongoose = require('mongoose');

const LogEntrySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  type: { type: String, required: true },        // örn: 'channel_delete', 'anti_nuke', 'anti_raid'
  description: { type: String, required: true },
  moderatorId: { type: String, default: null },   // olayı tetikleyen kişi
  moderatorTag: { type: String, default: null },
  targetId: { type: String, default: null },      // etkilenen kanal/rol/kullanıcı
  actionTaken: { type: String, default: null },   // 'ban', 'kick', 'rol alındı' vs.
  createdAt: { type: Date, default: Date.now }
});

// Bir sunucu için en fazla son 500 kaydı tut, eskiyi otomatik temizle (DB şişmesin)
LogEntrySchema.statics.addLog = async function (data) {
  await this.create(data);
  const count = await this.countDocuments({ guildId: data.guildId });
  if (count > 500) {
    const excess = await this.find({ guildId: data.guildId })
      .sort({ createdAt: 1 })
      .limit(count - 500);
    const ids = excess.map(e => e._id);
    await this.deleteMany({ _id: { $in: ids } });
  }
};

module.exports = mongoose.model('LogEntry', LogEntrySchema);
