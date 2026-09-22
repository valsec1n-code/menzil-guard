const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const GuildConfig = require('../../database/models/GuildConfig');
const LogEntry = require('../../database/models/LogEntry');
const DashboardUser = require('../../database/models/DashboardUser');
const { invalidateCache } = require('../../bot/utils/getConfig');

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
  next();
});

// ---- GENEL BAKIŞ ----
router.get('/dashboard', async (req, res) => {
  const logs = await LogEntry.find({ guildId: req.dashboardUser.guildId })
    .sort({ createdAt: -1 })
    .limit(50);

  const totalBlocked = await LogEntry.countDocuments({ guildId: req.dashboardUser.guildId });

  res.render('dashboard', {
    active: 'overview',
    guild: req.discordGuild,
    config: req.guildConfig,
    logs,
    totalBlocked,
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

  c.antiNuke.enabled = b.antiNuke_enabled === 'on';
  c.antiNuke.channelDeleteThreshold = Number(b.channelDeleteThreshold);
  c.antiNuke.roleDeleteThreshold = Number(b.roleDeleteThreshold);
  c.antiNuke.banThreshold = Number(b.banThreshold);
  c.antiNuke.timeWindowSeconds = Number(b.antiNukeWindow);
  c.antiNuke.punishment = b.antiNukePunishment;

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

  c.vanityGuard.enabled = b.vanityGuard_enabled === 'on';
  c.webhookGuard.enabled = b.webhookGuard_enabled === 'on';
  c.webhookGuard.punishment = b.webhookPunishment;

  c.verification.enabled = b.verification_enabled === 'on';
  c.verification.channelId = b.verificationChannelId || null;
  c.verification.verifiedRoleId = b.verifiedRoleId || null;

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
  c.autoRoleId = b.autoRoleId || null;
  c.ownerDiscordId = b.ownerDiscordId || c.ownerDiscordId;
  await c.save();
  invalidateCache(c.guildId);
  res.redirect('/dashboard/general?saved=1');
});

// ---- HESAP AYARLARI ----
router.get('/dashboard/account', (req, res) => {
  res.render('account', { active: 'account', user: req.dashboardUser, error: null, saved: req.query.saved });
});

router.post('/dashboard/account/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const match = await bcrypt.compare(currentPassword, req.dashboardUser.passwordHash);
  if (!match) {
    return res.render('account', { active: 'account', user: req.dashboardUser, error: 'Mevcut şifre yanlış.', saved: null });
  }
  req.dashboardUser.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.dashboardUser.save();
  res.redirect('/dashboard/account?saved=1');
});

router.post('/dashboard/account/add-admin', async (req, res) => {
  const { username, password } = req.body;
  const existing = await DashboardUser.findOne({ username });
  if (existing) {
    return res.render('account', { active: 'account', user: req.dashboardUser, error: 'Bu kullanıcı adı zaten var.', saved: null });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await DashboardUser.create({ username, passwordHash, guildId: req.dashboardUser.guildId, role: 'admin' });
  res.redirect('/dashboard/account?saved=1');
});

module.exports = router;
