# CAN Bus Tester

[English](#english) | [Türkçe](#türkçe)

---

## English

A FastAPI application that allows you to generate and send CAN messages from DBC files while monitoring incoming frames on the bus through a web interface.

### Features

- View message and signal details by selecting and loading DBC files through the browser
- Automatically list CAN interfaces and channels on your system with python-can, with manual input support
- Set signal values for the selected message and send them once or at specified intervals
- Bulk signal assignment tools to set all signals to 0/1 or a custom value with a single click
- Automatic signal chaser mode that cycles through signals of the selected message at specified intervals, setting them to max/min values
- Configure CAN interface (e.g., `socketcan`, `pcan`, `vector`) from the web panel and use default 500 kbit/s bitrate
- Monitor incoming messages in real-time through WebSocket, decoding them in a modern log view
- Responsive interface with one-click toggle between light/dark mode
- **Multi-language support (Turkish/English)** with language selector in the header
- Save CAN traffic as named recordings and replay them later with graphical analysis

### Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> Note: Depending on the hardware you use with `python-can`, additional drivers or library settings may be required (for example, for `socketcan` on Linux: `sudo ip link set can0 up type can bitrate 500000`).

### Starting the Application

```bash
uvicorn app.main:app --reload
```

Then open `http://127.0.0.1:8000/` in your browser to access the interface.

### Web Interface Workflow

1. In the **CAN Interface** panel, available interfaces are automatically listed; select the appropriate channel or use manual fields if needed.
2. In the **Load DBC** section, use the file select button to choose a `.dbc` file from your local disk. Sample file: `DBC/LCS_IKA_TRU.dbc`.
3. In the **Create Message** panel, select a message from the list; signals are grouped horizontally in compact cards. Enter values and specify period (0 or empty = one-time).
4. Click Send to transmit the frame. If periodic transmission is active, you can stop it with the Stop button.
5. In the **CAN Monitor** panel, both sent and received frames are displayed in real-time. Messages defined in the DBC are automatically decoded.
6. You can start signal chaser from this panel to automatically cycle through each signal to its maximum/minimum value at specified intervals.
7. Start and stop recording from the top of the monitor panel to save CAN traffic to file, then use the **Open Recordings** link to perform graphical analysis on the playback page.

### Multi-Language Support

The application supports both Turkish and English languages. Users can switch between languages using the language selector (TR/EN buttons) in the page header. The selected language preference is saved and persists across sessions.

For more details about the multi-language implementation, see [LANGUAGE_SUPPORT.md](LANGUAGE_SUPPORT.md).

### Recording and Playback

- You can start recording by entering a recording name or leaving it blank for automatic date/time naming.
- All RX/TX events in the CAN Monitor panel are saved during recording; when you stop, it's added to the recordings list.
- On the `http://127.0.0.1:8000/playback` page, select a recording and load the relevant DBC file to examine signals on a timeline and view the event chronology in table format.

### Development Notes

- The interface is prepared as a modern single-page application (SPA); FastAPI only serves the API and static files.
- Incoming messages are automatically decoded if a match is found in the DBC, otherwise raw data is displayed.
- Multiple periodic transmission keys are supported; the default key is the message name.

### License

This project is prepared for demonstration purposes; you can continue development as you wish.

---

## Türkçe

DBC dosyalarından CAN mesajlarını üretip gönderirken aynı zamanda hat üzerindeki gelen çerçeveleri web arayüzünden izleyebileceğiniz bir FastAPI uygulaması.

### Özellikler

- Tarayıcı üzerinden DBC dosyası seçip yükleyerek mesaj ve sinyal detaylarını görüntüleme
- python-can ile sisteminizdeki CAN arayüz ve kanallarını otomatik listeleme, dilerseniz manuel giriş desteği
- Seçilen mesaj için sinyal değerlerini ayarlayıp tek seferde veya belirlenen periyotla gönderme
- Tüm sinyalleri tek tıkla 0/1 veya özel bir değere çekmek için toplu sinyal atama araçları
- Seçili mesajın sinyallerini belirlediğiniz aralıklarla sırayla max/min değerlerine süren otomatik sinyal tarama modu
- CAN arayüzünü (ör. `socketcan`, `pcan`, `vector`) web panelinden yapılandırma ve varsayılan 500 kbit/s bit hızını kullanma
- WebSocket üzerinden canlı gelen mesajları çözümleyerek modern log görünümünde izleme
- Işık/Karanlık mod arasında tek tuşla geçiş yapabilen responsive arayüz
- **Çoklu dil desteği (Türkçe/İngilizce)** sayfa başlığındaki dil seçici ile
- CAN trafiğini isimlendirilebilir kayıtlar halinde saklayıp daha sonra grafik tabanlı olarak tekrar oynatma

### Kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> Not: `python-can` ile kullanacağınız araca göre ek sürücüler veya kütüphane ayarları gerekebilir (örneğin `socketcan` için Linux üzerinde `sudo ip link set can0 up type can bitrate 500000`).

### Uygulamayı Başlatma

```bash
uvicorn app.main:app --reload
```

Ardından tarayıcınızdan `http://127.0.0.1:8000/` adresini açarak arayüze erişebilirsiniz.

### Web Arayüzü Akışı

1. **CAN Arayüzü** panelinde sistemde bulunan arayüzler otomatik olarak listelenir; uygun kanalı seçin veya gerekirse manuel alanları kullanarak giriş yapın.
2. **DBC Yükle** kısmından dosya seç butonuyla yerel diskinizden `.dbc` uzantılı dosyanızı seçip yükleyin. Örnek dosya `DBC/LCS_IKA_TRU.dbc` klasöründe.
3. **Mesaj Oluştur** panelinde listeden mesaj seçin; sinyaller kompakt kart yapısında yatay olarak gruplanır. Değerleri girip periyot (0 veya boş = tek sefer) belirleyin.
4. Gönder düğmesiyle çerçeveyi iletin. Periyodik gönderim açıksa `Durdur` düğmesiyle sonlandırabilirsiniz.
5. **CAN İzleme** panelinde hem gönderilen hem de alınan çerçeveler canlı olarak görüntülenir. DBC'de tanımlı mesajlar otomatik olarak çözümlenir.
6. İsterseniz bu panelden sinyal taramasını başlatıp belirlediğiniz aralıkta her sinyali sırasıyla maksimum/minimum değerine otomatik taşıyabilirsiniz.
7. İzleme panelinin üstünden kayıt başlatıp durdurarak CAN trafiğini dosyaya kaydedebilir, ardından **Kayıtları Aç** bağlantısıyla playback sayfasında grafik analizini yapabilirsiniz.

### Çoklu Dil Desteği

Uygulama hem Türkçe hem de İngilizce dillerini desteklemektedir. Kullanıcılar sayfa başlığındaki dil seçici (TR/EN düğmeleri) ile diller arasında geçiş yapabilir. Seçilen dil tercihi kaydedilir ve oturumlar arası saklanır.

Çoklu dil implementasyonu hakkında daha fazla bilgi için [LANGUAGE_SUPPORT.md](LANGUAGE_SUPPORT.md) dosyasına bakınız.

### Kayıt ve Oynatma

- Kayıt adını girerek veya boş bırakarak otomatik tarih/saat isimlendirmesiyle kayıt başlatabilirsiniz.
- Kayıt sırasında CAN İzleme panelindeki tüm RX/TX olayları saklanır; durdurduğunuzda kayıt listesine eklenir.
- `http://127.0.0.1:8000/playback` sayfasında kayıt seçip ilgili DBC dosyasını yükledikten sonra sinyalleri zaman ekseninde inceleyebilir, olay kronolojisini tablo halinde görebilirsiniz.

### Geliştirme Notları

- Arayüz modern bir tek sayfa (SPA) olarak hazırlanmıştır; FastAPI yalnızca API ve statik dosyaları sunar.
- Gelen mesajlar DBC'de eşleşme bulunursa otomatik olarak çözümlenir, aksi durumda ham veri görüntülenir.
- Birden çok periyodik gönderim anahtarı desteklenir; varsayılan anahtar mesaj adıdır.

### Lisans

Bu proje örnek amaçlı hazırlanmıştır; dilediğiniz gibi geliştirmeye devam edebilirsiniz.
