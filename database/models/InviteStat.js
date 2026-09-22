const mongoose = require('mongoose');

const InviteStatSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  inviterId: { type: String, required: true },
  inviterTag: { type: String, default: 'Bilinmiyor' },
  uses: { type: Number, default: 0 }
});

InviteStatSchema.index({ guildId: 1, inviterId: 1 }, { unique: true });

module.exports = mongoose.model('InviteStat', InviteStatSchema);
