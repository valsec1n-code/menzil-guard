const { getConfig } = require('../utils/getConfig');
const { isWhitelisted, applyPunishment, logEvent } = require('../utils/punish');

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '').toLowerCase();
  } catch {
    return null;
  }
}

function registerContentFilters(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const config = await getConfig(message.guild.id);
    const member = message.member;
    if (await isWhitelisted(config, member)) return;

    // ---- KELİME FİLTRESİ ----
    if (config.wordFilter.enabled && config.wordFilter.words.length > 0) {
      const lowerContent = message.content.toLowerCase();
      const matched = config.wordFilter.words.find(w => lowerContent.includes(w.toLowerCase()));

      if (matched) {
        await message.delete().catch(() => {});
        let action = 'mesaj silindi';

        if (config.wordFilter.punishment !== 'delete_only') {
          action = await applyPunishment(
            message.guild, message.author.id, config.wordFilter.punishment,
            'Yasaklı kelime kullanımı', config.wordFilter.muteDurationMinutes
          );
        }

        await logEvent(message.guild, config, {
          type: 'word_filter',
          description: `${message.author.tag} yasaklı bir kelime içeren mesaj gönderdi.`,
          moderatorId: message.author.id,
          moderatorTag: message.author.tag,
          actionTaken: action
        });
        return;
      }
    }

    // ---- LİNK FİLTRESİ ----
    if (config.linkFilter.enabled) {
      const urls = message.content.match(URL_REGEX);
      if (urls) {
        const hasDisallowed = urls.some(url => {
          const domain = extractDomain(url);
          if (!domain) return true;
          return !config.linkFilter.allowedDomains.some(allowed => domain.includes(allowed.toLowerCase()));
        });

        if (hasDisallowed) {
          await message.delete().catch(() => {});
          let action = 'mesaj silindi';

          if (config.linkFilter.punishment !== 'delete_only') {
            action = await applyPunishment(
              message.guild, message.author.id, config.linkFilter.punishment,
              'İzinsiz link paylaşımı', config.linkFilter.muteDurationMinutes
            );
          }

          await logEvent(message.guild, config, {
            type: 'link_filter',
            description: `${message.author.tag} izinsiz bir link paylaştı.`,
            moderatorId: message.author.id,
            moderatorTag: message.author.tag,
            actionTaken: action
          });
        }
      }
    }
  });
}

module.exports = { registerContentFilters };
