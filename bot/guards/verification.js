const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils/getConfig');

function registerVerification(client) {
  client.on('guildMemberAdd', async (member) => {
    const config = await getConfig(member.guild.id);

    // Hoşgeldin mesajı
    if (config.welcome.enabled && config.welcome.channelId) {
      const channel = member.guild.channels.cache.get(config.welcome.channelId);
      if (channel) {
        const msg = config.welcome.message.replace('{user}', `<@${member.id}>`);
        channel.send(msg).catch(() => {});
      }
    }

    // Doğrulama sistemi kapalıysa direkt otomatik rolü ver
    if (!config.verification.enabled) {
      if (config.autoRoleId) {
        member.roles.add(config.autoRoleId).catch(() => {});
      }
      return;
    }

    // Doğrulama açıksa otomatik rol vermeden bekle (verify butonuna basınca verilecek)
    if (!config.verification.channelId) return;
    const verifyChannel = member.guild.channels.cache.get(config.verification.channelId);
    if (!verifyChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('👋 Hoş geldin!')
      .setDescription(`${member}, sunucuyu kullanabilmek için aşağıdaki butona tıklayarak doğrulama yap.`)
      .setColor(0x2ECC71);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_button').setLabel('✅ Doğrula').setStyle(ButtonStyle.Success)
    );

    verifyChannel.send({ content: `${member}`, embeds: [embed], components: [row] }).catch(() => {});
  });

  // Butona basınca doğrulama rolünü ver
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'verify_button') return;

    const config = await getConfig(interaction.guild.id);
    if (!config.verification.verifiedRoleId) {
      return interaction.reply({ content: 'Doğrulama rolü ayarlanmamış, yöneticiye haber ver.', ephemeral: true });
    }

    try {
      await interaction.member.roles.add(config.verification.verifiedRoleId);
      if (config.autoRoleId) await interaction.member.roles.add(config.autoRoleId).catch(() => {});
      await interaction.reply({ content: '✅ Doğrulama başarılı, sunucuya hoş geldin!', ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: '❌ Bir hata oluştu, yöneticiye haber ver.', ephemeral: true });
    }
  });
}

module.exports = { registerVerification };
