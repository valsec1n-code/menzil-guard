const mongoose = require('mongoose');

const DashboardUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  guildId: { type: String, required: true },
  role: { type: String, enum: ['owner', 'admin'], default: 'admin' },

  // 2FA (Google Authenticator vb.)
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },

  // Brute-force koruması
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('DashboardUser', DashboardUserSchema);
