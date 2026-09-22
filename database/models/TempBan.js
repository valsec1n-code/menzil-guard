const mongoose = require('mongoose');

const TempBanSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  unbanAt: { type: Date, required: true, index: true },
  reason: { type: String, default: null }
});

module.exports = mongoose.model('TempBan', TempBanSchema);
