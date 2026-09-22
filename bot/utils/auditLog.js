/**
 * Belirli bir audit log tipine göre en son işlemi yapan kişiyi bulur.
 * Discord olayları anlık geldiği için audit log'a küçük bir gecikmeyle ulaşılır,
 * bu yüzden kısa bir bekleme + son 5 saniye içindeki kayıtlar kontrol edilir.
 */
async function findExecutor(guild, auditLogType, targetId = null) {
  try {
    await new Promise(r => setTimeout(r, 500)); // audit log'un işlenmesi için kısa bekleme

    const logs = await guild.fetchAuditLogs({ type: auditLogType, limit: 5 });
    const now = Date.now();

    for (const entry of logs.entries.values()) {
      const isRecent = now - entry.createdTimestamp < 8000; // son 8 saniye
      const matchesTarget = targetId ? entry.target?.id === targetId : true;

      if (isRecent && matchesTarget) {
        return entry.executor; // Discord.js User nesnesi
      }
    }
    return null;
  } catch (err) {
    console.error('Audit log okuma hatası:', err.message);
    return null;
  }
}

module.exports = { findExecutor };
