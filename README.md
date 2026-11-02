# ImageScanner 1.0.0

Windows için Türkçe, çevrimdışı görsel koleksiyonu ve kopya bulma uygulaması.

**Kapsam:** Kendi seçtiğiniz yerel görseller arasında birebir aynı veya düzenlenmiş görsel kopyalarını karşılaştırır. Yüz tanımaz, kişi kimliği çıkartmaz, Instagram/TikTok hesabı aramaz ve sosyal medya taramaz. Aynı kişinin farklı fotoğraflarını eşleştirmek için tasarlanmamıştır.

## Çalıştırma

Hazır paket: `dist/ImageScanner-1.0.0-portable.exe`. Kurulum veya yönetici yetkisi gerektirmez. Alternatif olarak proje kökündeki `BASLAT.cmd` dosyasına çift tıklayın. Programı ilk çalıştırdığınızda koleksiyon boş açılır.

1. **Koleksiyona ekle** veya **Koleksiyonum → Klasör ekle** ile karşılaştırılacak arşivi seçin. Alt klasörler de taranır. Dosyalar uygulamaya taşınmaz.
2. **Referans görseller → Görsel seç** ile arşivde kopyasını arayacağınız bir veya daha fazla görseli ekleyin. Sürükle-bırak da kullanılabilir.
3. Eşiği belirleyin; başlangıç için **88**. **Benzer kopyaları bul** düğmesine basın.
4. Sonuç kartına tıklayarak **Yan yana** veya **Üst üste** karşılaştırın. Karttaki klasör düğmesi orijinal dosyayı Windows Gezgini'nde gösterir.
5. **Dışa aktar** ile tüm referansların sonuçlarını CSV veya JSON dosyasına kaydedin.

**Örneklerle dene** düğmesi uygulama için çizilmiş bir kıyı görselinin dört kopyasını ve dört farklı çizimi oluşturur. Varsayılan eşikte bir birebir ve üç düzenlenmiş kopya bulunmalıdır. Bu örnekler gerçek sosyal medya verisi değildir.

## Özellikler

- Tekli/toplu dosya ve özyinelemeli klasör ekleme; sürükle-bırak.
- SHA-256 ile dosya düzeyinde birebir eşleşme.
- DCT tabanlı algısal özet, fark özeti ve bütün görselin piksel/renk doğrulaması.
- Boyut, JPEG/WebP sıkıştırması, hafif parlaklık/doygunluk değişimi ve %85 merkez kırpması için yaklaşık kopya karşılaştırması.
- EXIF yön bilgisini normalleştirme; hareketli dosyalarda ilk kare.
- Çoklu referans; birebir/benzer filtreleri; puan ve dosya adı sıralaması.
- Yan yana/üst üste karşılaştırma, orijinal dosyayı klasörde gösterme.
- Arşivde dosya adına göre arama, sayfalama ve toplu kayıt kaldırma.
- Son 20 karşılaştırmanın yerel geçmişi; CSV (UTF-8 BOM, `;` ayracı) ve JSON dışa aktarma.
- İlerleme, iptal, kısmi içe aktarmayı koruma, bozuk dosya bildirimi.
- Otomatik kayıt, atomik dosya değişimi, önceki kayıt yedeği ve bozuk JSON kurtarma.
- Klavye odakları, Türkçe erişilebilir düğme etiketleri ve hareketi azaltma tercihi.

## Puanlar ve sınırlar

Puan 0–100 arası **görsel kopya benzerliğidir**, eşleşme olasılığı değildir. 100 puan yalnızca dosya SHA-256 değerleri aynıysa verilir. Yaklaşık eşleşmeler en fazla 99,9 puan alır. Yüz/kişi, benzer nesne veya benzer konu sınıflandırması yapılmaz.

Koleksiyon en fazla **10.000**, referanslar en fazla **100** görseldir. Dosya başına **128 MB**, **60 megapiksel** sınırı vardır. Her referansın en iyi **200** sonucu tutulur ve dışa aktarılır. Tek bir dosya yolu hem koleksiyonda hem referansta bulunuyorsa kendi kendisiyle eşleştirilmez; başka bir yoldaki aynı kopyası eşleşir.

JPG/JPEG, PNG, WebP, GIF, AVIF, TIFF desteklenir; çözücünün açamadığı dosyalar raporlanır. GIF/animasyonun ilk karesi karşılaştırılır. TIFF önizlemeleri 600 piksele kadar küçük resimden gösterilir. Ağır kırpma, çevirme, döndürme, büyük filigran veya kolajlar kaçırılabilir. Yerel çizim testleri gerçek fotoğraflardan oluşan geniş bir doğruluk ölçümü değildir.

Dosyalar eklendikleri andaki içerikleriyle indekslenir. Değiştirilmiş/taşınmış dosyaları yenilemek için tekrar ekleyin; klasörler arka planda otomatik izlenmez. Dosya boyutu ve değişiklik zamanı aynıysa tekrar ekleme atlanır. Koleksiyon kaydını kaldırmak, o görselin geçmiş eşleşmelerini de kaldırır. Sıfır sonuçlu bir eski tarama geçmişte kalabilir.

## Veriler ve gizlilik

Çalışma sırasında HTTP/HTTPS/WebSocket istekleri engellenir. Hesap, anahtar, bulut servisi, telemetri ve yerel HTTP sunucusu yoktur. Görselleriniz bilgisayarınızdan gönderilmez.

Yerel veri klasörü **Gizlilik ve ayarlar → Yerel kayıtlar** bölümünde gösterilir; normal Windows kullanımında `%APPDATA%/ImageScanner` altındadır. `collection.json` dosya yollarını, özetleri, ayarları ve geçmişi; `thumbnails/` küçük resimleri; `.bak` önceki geçerli kaydı saklar. Bu dosyalar şifrelenmez. Orijinal dosyalar yerlerinde bırakılır. Örnek modu, aynı veri klasörünün `demo/` altına örnek çizimleri yazar.

**Yerel kayıtları temizle**, uygulamadaki koleksiyonu, sorguları, geçmişi ve küçük resimleri temizler; orijinal dosyaları silmez. CSV/JSON dışa aktarımları yerel dosya yolları içerir; bunlar kullanıcı tarafından seçilen konumda kalır.

Electron arayüzü sandbox, context isolation, kapalı Node entegrasyonu, sınırlı IPC ve dosya beyaz listesiyle çalışır. Yeni pencereler ve harici gezinme engellenir. İlgili resmî belgeler: [Electron güvenlik](https://www.electronjs.org/docs/latest/tutorial/security/), [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation), [sharp görüntü işlemleri](https://sharp.pixelplumbing.com/api-operation/).

## Geliştirme

Node.js 24+ ve Windows x64:

```powershell
npm ci
npm run assets
npm start
```

```powershell
npm test          # Karşılaştırma, indeks, hata kurtarma ve iptal testleri
npm run test:app  # Gerçek Electron penceresinde kabul akışı
npm run pack      # dist/win-unpacked
npm run dist      # Taşınabilir Windows EXE
```

Paket kontrolü: `node tests/electron-smoke.cjs dist/win-unpacked/ImageScanner.exe`.

`artifacts/` altında ekran görüntüleri, test dışa aktarımları ve doğrulama raporu bulunur. Kabul testleri ayrı `.test-data/` klasörü kullanır; normal kullanıcı verisine dokunmaz. Paket Windows x64 içindir. Kod imzalama sertifikası içermez.

## Kaynak yapısı

`src/main.cjs`: pencere, IPC, yerel protokol, içe aktarma ve dışa aktarma. `src/preload.cjs`: kısıtlı arayüz köprüsü. `src/worker.cjs`: arka plan işi. `src/lib/`: görüntü analizi, karşılaştırma ve kayıt. `src/ui/`: çevrimdışı arayüz. `assets/`: uygulama için çizilmiş SVG örnekleri ve ikonlar. `tests/`: motor, kayıt, iptal ve gerçek pencere kabul kontrolleri.
