const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  prefix: { type: String, default: '!' },

  // ---- GUARD SİSTEMLERİ ----
  antiNuke: {
    enabled: { type: Boolean, default: true },
    channelDeleteThreshold: { type: Number, default: 3 },   // kaç kanal silinince tetiklensin
    roleDeleteThreshold: { type: Number, default: 3 },
    banThreshold: { type: Number, default: 3 },              // kaç toplu ban/kick
    timeWindowSeconds: { type: Number, default: 10 },        // kaç saniye içinde
    punishment: { type: String, enum: ['kick', 'ban', 'strip_roles'], default: 'ban' }
  },

  antiRaid: {
    enabled: { type: Boolean, default: true },
    joinThreshold: { type: Number, default: 8 },              // kaç üye
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

  vanityGuard: {
    enabled: { type: Boolean, default: true },
    savedVanityCode: { type: String, default: null }
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
    message: { type: String, default: 'Sunucumuza hoş geldin {user}!' }
  },
  autoRoleId: { type: String, default: null }

}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
