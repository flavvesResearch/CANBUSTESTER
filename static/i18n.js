// Translations for CAN Bus Tester

const TRANSLATIONS = {
    tr: {
        // General
        app_title: "CAN Bus Tester",
        app_description: "DBC tabanlı CAN mesajlarını web üzerinden oluştur, gönder ve izle.",
        footer_text: "Web arayüzü FastAPI + WebSocket altyapısı ile çalışmaktadır.",
        
        // Theme
        dark_mode: "🌙 Koyu Mod",
        light_mode: "☀️ Açık Mod",
        
        // Interface Section
        can_interface: "1. CAN Arayüzü",
        interface: "Arayüz",
        channel: "Kanal",
        bitrate: "Bit Hızı (bps)",
        start_connection: "Bağlantıyı Başlat",
        select_interface: "Arayüz seçin",
        select_channel: "Kanal seçin",
        select_interface_first: "Önce arayüz seçin",
        loading_interfaces: "Arayüzleri getiriliyor…",
        manual_interface: "Arayüz (manuel)",
        manual_channel: "Kanal (manuel)",
        other_manual: "Diğer (manuel)",
        manual_mode_active: "Manuel giriş kullanılıyor",
        no_channels_found: "Kanal bulunamadı",
        not_configured_yet: "Henüz yapılandırılmadı.",
        
        // DBC Section
        load_dbc: "2. DBC Yükle",
        select_file: "Dosya seçin",
        upload: "Yükle",
        dbc_not_loaded: "DBC yüklenmedi.",
        messages_found: "mesaj bulundu.",
        
        // Message Section
        create_message: "3. Mesaj Oluştur",
        message: "Mesaj",
        load_dbc_first: "Önce DBC yükleyin",
        select_message: "Mesaj seçin",
        period_ms: "Periyot (ms)",
        period_placeholder: "0 = tek sefer",
        bulk_signal_value: "Toplu Sinyal Değeri",
        bulk_value_placeholder: "Örn. 0",
        apply_all: "Tümünü Uygula",
        all_ones: "Hepsi 1",
        all_zeros: "Hepsi 0",
        signal_chaser_interval: "Tarama Süresi (sn)",
        chaser_mode_signals: "Sinyal taraması",
        chaser_mode_codes: "Hata kodu taraması",
        code_source_excel: "Excel ile gönder",
        code_source_manual: "Manuel aralık",
        code_excel_select: "Excel dosyası seçin",
        code_excel_help: "Dosyayı yükleyerek hata kodlarını getirin.",
        code_excel_uploading: "Excel yükleniyor…",
        code_excel_required: "Önce bir Excel dosyası yükleyin.",
        code_range_required: "Başlangıç ve bitiş değerlerini girin.",
        code_range_start: "Başlangıç (hex)",
        code_range_end: "Bitiş (hex)",
        code_range_placeholder: "örn. 0x1F00",
        code_manual_help: "Başlangıç ve bitiş değerlerini hex formatında girin.",
        start_signal_chaser: "Sinyal Taramasını Başlat",
        stop_chaser: "Tarama Durdur",
        chaser_ready: "Tarama hazır.",
        code_chaser_ready: "Hata kodu gönderimine hazır.",
        send: "Gönder",
        stop: "Durdur",
        no_messages_found: "Mesaj bulunamadı.",
        
        // Monitor Section
        can_monitor: "CAN İzleme",
        recording_name: "Kayıt Adı",
        auto_name: "Otomatik isim",
        start_recording: "Kaydı Başlat",
        stop_recording: "Kaydı Durdur",
        open_recordings: "Kayıtları Aç",
        recording_waiting: "Kayıt beklemede.",
        no_recordings_yet: "Henüz kayıt bulunmuyor.",
        
        // Signal Info
        min: "Min",
        max: "Max",
        
        // Messages
        select_message_first: "Lütfen bir mesaj seçin.",
        enter_bulk_value: "Toplu değer için bir sayı girin.",
        invalid_value_for: "için geçersiz değer:",
        message_sent: "Mesaj gönderildi.",
        periodic_started: "Periyodik gönderim başladı",
        periodic_stopped: "Periyodik gönderim durduruldu.",
        recording_started: "Kayıt başladı:",
        recording_completed: "Kayıt tamamlandı:",
        recording_in_progress: "Kayıt devam ediyor:",
        chaser_started: "Sinyal taraması başlatıldı.",
        chaser_stopped: "Sinyal taraması durduruldu.",
        chaser_running: "Sinyal taraması çalışıyor",
        code_chaser_started: "Hata kodu taraması başlatıldı.",
        code_chaser_stopped: "Hata kodu taraması durduruldu.",
        code_chaser_running: "Hata kodu taraması çalışıyor",
        current_code: "Aktif kod:",
        code_total: "Toplam kod:",
        active: "Aktif:",
        interval_must_be_positive: "Süre 0'dan büyük bir sayı olmalı.",
        enter_interface_info: "Lütfen arayüz bilgisini girin.",
        enter_channel_info: "Lütfen kanal bilgisini girin.",
        select_dbc_file: "Lütfen bir DBC dosyası seçin.",
        websocket_opened: "WebSocket bağlantısı açıldı.",
        websocket_closed: "WebSocket kapandı, 2 saniye sonra yeniden deneniyor.",
        websocket_error: "WebSocket hatası",
        websocket_parse_error: "WebSocket verisi çözümlenemedi",
        interface_list_failed: "Arayüz listesi alınamadı, manuel giriş yapabilirsiniz.",
        interface_status_failed: "Arayüz durumu alınamadı",
        recordings_list_failed: "Kayıt listesi alınamadı",
        chaser_status_failed: "Sinyal tarama durumu alınamadı",
        error: "Hata:",
        loaded_dbc: "Yüklü DBC:",
        events: "olay",
        play: "Oynat",
        every: "her",
    },
    en: {
        // General
        app_title: "CAN Bus Tester",
        app_description: "Create, send and monitor DBC-based CAN messages via web interface.",
        footer_text: "Web interface powered by FastAPI + WebSocket infrastructure.",
        
        // Theme
        dark_mode: "🌙 Dark Mode",
        light_mode: "☀️ Light Mode",
        
        // Interface Section
        can_interface: "1. CAN Interface",
        interface: "Interface",
        channel: "Channel",
        bitrate: "Bitrate (bps)",
        start_connection: "Start Connection",
        select_interface: "Select interface",
        select_channel: "Select channel",
        select_interface_first: "Select interface first",
        loading_interfaces: "Loading interfaces…",
        manual_interface: "Interface (manual)",
        manual_channel: "Channel (manual)",
        other_manual: "Other (manual)",
        manual_mode_active: "Using manual input",
        no_channels_found: "No channels found",
        not_configured_yet: "Not configured yet.",
        
        // DBC Section
        load_dbc: "2. Load DBC",
        select_file: "Select file",
        upload: "Upload",
        dbc_not_loaded: "DBC not loaded.",
        messages_found: "messages found.",
        
        // Message Section
        create_message: "3. Create Message",
        message: "Message",
        load_dbc_first: "Load DBC first",
        select_message: "Select message",
        period_ms: "Period (ms)",
        period_placeholder: "0 = one-time",
        bulk_signal_value: "Bulk Signal Value",
        bulk_value_placeholder: "e.g. 0",
        apply_all: "Apply All",
        all_ones: "All 1s",
        all_zeros: "All 0s",
        signal_chaser_interval: "Scan Interval (sec)",
        chaser_mode_signals: "Signal sweep",
        chaser_mode_codes: "Error code sweep",
        code_source_excel: "Send from Excel",
        code_source_manual: "Manual range",
        code_excel_select: "Select Excel file",
        code_excel_help: "Upload a spreadsheet to load error codes.",
        code_excel_uploading: "Uploading Excel…",
        code_excel_required: "Please upload an Excel file first.",
        code_range_required: "Please enter both start and end values.",
        code_range_start: "Start (hex)",
        code_range_end: "End (hex)",
        code_range_placeholder: "e.g. 0x1F00",
        code_manual_help: "Enter start and end values in hexadecimal.",
        start_signal_chaser: "Start Signal Chaser",
        stop_chaser: "Stop Chaser",
        chaser_ready: "Chaser ready.",
        code_chaser_ready: "Error code sweep ready.",
        send: "Send",
        stop: "Stop",
        no_messages_found: "No messages found.",
        
        // Monitor Section
        can_monitor: "CAN Monitor",
        recording_name: "Recording Name",
        auto_name: "Auto name",
        start_recording: "Start Recording",
        stop_recording: "Stop Recording",
        open_recordings: "Open Recordings",
        recording_waiting: "Recording waiting.",
        no_recordings_yet: "No recordings yet.",
        
        // Signal Info
        min: "Min",
        max: "Max",
        
        // Messages
        select_message_first: "Please select a message.",
        enter_bulk_value: "Enter a number for bulk value.",
        invalid_value_for: "Invalid value for",
        message_sent: "Message sent.",
        periodic_started: "Periodic transmission started",
        periodic_stopped: "Periodic transmission stopped.",
        recording_started: "Recording started:",
        recording_completed: "Recording completed:",
        recording_in_progress: "Recording in progress:",
        chaser_started: "Signal chaser started.",
        chaser_stopped: "Signal chaser stopped.",
        chaser_running: "Signal chaser running",
        code_chaser_started: "Error code sweep started.",
        code_chaser_stopped: "Error code sweep stopped.",
        code_chaser_running: "Error code sweep running",
        current_code: "Active code:",
        code_total: "Total codes:",
        active: "Active:",
        interval_must_be_positive: "Interval must be greater than zero.",
        enter_interface_info: "Please enter interface information.",
        enter_channel_info: "Please enter channel information.",
        select_dbc_file: "Please select a DBC file.",
        websocket_opened: "WebSocket connection opened.",
        websocket_closed: "WebSocket closed, retrying in 2 seconds.",
        websocket_error: "WebSocket error",
        websocket_parse_error: "Failed to parse WebSocket data",
        interface_list_failed: "Failed to load interface list, you can use manual input.",
        interface_status_failed: "Failed to get interface status",
        recordings_list_failed: "Failed to get recordings list",
        chaser_status_failed: "Failed to get signal chaser status",
        error: "Error:",
        loaded_dbc: "Loaded DBC:",
        events: "events",
        play: "Play",
        every: "every",
    }
};

// Get current language from localStorage or default to Turkish
function getCurrentLanguage() {
    return localStorage.getItem('language') || 'tr';
}

// Set current language
function setCurrentLanguage(lang) {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
}

// Get translation for a key
function t(key) {
    const lang = getCurrentLanguage();
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
}

// Initialize language on page load
setCurrentLanguage(getCurrentLanguage());

export { t, getCurrentLanguage, setCurrentLanguage, TRANSLATIONS };
