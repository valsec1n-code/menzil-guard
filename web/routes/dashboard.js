const express = require('express');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const GuildConfig = require('../../database/models/GuildConfig');
const LogEntry = require('../../database/models/LogEntry');
const DashboardUser = require('../../database/models/DashboardUser');
const LoginLog = require('../../database/models/LoginLog');
const InviteStat = require('../../database/models/InviteStat');
const TempBan = require('../../database/models/TempBan');
const { invalidateCache } = require('../../bot/utils/getConfig');
const { applyPunishment, logEvent } = require('../../bot/utils/punish');

router.use(requireAuth);

// Her istekte config'i ve discord guild bilgisini hazırla
router.use(async (req, res, next) => {
  const guildId = req.dashboardUser.guildId;
  let config = await GuildConfig.findOne({ guildId });
  if (!config) config = await GuildConfig.create({ guildId });

  const client = req.app.get('discordClient');
  const guild = client.guilds.cache.get(guildId) || null;

  req.guildConfig = config;
  req.discordGuild = guild;
  req.discordClient = client;
  next();
});

// ---- GENEL BAKIŞ ----
router.get('/dashboard', async (req, res) => {
  const logs = await LogEntry.find({ guildId: req.dashboardUser.guildId })
    .sort({ createdAt: -1 })
    .limit(50);

  const totalBlocked = await LogEntry.countDocuments({ guildId: req.dashboardUser.guildId });

  // Son 7 gün için günlük olay sayısı (basit istatistik grafiği)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dailyRaw = await LogEntry.aggregate([
    { $match: { guildId: req.dashboardUser.guildId, createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  res.render('dashboard', {
    active: 'overview',
    guild: req.discordGuild,
    config: req.guildConfig,
    logs,
    totalBlocked,
    dailyStats: dailyRaw,
    user: req.dashboardUser,
    saved: req.query.saved
  });
});

// ---- GUARD AYARLARI ----
router.get('/dashboard/guards', (req, res) => {
  res.render('guards', { active: 'guards', config: req.guildConfig, guild: req.discordGuild, user: req.dashboardUser, saved: req.query.saved });
});

router.post('/dashboard/guards', async (req, res) => {
  const b = req.body;
  const c = req.guildConfig;

  // Kanal Guard
  c.channelGuard.deleteEnabled = b.channelDelete_enabled === 'on';
  c.channelGuard.deleteThreshold = Number(b.channelDeleteThreshold);
  c.channelGuard.deleteWindowSeconds = Number(b.channelDeleteWindow);
  c.channelGuard.deletePunishment = b.channelDeletePunishment;
  c.channelGuard.createEnabled = b.channelCreate_enabled === 'on';
  c.channelGuard.createThreshold = Number(b.channelCreateThreshold);
  c.channelGuard.createWindowSeconds = Number(b.channelCreateWindow);
  c.channelGuard.createPunishment = b.channelCreatePunishment;

  // Rol Guard
  c.roleGuard.deleteEnabled = b.roleDelete_enabled === 'on';
  c.roleGuard.deleteThreshold = Number(b.roleDeleteThreshold);
  c.roleGuard.deleteWindowSeconds = Number(b.roleDeleteWindow);
  c.roleGuard.deletePunishment = b.roleDeletePunishment;
  c.roleGuard.createEnabled = b.roleCreate_enabled === 'on';
  c.roleGuard.createThreshold = Number(b.roleCreateThreshold);
  c.roleGuard.createWindowSeconds = Number(b.roleCreateWindow);
  c.roleGuard.createPunishment = b.roleCreatePunishment;

  // Ban Guard
  c.banGuard.enabled = b.banGuard_enabled === 'on';
  c.banGuard.threshold = Number(b.banThreshold);
  c.banGuard.windowSeconds = Number(b.banWindow);
  c.banGuard.punishment = b.banGuardPunishment;

  // Permission Guard
  c.permissionGuard.enabled = b.permissionGuard_enabled === 'on';
  c.permissionGuard.punishment = b.permissionGuardPunishment;

  c.antiRaid.enabled = b.antiRaid_enabled === 'on';
  c.antiRaid.joinThreshold = Number(b.joinThreshold);
  c.antiRaid.timeWindowSeconds = Number(b.antiRaidWindow);
  c.antiRaid.action = b.antiRaidAction;

  c.antiSpam.enabled = b.antiSpam_enabled === 'on';
  c.antiSpam.messageThreshold = Number(b.messageThreshold);
  c.antiSpam.timeWindowSeconds = Number(b.antiSpamWindow);
  c.antiSpam.mentionLimit = Number(b.mentionLimit);
  c.antiSpam.punishment = b.antiSpamPunishment;
  c.antiSpam.muteDurationMinutes = Number(b.muteDurationMinutes);

  // Anti-Bot
  c.antiBot.enabled = b.antiBot_enabled === 'on';
  c.antiBot.punishment = b.antiBotPunishment;

  // Hesap Yaşı Guard
  c.accountAgeGuard.enabled = b.accountAge_enabled === 'on';
  c.accountAgeGuard.minDays = Number(b.accountAgeMinDays);
  c.accountAgeGuard.action = b.accountAgeAction;
  c.accountAgeGuard.quarantineRoleId = b.accountAgeQuarantineRoleId || null;

  // Kelime Filtresi
  c.wordFilter.enabled = b.wordFilter_enabled === 'on';
  c.wordFilter.words = b.wordFilterWords ? b.wordFilterWords.split(',').map(w => w.trim()).filter(Boolean) : [];
  c.wordFilter.punishment = b.wordFilterPunishment;
  c.wordFilter.muteDurationMinutes = Number(b.wordFilterMuteMinutes);

  // Link Filtresi
  c.linkFilter.enabled = b.linkFilter_enabled === 'on';
  c.linkFilter.allowedDomains = b.linkFilterDomains ? b.linkFilterDomains.split(',').map(d => d.trim()).filter(Boolean) : [];
  c.linkFilter.punishment = b.linkFilterPunishment;
  c.linkFilter.muteDurationMinutes = Number(b.linkFilterMuteMinutes);

  c.vanityGuard.enabled = b.vanityGuard_enabled === 'on';
  c.inviteGuard.enabled = b.inviteGuard_enabled === 'on';
  c.webhookGuard.enabled = b.webhookGuard_enabled === 'on';
  c.webhookGuard.punishment = b.webhookPunishment;

  c.verification.enabled = b.verification_enabled === 'on';
  c.verification.channelId = b.verificationChannelId || null;
  c.verification.verifiedRoleId = b.verifiedRoleId || null;

  // Genel ban süresi
  c.banDurationDays = Number(b.banDurationDays || 0);

  await c.save();
  invalidateCache(c.guildId);
  res.redirect('/dashboard/guards?saved=1');
});

// ---- WHITELIST ----
router.get('/dashboard/whitelist', (req, res) => {
  res.render('whitelist', { active: 'whitelist', config: req.guildConfig, guild: req.discordGuild, user: req.dashboardUser, saved: req.query.saved });
});

router.post('/dashboard/whitelist/add-user', async (req, res) => {
  const { userId } = req.body;
  if (userId && !req.guildConfig.whitelistUsers.includes(userId)) {
    req.guildConfig.whitelistUsers.push(userId);
    await req.guildConfig.save();
    invalidateCache(req.guildConfig.guildId);
  }
  res.redirect('/dashboard/whitelist?saved=1');
});

router.post('/dashboard/whitelist/remove-user', async (req, res) => {
  const { userId } = req.body;
  req.guildConfig.whitelistUsers = req.guildConfig.whitelistUsers.filter(id => id !== userId);
  await req.guildConfig.save();
  invalidateCache(req.guildConfig.guildId);
  res.redirect('/dashboard/whitelist?saved=1');
});

router.post('/dashboard/whitelist/add-role', async (req, res) => {
  const { roleId } = req.body;
  if (roleId && !req.guildConfig.whitelistRoles.includes(roleId)) {
    req.guildConfig.whitelistRoles.push(roleId);
    await req.guildConfig.save();
    invalidateCache(req.guildConfig.guildId);
  }
  res.redirect('/dashboard/whitelist?saved=1');
});

router.post('/dashboard/whitelist/remove-role', async (req, res) => {
  const { roleId } = req.body;
  req.guildConfig.whitelistRoles = req.guildConfig.whitelistRoles.filter(id => id !== roleId);
  await req.guildConfig.save();
  invalidateCache(req.guildConfig.guildId);
  res.redirect('/dashboard/whitelist?saved=1');
});

// ---- LOG AYARLARI ----
router.get('/dashboard/logs', async (req, res) => {
  const logs = await LogEntry.find({ guildId: req.dashboardUser.guildId }).sort({ createdAt: -1 }).limit(50);
  res.render('logs', { active: 'logs', config: req.guildConfig, guild: req.discordGuild, logs, user: req.dashboardUser, saved: req.query.saved });
});

router.post('/dashboard/logs', async (req, res) => {
  const b = req.body;
  req.guildConfig.logChannelId = b.logChannelId || null;
  req.guildConfig.dmOwnerOnCritical = b.dmOwnerOnCritical === 'on';
  req.guildConfig.logEvents = Array.isArray(b.logEvents) ? b.logEvents : (b.logEvents ? [b.logEvents] : []);
  await req.guildConfig.save();
  invalidateCache(req.guildConfig.guildId);
  res.redirect('/dashboard/logs?saved=1');
});

// ---- GENEL AYARLAR ----
router.get('/dashboard/general', (req, res) => {
  res.render('general', { active: 'general', config: req.guildConfig, guild: req.discordGuild, user: req.dashboardUser, saved: req.query.saved });
});

router.post('/dashboard/general', async (req, res) => {
  const b = req.body;
  const c = req.guildConfig;
  c.prefix = b.prefix || '!';
  c.welcome.enabled = b.welcome_enabled === 'on';
  c.welcome.channelId = b.welcomeChannelId || null;
  c.welcome.message = b.welcomeMessage || c.welcome.message;
  c.welcome.useEmbed = b.welcomeUseEmbed === 'on';
  c.autoRoleId = b.autoRoleId || null;
  c.ownerDiscordId = b.ownerDiscordId || c.ownerDiscordId;
  await c.save();
  invalidateCache(c.guildId);
  res.redirect('/dashboard/general?saved=1');
});

// ---- MODERASYON (manuel ceza + kişi geçmişi) ----
router.get('/dashboard/moderate', async (req, res) => {
  const searchId = req.query.userId || null;
  let history = [];
  if (searchId) {
    history = await LogEntry.find({ guildId: req.dashboardUser.guildId, moderatorId: searchId })
      .sort({ createdAt: -1 })
      .limit(50);
  }
  res.render('moderate', { active: 'moderate', guild: req.discordGuild, searchId, history, result: req.query.result || null });
});

router.post('/dashboard/moderate/action', async (req, res) => {
  const { userId, action, reason, banDurationDays } = req.body;
  const guild = req.discordGuild;
  let result = 'hata';

  if (guild) {
    if (action === 'ban') {
      result = await applyPunishment(guild, userId, 'ban', reason || 'Manuel işlem (panel)', 10, Number(banDurationDays || 0));
    } else if (action === 'kick') {
      result = await applyPunishment(guild, userId, 'kick', reason || 'Manuel işlem (panel)');
    } else if (action === 'mute') {
      result = await applyPunishment(guild, userId, 'mute', reason || 'Manuel işlem (panel)', 10);
    } else if (action === 'unban') {
      await guild.members.unban(userId, reason || 'Manuel affetme (panel)').catch(() => {});
      await TempBan.deleteMany({ guildId: guild.id, userId });
      result = 'unban';
    }

    await logEvent(guild, req.guildConfig, {
      type: 'manuel_islem',
      description: `Panel üzerinden ${userId} kullanıcısına "${action}" işlemi uygulandı. Sebep: ${reason || 'belirtilmedi'}`,
      moderatorId: req.dashboardUser.username,
      moderatorTag: `[Panel] ${req.dashboardUser.username}`,
      targetId: userId,
      actionTaken: result
    });
  }

  res.redirect(`/dashboard/moderate?result=${encodeURIComponent(result)}`);
});

// ---- DAVET İSTATİSTİKLERİ ----
router.get('/dashboard/invites', async (req, res) => {
  const stats = await InviteStat.find({ guildId: req.dashboardUser.guildId }).sort({ uses: -1 }).limit(50);
  res.render('invites', { active: 'invites', stats, guild: req.discordGuild });
});

// ---- GÜVENLİK (giriş logları) ----
router.get('/dashboard/security', async (req, res) => {
  const logs = await LoginLog.find({ username: req.dashboardUser.username }).sort({ createdAt: -1 }).limit(50);
  res.render('security', { active: 'security', logs, user: req.dashboardUser });
});

// ---- HESAP AYARLARI ----
router.get('/dashboard/account', (req, res) => {
  res.render('account', { active: 'account', user: req.dashboardUser, error: null, saved: req.query.saved, qr: null });
});

router.post('/dashboard/account/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const match = await bcrypt.compare(currentPassword, req.dashboardUser.passwordHash);
  if (!match) {
    return res.render('account', { active: 'account', user: req.dashboardUser, error: 'Mevcut şifre yanlış.', saved: null, qr: null });
  }
  req.dashboardUser.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.dashboardUser.save();
  res.redirect('/dashboard/account?saved=1');
});

router.post('/dashboard/account/add-admin', async (req, res) => {
  const { username, password } = req.body;
  const existing = await DashboardUser.findOne({ username });
  if (existing) {
    return res.render('account', { active: 'account', user: req.dashboardUser, error: 'Bu kullanıcı adı zaten var.', saved: null, qr: null });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await DashboardUser.create({ username, passwordHash, guildId: req.dashboardUser.guildId, role: 'admin' });
  res.redirect('/dashboard/account?saved=1');
});

// ---- 2FA KURULUMU ----
router.post('/dashboard/account/2fa/start', async (req, res) => {
  const secret = speakeasy.generateSecret({ name: `MenzilGuard (${req.dashboardUser.username})` });
  req.dashboardUser.twoFactorSecret = secret.base32;
  await req.dashboardUser.save();

  const qr = await qrcode.toDataURL(secret.otpauth_url);
  res.render('account', { active: 'account', user: req.dashboardUser, error: null, saved: null, qr });
});

router.post('/dashboard/account/2fa/confirm', async (req, res) => {
  const verified = speakeasy.totp.verify({
    secret: req.dashboardUser.twoFactorSecret,
    encoding: 'base32',
    token: req.body.code,
    window: 1
  });

  if (!verified) {
    const qr = await qrcode.toDataURL(speakeasy.otpauthURL({
      secret: req.dashboardUser.twoFactorSecret, label: req.dashboardUser.username, encoding: 'base32'
    }));
    return res.render('account', { active: 'account', user: req.dashboardUser, error: 'Kod yanlış, tekrar dene.', saved: null, qr });
  }

  req.dashboardUser.twoFactorEnabled = true;
  await req.dashboardUser.save();
  res.redirect('/dashboard/account?saved=1');
});

router.post('/dashboard/account/2fa/disable', async (req, res) => {
  req.dashboardUser.twoFactorEnabled = false;
  req.dashboardUser.twoFactorSecret = null;
  await req.dashboardUser.save();
  res.redirect('/dashboard/account?saved=1');
});

module.exports = router;
