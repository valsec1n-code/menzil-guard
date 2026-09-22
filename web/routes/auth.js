const express = require('express');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const router = express.Router();
const DashboardUser = require('../../database/models/DashboardUser');
const LoginLog = require('../../database/models/LoginLog');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'bilinmiyor';
}

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = getClientIp(req);
  const user = await DashboardUser.findOne({ username });

  if (!user) {
    await LoginLog.create({ username, ip, success: false, reason: 'kullanici_yok' });
    return res.render('login', { error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  // Kilitli mi kontrol et
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const kalanDakika = Math.ceil((user.lockedUntil - new Date()) / 60000);
    await LoginLog.create({ username, ip, success: false, reason: 'hesap_kilitli' });
    return res.render('login', { error: `Çok fazla hatalı deneme. ${kalanDakika} dakika sonra tekrar dene.` });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= MAX_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedAttempts = 0;
    }
    await user.save();
    await LoginLog.create({ username, ip, success: false, reason: 'yanlis_sifre' });
    return res.render('login', { error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  // Şifre doğru - deneme sayacını sıfırla
  user.failedAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  // 2FA açıksa doğrulama koduna yönlendir
  if (user.twoFactorEnabled) {
    req.session.pending2FA = user._id.toString();
    return res.redirect('/login/2fa');
  }

  await LoginLog.create({ username, ip, success: true, reason: 'basarili' });
  req.session.userId = user._id.toString();
  res.redirect('/dashboard');
});

// ---- 2FA DOĞRULAMA ----
router.get('/login/2fa', (req, res) => {
  if (!req.session.pending2FA) return res.redirect('/login');
  res.render('login-2fa', { error: null });
});

router.post('/login/2fa', async (req, res) => {
  if (!req.session.pending2FA) return res.redirect('/login');

  const user = await DashboardUser.findById(req.session.pending2FA);
  const ip = getClientIp(req);
  if (!user) return res.redirect('/login');

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: req.body.code,
    window: 1
  });

  if (!verified) {
    await LoginLog.create({ username: user.username, ip, success: false, reason: '2fa_hatali' });
    return res.render('login-2fa', { error: 'Kod yanlış, tekrar dene.' });
  }

  await LoginLog.create({ username: user.username, ip, success: true, reason: 'basarili_2fa' });
  req.session.userId = user._id.toString();
  delete req.session.pending2FA;
  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
