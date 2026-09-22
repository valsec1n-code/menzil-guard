const mongoose = require('mongoose');

const LoginLogSchema = new mongoose.Schema({
  username: { type: String, required: true },
  ip: { type: String, default: 'bilinmiyor' },
  success: { type: Boolean, required: true },
  reason: { type: String, default: null }, // örn: 'yanlis_sifre', '2fa_hatali', 'basarili'
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoginLog', LoginLogSchema);
