const { getConfig } = require('../utils/getConfig');

function registerCommands(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const config = await getConfig(message.guild.id);
    const prefix = config.prefix || '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'ping') {
      return message.reply(`🏓 Pong! Gecikme: ${client.ws.ping}ms`);
    }

    if (cmd === 'panel') {
      const url = process.env.DASHBOARD_URL || 'Dashboard adresi henüz ayarlanmadı';
      return message.reply(`🌐 Ayar panelin: ${url}`);
    }
  });
}

module.exports = registerCommands;
