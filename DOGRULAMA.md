# ImageScanner 1.0.0 — doğrulama

20 Ekim 2026, Windows x64.

- Motor, yerel kayıt, bozuk dosya kurtarma ve işlem iptali: **28/28 test geçti**.
- PNG, JPEG, WebP, GIF, AVIF ve TIFF dosyaları gerçek çözücüyle açılıp karşılaştırıldı.
- Aynı dosya, küçültülmüş/sıkıştırılmış sürüm, hafif renk değişikliği ve merkezden hafif kırpma bulundu. Dört farklı kompozisyon reddedildi.
- Kaynak Electron uygulamasında ve paketlenmiş Windows uygulamasında kabul akışı geçti: 8 örnek görselden beklenen 4 kopya.
- Birebir/benzer filtreleri, yan yana/üst üste karşılaştırma ve kaydırıcı çalıştı.
- Gerçek dosya nesnesiyle sürükle-bırak; aynı yolun tekrar eklenmesinin atlanması; dosya adına göre arama doğrulandı.
- CSV ve JSON dosyaları üretilip tekrar okundu. CSV UTF-8 BOM içeriyor; JSON dört sonucu içeriyor.
- Geçmiş, ayarlar, bekleyen ayar değişikliğinin sonraki işlemden önce kaydı ve gerçek uygulama yeniden açılışı doğrulandı.
- Toplu kayıt kaldırma ve yerel kayıt temizleme sonrası orijinal dosyanın **SHA-256 değeri değişmedi**.
- Küçük pencere boyutunda yatay sayfa taşması olmadı. Ekran görüntüleri görsel olarak incelendi.
- Sandbox ve context isolation açık, Node entegrasyonu kapalı. Uygulamanın dosya beyaz listesi dışında içerik sunulmadığı ve HTTP bağlantısının engellendiği doğrulandı.
- Çalışma zamanı bağımlılık denetimi: `npm audit --omit=dev`, raporlanan açık sayısı **0**.

`artifacts/verification.json` kaynak uygulamanın; `artifacts/packaged-verification.json` paketlenmiş uygulamanın kabul raporudur. `artifacts/portable-boot-verification.json`, taşınabilir başlatıcının gerçek penceresini ve açtığı `app.asar` içeriğinin paketle aynı olduğunu doğrular. `dist/SHA256SUMS.txt` teslim edilen dosyaların SHA-256 değerlerini içerir.

Bu doğrulama yerel örnek çizimler ve bu Windows bilgisayarıyla sınırlıdır. Gerçek fotoğraf koleksiyonunda geniş çaplı doğruluk/performans ölçümü yapılmadı. Program sosyal medya hesabı aramaz ve kişi/yüz tanıma yapmaz.
