const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

const { registerAntiNuke } = require('./guards/antiNuke');
const { registerAntiRaid } = require('./guards/antiRaid');
const { registerAntiSpam } = require('./guards/antiSpam');
const { registerVanityGuard } = require('./guards/vanityGuard');
const { registerInviteGuard } = require('./guards/inviteGuard');
const { registerWebhookGuard } = require('./guards/webhookGuard');
const { registerVerification } = require('./guards/verification');
const registerCommands = require('./commands');

function createBotClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildWebhooks
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
  });

  client.commands = new Collection();

  client.once('ready', () => {
    console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  });

  // Tüm guard sistemlerini bağla
  registerAntiNuke(client);
  registerAntiRaid(client);
  registerAntiSpam(client);
  registerVanityGuard(client);
  registerInviteGuard(client);
  registerWebhookGuard(client);
  registerVerification(client);

  // Komutları bağla
  registerCommands(client);

  return client;
}

module.exports = { createBotClient };
