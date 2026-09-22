const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  prefix: { type: String, default: '!' },

  // ---- KANAL GUARD (açma / silme ayrı ayrı) ----
  channelGuard: {
    deleteEnabled: { type: Boolean, default: true },
    deleteThreshold: { type: Number, default: 3 },
    deleteWindowSeconds: { type: Number, default: 10 },
    deletePunishment: { type: String, enum: ['kick', 'ban', 'strip_roles'], default: 'ban' },

    createEnabled: { type: Boolean, default: false },
    createThreshold: { type: Number, default: 5 },
    createWindowSeconds: { type: Number, default: 10 },
    createPunishment: { type: String, enum: ['kick', 'ban', 'strip_roles'], default: 'kick' }
  },

  // ---- ROL GUARD (açma / silme ayrı ayrı) ----
  roleGuard: {
    deleteEnabled: { type: Boolean, default: true },
    deleteThreshold: { type: Number, default: 3 },
    deleteWindowSeconds: { type: Number, default: 10 },
    deletePunishment: { type: String, enum: ['kick', 'ban', 'strip_roles'], default: 'ban' },

    createEnabled: { type: Boolean, default: false },
    createThreshold: { type: Number, default: 5 },
    createWindowSeconds: { type: Number, default: 10 },
    createPunishment: { type: String, enum: ['kick', 'ban', 'strip_roles'], default: 'kick' }
  },

  // ---- TOPLU BAN/KICK GUARD ----
  banGuard: {
    enabled: { type: Boolean, default: true },
    threshold: { type: Number, default: 3 },
    windowSeconds: { type: Number, default: 10 },
    punishment: { type: String, enum: ['kick', 'ban', 'strip_roles'], default: 'ban' }
  },

  // ---- İZİNSİZ YETKİ DEĞİŞİKLİĞİ GUARD (örn. @everyone'a admin verme) ----
  permissionGuard: {
    enabled: { type: Boolean, default: true },
    punishment: { type: String, enum: ['kick', 'ban', 'strip_roles'], default: 'ban' }
  },

  antiRaid: {
    enabled: { type: Boolean, default: true },
    joinThreshold: { type: Number, default: 8 },
    timeWindowSeconds: { type: Number, default: 10 },
    action: { type: String, enum: ['lockdown', 'kick_new', 'dm_owner'], default: 'lockdown' }
  },

  antiSpam: {
    enabled: { type: Boolean, default: true },
    messageThreshold: { type: Number, default: 6 },
    timeWindowSeconds: { type: Number, default: 5 },
    mentionLimit: { type: Number, default: 5 },
    punishment: { type: String, enum: ['mute', 'kick', 'ban'], default: 'mute' },
    muteDurationMinutes: { type: Number, default: 10 }
  },

  // ---- ANTİ-BOT ----
  antiBot: {
    enabled: { type: Boolean, default: false },
    punishment: { type: String, enum: ['kick', 'ban'], default: 'kick' }
  },

  // ---- YENİ HESAP KORUMASI ----
  accountAgeGuard: {
    enabled: { type: Boolean, default: false },
    minDays: { type: Number, default: 7 },
    action: { type: String, enum: ['kick', 'ban', 'quarantine'], default: 'kick' },
    quarantineRoleId: { type: String, default: null }
  },

  // ---- KELİME FİLTRESİ ----
  wordFilter: {
    enabled: { type: Boolean, default: false },
    words: [{ type: String }],
    punishment: { type: String, enum: ['delete_only', 'mute', 'kick'], default: 'delete_only' },
    muteDurationMinutes: { type: Number, default: 10 }
  },

  // ---- LİNK FİLTRESİ ----
  linkFilter: {
    enabled: { type: Boolean, default: false },
    allowedDomains: [{ type: String }],
    punishment: { type: String, enum: ['delete_only', 'mute', 'kick'], default: 'delete_only' },
    muteDurationMinutes: { type: Number, default: 10 }
  },

  vanityGuard: {
    enabled: { type: Boolean, default: true },
    savedVanityCode: { type: String, default: null }
  },

  inviteGuard: {
    enabled: { type: Boolean, default: true } // normal davet linki silinirse koruma
  },

  webhookGuard: {
    enabled: { type: Boolean, default: true },
    punishment: { type: String, enum: ['kick', 'ban', 'strip_roles'], default: 'ban' }
  },

  verification: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    verifiedRoleId: { type: String, default: null }
  },

  // ---- YETKİ / WHITELIST ----
  whitelistUsers: [{ type: String }],
  whitelistRoles: [{ type: String }],

  // ---- LOG & BİLDİRİM ----
  logChannelId: { type: String, default: null },
  logEvents: {
    type: [String],
    default: ['channel_delete', 'role_delete', 'ban', 'kick', 'invite_change', 'webhook_create']
  },
  dmOwnerOnCritical: { type: Boolean, default: true },
  ownerDiscordId: { type: String, default: null },

  // ---- GENEL ----
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { type: String, default: 'Sunucumuza hoş geldin {user}!' },
    useEmbed: { type: Boolean, default: true }
  },
  autoRoleId: { type: String, default: null },

  // Otomatik guard cezalarında "ban" uygulanınca kaç gün sürsün (0 = kalıcı)
  banDurationDays: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
