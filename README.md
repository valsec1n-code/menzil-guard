# 🛡️ Discord Guard Bot + Web Dashboard

Anti-nuke, anti-raid, anti-spam, vanity URL koruması, doğrulama sistemi ve
kendi web panelinden (şifre ile giriş) tüm ayarları yönetebildiğin bir Discord botu.

---

## 📋 1. Discord Bot Oluşturma

1. https://discord.com/developers/applications adresine git, **New Application**.
2. Sol menüden **Bot** sekmesine gir, **Reset Token** ile token'ı al (bunu kimseyle paylaşma).
3. Aynı sayfada **Privileged Gateway Intents** bölümünden şunları aç:
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`
4. Sol menüden **OAuth2 > URL Generator**'a git:
   - Scopes: `bot`
   - Permissions: `Administrator` (guard sisteminin doğru çalışması için gerekli)
5. Oluşan linkle botu sunucuna ekle.

---

## 🗄️ 2. MongoDB Atlas (Ücretsiz Veritabanı)

1. https://www.mongodb.com/cloud/atlas/register adresinden ücretsiz hesap aç.
2. **Create a deployment** → **M0 Free** seç → bir bölge seç → oluştur.
3. **Database Access**'ten bir kullanıcı adı/şifre oluştur (bunu not al).
4. **Network Access**'ten **Allow Access from Anywhere** (`0.0.0.0/0`) ekle
   (Railway'in IP'si sabit olmadığı için gerekli).
5. **Connect** → **Drivers** → bağlantı linkini kopyala, şuna benzer olacak:
   ```
   mongodb+srv://kullanici:sifre@cluster0.xxxxx.mongodb.net/guardbot?retryWrites=true&w=majority
   ```
   Bunu `.env` dosyasındaki `MONGODB_URI` için kullanacaksın.

---

## 💻 3. GitHub'a Yükleme

```bash
git init
git add .
git commit -m "İlk commit - guard bot"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/REPO_ADIN.git
git push -u origin main
```

**ÖNEMLİ:** `.env` dosyasını asla GitHub'a yükleme (`.gitignore` zaten engelliyor).

---

## 🚀 4. Railway'e Deploy

1. https://railway.app → GitHub hesabınla giriş yap.
2. **New Project** → **Deploy from GitHub repo** → reponu seç.
3. Railway otomatik olarak `package.json`'ı görüp Node.js projesi olarak algılar.
4. **Variables** sekmesine gir, şu değişkenleri ekle:
   | Değişken | Değer |
   |---|---|
   | `DISCORD_TOKEN` | Discord Developer Portal'dan aldığın token |
   | `MONGODB_URI` | MongoDB Atlas bağlantı linkin |
   | `SESSION_SECRET` | Rastgele uzun bir metin (örn. `openssl rand -hex 32` ile üretebilirsin) |
   | `SETUP_KEY` | Rastgele bir anahtar, ilk kurulumda kullanacaksın |
5. **Settings > Networking** kısmından **Generate Domain** yap. Sana
   `https://xxxx.up.railway.app` gibi bir adres verecek.
6. Bu adresi `DASHBOARD_URL` değişkenine de ekle (opsiyonel, `!panel` komutu için).
7. Deploy tamamlanınca **Deployments** sekmesinden logları izleyip
   `✅ Bot giriş yaptı` ve `🌐 Dashboard çalışıyor` mesajlarını gördüğünde her şey hazır demektir.

---

## 🔧 5. İlk Kurulum (Panel Hesabı Oluşturma)

1. Railway'in verdiği adrese git: `https://xxxx.up.railway.app/setup`
2. İstenen bilgileri doldur:
   - **Kurulum Anahtarı** → Railway'e girdiğin `SETUP_KEY`
   - **Discord Sunucu ID'n** → Discord'da sunucu ismine sağ tık > "Sunucu Kimliğini Kopyala"
     (Developer Mode kapalıysa: Discord Ayarlar > Gelişmiş > Geliştirici Modu'nu aç)
   - **Discord Kullanıcı ID'n** → kendi profiline sağ tık > "Kullanıcı Kimliğini Kopyala"
   - **Panel Kullanıcı Adı / Şifre** → panelde giriş yapacağın bilgiler
3. Kaydet, ardından `/login` sayfasından giriş yap.

Artık `discord.gg/menzil` dahil tüm ayarları panelden yönetebilirsin. 🎉

---

## 📁 Proje Yapısı

```
discord-guard-bot/
├── index.js                 # Ana başlatıcı (bot + web birlikte)
├── bot/
│   ├── client.js             # Discord client kurulumu
│   ├── guards/                # Tüm koruma sistemleri
│   ├── commands/              # !ping, !panel gibi komutlar
│   └── utils/                  # Yardımcı fonksiyonlar
├── web/
│   ├── app.js                 # Express dashboard
│   ├── routes/                 # login, setup, dashboard rotaları
│   └── views/                  # EJS sayfaları
└── database/
    ├── connection.js
    └── models/                 # MongoDB şemaları
```

## 🆕 Ek Özellikler

- **Kanal/Rol Aç-Sil Guard'ları**: 4'ü ayrı ayrı, kendi eşik/ceza ayarlarıyla
- **Anti-Bot**: Whitelist dışı botların sunucuya girmesini engeller
- **Yeni Hesap Koruması**: Hesap yaşı X günden azsa kick/ban/karantina
- **Kelime Filtresi**: Yasaklı kelime listesi, otomatik silme + ceza
- **Link Filtresi**: Sadece izin verilen domainlere izin verme
- **Geçici Ban**: Panelden veya guard'lardan verilen banlar X gün sonra otomatik kalkar
- **Davet Takip Sistemi**: `/dashboard/invites` - kim kaç kişi davet etti
- **Manuel Moderasyon Paneli**: `/dashboard/moderate` - panelden direkt kick/ban/mute/unban + kullanıcı ceza geçmişi arama
- **2FA**: `/dashboard/account` - Google Authenticator ile ekstra güvenlik
- **Giriş Güvenliği**: 5 yanlış denemede 15 dakika kilit + `/dashboard/security`'de giriş geçmişi
- **İstatistik Grafiği**: Ana sayfada son 7 günün engellenen olay sayısı

## ⚠️ Notlar

- Bot rolünün sunucudaki **en üstte** olması gerekiyor (özellikle rol/yetki
  alma işlemlerinin çalışabilmesi için).
- Vanity URL guard'ın çalışması için sunucunun **Level 3 boost**'a sahip olması gerekir
  (senin durumunda zaten var).
- Whitelist'e **kendi ana hesabını** eklemeyi unutma, yoksa yanlışlıkla kendine
  ceza uygulanabilir.
