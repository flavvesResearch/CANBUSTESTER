# Multi-Language Support / Çoklu Dil Desteği

## Overview / Genel Bakış

This project now supports both Turkish (TR) and English (EN) languages. Users can switch between languages using the language selector in the header.

Bu proje artık hem Türkçe (TR) hem de İngilizce (EN) dillerini desteklemektedir. Kullanıcılar başlıktaki dil seçici ile diller arasında geçiş yapabilir.

## How it Works / Nasıl Çalışır

### Frontend

1. **Language Files / Dil Dosyaları**
   - `static/i18n.js` - Contains all translations for both languages
   - Translations are stored in a structured JSON format
   - Language preference is saved in localStorage

2. **Usage in HTML**
   - Add `data-i18n="key"` attribute to any element for automatic translation
   - Add `data-i18n-placeholder="key"` for input placeholders
   - Example: `<button data-i18n="send">Send</button>`

3. **Usage in JavaScript**
   - Import translation functions: `import { t, getCurrentLanguage, setCurrentLanguage } from './i18n.js';`
   - Use `t('key')` to get translated text
   - Use `setCurrentLanguage('en')` or `setCurrentLanguage('tr')` to change language

### Backend

1. **Translation Module**
   - `app/translations.py` - Contains all backend translations
   - Provides `get_translation(lang, key)` and `get_all_translations(lang)` functions

2. **API Endpoint**
   - `GET /api/translations/{lang}` - Returns all translations for specified language
   - Supports 'tr' and 'en' parameters

## Adding New Translations / Yeni Çeviriler Ekleme

### Frontend

Edit `static/i18n.js` and add your key to both `tr` and `en` objects:

```javascript
const TRANSLATIONS = {
    tr: {
        your_new_key: "Türkçe metin",
        // ...
    },
    en: {
        your_new_key: "English text",
        // ...
    }
};
```

### Backend

Edit `app/translations.py` and add your key to both language dictionaries:

```python
TRANSLATIONS: Dict[str, Dict[str, Any]] = {
    "tr": {
        "your_new_key": "Türkçe metin",
        # ...
    },
    "en": {
        "your_new_key": "English text",
        # ...
    }
}
```

## Language Selector / Dil Seçici

The language selector is located in the page header next to the theme toggle button. It consists of two buttons:
- **TR** - Switch to Turkish
- **EN** - Switch to English

The active language button is highlighted.

Dil seçici, tema değiştirme düğmesinin yanında sayfa başlığında bulunur. İki düğmeden oluşur:
- **TR** - Türkçe'ye geç
- **EN** - İngilizce'ye geç

Aktif dil düğmesi vurgulanır.

## Default Language / Varsayılan Dil

The default language is Turkish (TR). If a user hasn't selected a language before, Turkish will be used automatically.

Varsayılan dil Türkçe'dir (TR). Kullanıcı daha önce bir dil seçmediyse, otomatik olarak Türkçe kullanılır.

## Features / Özellikler

- ✅ Automatic translation of all UI elements
- ✅ Language preference persists across sessions (localStorage)
- ✅ Dynamic content translation (messages, errors, etc.)
- ✅ Date/time formatting based on selected language
- ✅ Easy to add new languages
- ✅ No page reload required when switching languages

---

- ✅ Tüm arayüz öğelerinin otomatik çevirisi
- ✅ Dil tercihi oturumlar arası saklanır (localStorage)
- ✅ Dinamik içerik çevirisi (mesajlar, hatalar, vb.)
- ✅ Seçilen dile göre tarih/saat biçimlendirmesi
- ✅ Yeni diller eklenmesi kolay
- ✅ Dil değiştirirken sayfa yenileme gerektirmez
