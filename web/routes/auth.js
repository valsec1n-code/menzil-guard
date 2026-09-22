const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const DashboardUser = require('../../database/models/DashboardUser');

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await DashboardUser.findOne({ username });

  if (!user) {
    return res.render('login', { error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.render('login', { error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  req.session.userId = user._id.toString();
  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
