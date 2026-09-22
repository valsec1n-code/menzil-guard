// Bot üzerinde hiçbir prefix komutu ÇALIŞMIYOR (bilerek).
// Ayarlar sadece web dashboard'dan yönetiliyor, Discord'da kimse
// (adminler dahil) hiçbir komut yazarak ayar/işlem yapamaz.
// Guard sistemleri (anti-nuke, anti-raid vs.) bu dosyadan bağımsız,
// otomatik olarak çalışmaya devam eder.
function registerCommands(client) {
  // Kasıtlı olarak boş bırakıldı - komut dinleyicisi eklenmiyor.
}

module.exports = registerCommands;
