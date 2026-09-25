const mongoose = require('mongoose');

const ServerBackupSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true }, // örn: "Manuel Yedek - 26 Eylül"
  createdBy: { type: String, default: null }, // panel kullanıcı adı

  channels: [{
    name: String,
    type: Number,           // discord.js ChannelType değeri
    parentName: { type: String, default: null }, // kategori adı
    position: Number,
    topic: { type: String, default: null }
  }],

  roles: [{
    name: String,
    color: Number,
    permissions: String,     // bitfield string olarak
    hoist: Boolean,
    mentionable: Boolean,
    position: Number
  }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServerBackup', ServerBackupSchema);
