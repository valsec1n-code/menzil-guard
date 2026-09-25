const ServerBackup = require('../../database/models/ServerBackup');

/**
 * Sunucunun mevcut kanal ve rol yapısının bir anlık görüntüsünü (snapshot) DB'ye kaydeder.
 */
async function createBackup(guild, name, createdBy) {
  const channels = guild.channels.cache
    .filter(c => c.type !== 4) // kategorileri de dahil ediyoruz aslında, filtre kaldırıldı aşağıda
    .map(c => ({
      name: c.name,
      type: c.type,
      parentName: c.parent ? c.parent.name : null,
      position: c.position,
      topic: c.topic || null
    }));

  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id) // @everyone hariç
    .map(r => ({
      name: r.name,
      color: r.color,
      permissions: r.permissions.bitfield.toString(),
      hoist: r.hoist,
      mentionable: r.mentionable,
      position: r.position
    }));

  return ServerBackup.create({
    guildId: guild.id,
    name: name || `Yedek - ${new Date().toLocaleString('tr-TR')}`,
    createdBy: createdBy || null,
    channels,
    roles
  });
}

/**
 * Bir yedekteki kanal/rollerden, sunucuda ŞU AN OLMAYANLARI (isme göre) yeniden oluşturur.
 * Mevcut olanlara dokunmaz, hiçbir şeyi silmez - sadece eksik olanı geri getirir.
 * Bu, nuke sonrası "silinenleri geri getir" senaryosu için güvenli bir yaklaşımdır.
 */
async function restoreBackup(guild, backupId) {
  const backup = await ServerBackup.findById(backupId);
  if (!backup) throw new Error('Yedek bulunamadı');

  const result = { rolesCreated: 0, channelsCreated: 0, errors: [] };

  // Önce rolleri geri getir (kanallar rol iznine referans verebilir, ama biz basic tutuyoruz)
  for (const r of backup.roles) {
    const exists = guild.roles.cache.some(existing => existing.name === r.name);
    if (exists) continue;

    try {
      await guild.roles.create({
        name: r.name,
        color: r.color,
        permissions: BigInt(r.permissions),
        hoist: r.hoist,
        mentionable: r.mentionable,
        reason: 'Backup geri yükleme'
      });
      result.rolesCreated++;
    } catch (e) {
      result.errors.push(`Rol "${r.name}" oluşturulamadı: ${e.message}`);
    }
  }

  // Kategorileri önce oluştur (kanallar parent'a ihtiyaç duyar)
  const categoryNames = [...new Set(backup.channels.filter(c => c.type === 4).map(c => c.name))];
  for (const catName of categoryNames) {
    const exists = guild.channels.cache.some(c => c.name === catName && c.type === 4);
    if (!exists) {
      try {
        await guild.channels.create({ name: catName, type: 4, reason: 'Backup geri yükleme' });
      } catch (e) {
        result.errors.push(`Kategori "${catName}" oluşturulamadı: ${e.message}`);
      }
    }
  }

  // Şimdi normal kanalları geri getir
  for (const c of backup.channels) {
    if (c.type === 4) continue; // kategori zaten yukarıda yapıldı
    const exists = guild.channels.cache.some(existing => existing.name === c.name && existing.type === c.type);
    if (exists) continue;

    try {
      const parent = c.parentName ? guild.channels.cache.find(p => p.name === c.parentName && p.type === 4) : null;
      await guild.channels.create({
        name: c.name,
        type: c.type,
        parent: parent ? parent.id : undefined,
        topic: c.topic || undefined,
        reason: 'Backup geri yükleme'
      });
      result.channelsCreated++;
    } catch (e) {
      result.errors.push(`Kanal "${c.name}" oluşturulamadı: ${e.message}`);
    }
  }

  return result;
}

module.exports = { createBackup, restoreBackup };
