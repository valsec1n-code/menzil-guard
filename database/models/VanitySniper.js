const mongoose = require('mongoose');

const VanitySniperSchema = new mongoose.Schema({
  ownerUsername: { type: String, required: true, index: true }, // hangi panel hesabı ekledi
  watchedCode: { type: String, required: true },                 // izlenen vanity kod (örn: "menzil")
  targetGuildId: { type: String, required: true },                // boşalırsa çekilecek sunucu ID
  targetGuildName: { type: String, default: null },               // görüntüleme için (cache)
  enabled: { type: Boolean, default: true },

  lastCheckedAt: { type: Date, default: null },
  lastStatus: { type: String, default: 'henüz kontrol edilmedi' }, // örn: "sende duruyor", "başkasında: X", "kapıldı!"
}, { timestamps: true });

module.exports = mongoose.model('VanitySniper', VanitySniperSchema);
