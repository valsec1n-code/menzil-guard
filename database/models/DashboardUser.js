const mongoose = require('mongoose');

const DashboardUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  guildId: { type: String, required: true },   // bu kullanıcı hangi sunucuyu yönetiyor
  role: { type: String, enum: ['owner', 'admin'], default: 'admin' }
}, { timestamps: true });

module.exports = mongoose.model('DashboardUser', DashboardUserSchema);
