const GuildConfig = require('../../database/models/GuildConfig');

// Basit bellek içi cache - her olayda DB'ye gitmemek için (5 saniyede bir yenilenir)
const cache = new Map();
const CACHE_TTL = 5000;

async function getConfig(guildId) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  let config = await GuildConfig.findOne({ guildId });
  if (!config) {
    config = await GuildConfig.create({ guildId });
  }

  cache.set(guildId, { data: config, time: Date.now() });
  return config;
}

function invalidateCache(guildId) {
  cache.delete(guildId);
}

module.exports = { getConfig, invalidateCache };
