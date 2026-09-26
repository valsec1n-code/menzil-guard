const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const DashboardUser = require('../../database/models/DashboardUser');
const GuildConfig = require('../../database/models/GuildConfig');

// İlk kurulum sadece .env'deki SETUP_KEY biliniyorsa yapılabilir.
// Bu, herkesin rastgele admin hesabı açmasını engeller.
router.get('/setup', async (req, res) => {
  res.render('setup', { error: null });
});

router.post('/setup', async (req, res) => {
  const { setupKey, username, password, guildId, ownerDiscordId } = req.body;

  if (!setupKey || setupKey !== process.env.SETUP_KEY) {
    return res.render('setup', { error: 'Kurulum anahtarı yanlış.' });
  }

  const existing = await DashboardUser.findOne({ username });
  if (existing) {
    return res.render('setup', { error: 'Bu kullanıcı adı zaten alınmış.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await DashboardUser.create({ username, passwordHash, guildId, role: 'owner' });

  // Bu sunucu için config yoksa oluştur
  let config = await GuildConfig.findOne({ guildId });
  if (!config) {
    config = await GuildConfig.create({ guildId, ownerDiscordId });
  } else if (ownerDiscordId) {
    config.ownerDiscordId = ownerDiscordId;
    await config.save();
  }

  res.redirect('/login');
});

// Şifremi unuttum: SETUP_KEY bilen biri var olan bir kullanıcının şifresini sıfırlayabilir
router.get('/setup/reset-password', (req, res) => {
  res.render('reset-password', { error: null, success: false });
});

router.post('/setup/reset-password', async (req, res) => {
  const { setupKey, username, newPassword } = req.body;

  if (!setupKey || setupKey !== process.env.SETUP_KEY) {
    return res.render('reset-password', { error: 'Kurulum anahtarı yanlış.', success: false });
  }

  const user = await DashboardUser.findOne({ username });
  if (!user) {
    return res.render('reset-password', { error: 'Böyle bir kullanıcı bulunamadı.', success: false });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.failedAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  res.render('reset-password', { error: null, success: true });
});

module.exports = router;
