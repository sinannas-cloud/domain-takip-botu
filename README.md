# Domain Takip Botu

Bu bot, `domains.txt` dosyasindaki alan adlarini resmi RDAP servislerinden
duzenli olarak kontrol eder. Bir alan adi bos gorunmeye basladiginda, kritik
yasam dongusu asamasina girdiginde veya sorgular arka arkaya hata verdiginde
Telegram bildirimi gonderir.

## Kurulum

Node.js 20.12 veya daha yeni bir surum gerekir.

1. `.env.example` dosyasini `.env` adiyla kopyalayin.
2. Telegram bot anahtarini ve sohbet kimligini `.env` icine yazin.
3. Takip edilecek alan adlarini `domains.txt` dosyasina ekleyin.
4. Proje klasorunde `npm start` komutunu calistirin.

Tek seferlik kontrol:

```powershell
npm run check
```

Testler:

```powershell
npm test
```

## Telegram Ayari

1. Telegram'da `@BotFather` hesabina `/newbot` gondererek bot olusturun.
2. Verilen anahtari `TELEGRAM_BOT_TOKEN` alanina yazin.
3. Bota bir mesaj gonderin.
4. Tarayicida
   `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` adresini acin.
5. Sonuctaki `chat.id` degerini `TELEGRAM_CHAT_ID` alanina yazin.

Telegram bilgileri bos birakilirsa bot kontrolleri yapar ve bildirimleri
konsola yazar.

## Onemli Not

RDAP'ta bir kaydin bulunamamasi guclu bir uygunluk sinyalidir ancak satin alma
garantisi degildir. Kayit firmasinin sonucu son kontroldur. Suresi dolmus bir
alan adi da hemen bosa dusmeyebilir; yenileme, redemption ve pending-delete
asamalarindan gecebilir.

Bazi ulke uzantilari RDAP sunmadigi icin `unknown` sonucu verebilir. Bu
uzantilar icin sonraki asamada kayit firmasi API entegrasyonu eklenebilir.

## Ucretsiz 7/24 Calisma

`.github/workflows/domain-check.yml` dosyasi GitHub Actions uzerinde botu
yaklasik 5 dakikada bir calistirir.

Depo ayarlarinda asagidaki GitHub Actions secret degerleri tanimlanmalidir:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Her kontrolden sonra `data/state.json` otomatik guncellenir. Boylece ayni
durum icin tekrar tekrar Telegram mesaji gonderilmez.

GitHub zamanlanmis gorevleri yogunluga bagli olarak gecikebilir. Herkese acik
depolarda 60 gun boyunca etkinlik olmazsa zamanlanmis gorevler devre disi
kalabildigi icin bot 30 gunde bir otomatik yasam isareti kaydi olusturur.
