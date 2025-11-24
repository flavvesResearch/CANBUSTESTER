import { t, getCurrentLanguage, setCurrentLanguage } from './i18n.js';

const state = {
    dbc: null,
    messages: [],
    selectedMessage: null,
    currentTaskKey: null,
    monitorEntries: [],
    monitorLimit: 200,
    interfaces: [],
    manualMode: false,
    recordingActive: null,
    recordings: [],
    signalChaser: null,
    chaserMode: "signals",
    codeSource: "excel",
    codeUpload: null,
    codeDecimalUpload: null,
    faultTest: null,
    faultType: "bit-flip",
    faultMessage: null,
};

const interfaceForm = document.getElementById("interface-form");
const interfaceStatus = document.getElementById("interface-status");
const dbcForm = document.getElementById("dbc-form");
const dbcStatus = document.getElementById("dbc-status");
const interfaceSelect = document.getElementById("interface");
const channelSelect = document.getElementById("channel");
const bitrateInput = document.getElementById("bitrate");
const manualInterfaceFields = document.getElementById("manual-interface-fields");
const manualChannelFields = document.getElementById("manual-channel-fields");
const interfaceManualInput = document.getElementById("interface-manual");
const channelManualInput = document.getElementById("channel-manual");
const dbcFileInput = document.getElementById("dbc-file");
const dbcFileLabel = document.getElementById("dbc-file-label");
const messageSelector = document.getElementById("message-list");
const messageComment = document.getElementById("message-comment");
const messageForm = document.getElementById("message-form");
const messageFeedback = document.getElementById("message-feedback");
const stopButton = document.getElementById("stop-periodic");
const signalsContainer = document.getElementById("signals-container");
const monitorLog = document.getElementById("monitor-log");
const bulkValueInput = document.getElementById("bulk-value");
const bulkApplyButton = document.getElementById("apply-bulk");
const bulkOnesButton = document.getElementById("fill-ones");
const bulkZerosButton = document.getElementById("fill-zeros");
const recordNameInput = document.getElementById("record-name");
const recordStartButton = document.getElementById("record-start");
const recordStopButton = document.getElementById("record-stop");
const recordStatus = document.getElementById("record-status");
const recordingsList = document.getElementById("recordings-list");
const chaserIntervalInput = document.getElementById("signal-chaser-interval");
const chaserStartButton = document.getElementById("chaser-start");
const chaserStopButton = document.getElementById("chaser-stop");
const chaserStatus = document.getElementById("chaser-status");
const chaserModeRadios = Array.from(document.querySelectorAll('input[name="chaser-mode"]'));
const codeOptionsContainer = document.getElementById("chaser-code-options");
const codeSourceRadios = Array.from(document.querySelectorAll('input[name="code-source"]'));
const codeExcelInput = document.getElementById("code-excel-file");
const codeExcelLabel = document.getElementById("code-excel-label");
const codeExcelStatus = document.getElementById("code-excel-status");
const codeExcelPanel = document.getElementById("code-source-excel");
const codeExcelDecimalPanel = document.getElementById("code-source-excel-decimal");
const codeExcelDecimalInput = document.getElementById("code-excel-decimal-file");
const codeExcelDecimalLabel = document.getElementById("code-excel-decimal-label");
const codeExcelDecimalStatus = document.getElementById("code-excel-decimal-status");
const decimalSignalSelector = document.getElementById("decimal-target-signal");
const decimalSignalSelectorContainer = document.getElementById("decimal-signal-selector");
const codeManualPanel = document.getElementById("code-source-manual");
const codeRangeStartInput = document.getElementById("code-range-start");
const codeRangeEndInput = document.getElementById("code-range-end");

// Fault injection elements
const faultMessageList = document.getElementById("fault-message-list");
const faultTypeRadios = Array.from(document.querySelectorAll('input[name="fault-type"]'));
const faultBitFlipConfig = document.getElementById("fault-bit-flip-config");
const faultDlcConfig = document.getElementById("fault-dlc-config");
const faultRangeConfig = document.getElementById("fault-range-config");
const bitFlipCountInput = document.getElementById("bit-flip-count");
const dlcValueInput = document.getElementById("dlc-value");
const faultTargetSignal = document.getElementById("fault-target-signal");
const rangeMultiplierInput = document.getElementById("range-multiplier");
const faultIntervalInput = document.getElementById("fault-interval");
const faultCountInput = document.getElementById("fault-count");
const faultStartButton = document.getElementById("fault-start");
const faultStopButton = document.getElementById("fault-stop");
const faultStatus = document.getElementById("fault-status");

// Language buttons
const langTrButton = document.getElementById("lang-tr");
const langEnButton = document.getElementById("lang-en");

// Update all translatable elements
function updateTranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
    
    // Update document title
    document.title = t('app_title');
    
    // Update theme toggle based on current theme
    updateThemeToggleText();
    
    // Re-render current state with new language
    if (state.dbc) {
        renderDbcStatus(state.dbc);
    }
    
    renderInterfaceStatus(state.interfaces.length ? { configured: true } : { configured: false });
    
    renderCodeUploadState();
    renderCodeDecimalUploadState();
    setChaserState(state.signalChaser);
    
    setRecordingState(state.recordingActive);
    renderRecordingsList();
}

function updateThemeToggleText() {
    const themeToggle = document.getElementById('theme-toggle');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeSpan = themeToggle.querySelector('span');
    if (themeSpan) {
        themeSpan.textContent = isDark ? t('dark_mode').replace('🌙 ', '') : t('light_mode').replace('☀️ ', '');
    }
}

function switchLanguage(lang) {
    setCurrentLanguage(lang);
    
    // Update button states
    if (langTrButton && langEnButton) {
        langTrButton.classList.toggle('active', lang === 'tr');
        langEnButton.classList.toggle('active', lang === 'en');
    }
    
    updateTranslations();
}

// Language button event listeners
if (langTrButton) {
    langTrButton.addEventListener('click', () => switchLanguage('tr'));
}

if (langEnButton) {
    langEnButton.addEventListener('click', () => switchLanguage('en'));
}

const api = {
    async get(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
    async post(path, payload) {
        const isForm = typeof FormData !== "undefined" && payload instanceof FormData;
        const response = await fetch(path, {
            method: "POST",
            body: isForm ? payload : JSON.stringify(payload),
            headers: isForm ? undefined : { "Content-Type": "application/json" },
        });
        const raw = await response.text();
        if (!response.ok) {
            throw new Error(raw || response.statusText);
        }
        if (!raw.length) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    },
};

function renderInterfaceStatus(status) {
    if (!status.configured) {
        interfaceStatus.textContent = t('not_configured_yet');
        return;
    }
    const extra = Object.entries(status.kwargs || {})
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
    interfaceStatus.innerHTML = `
        <strong>${status.interface}</strong> @ <strong>${status.channel}</strong>
        ${status.bitrate ? ` | ${status.bitrate} bps` : ""}
        ${extra ? ` | ${extra}` : ""}
    `;
}

function renderCodeUploadState() {
    if (!codeExcelLabel || !codeExcelStatus) {
        return;
    }
    const upload = state.codeUpload;
    if (upload && Array.isArray(upload.codes) && upload.codes.length) {
        codeExcelLabel.textContent = `${upload.fileName || t('code_excel_select')} (${upload.count})`;
        const lang = getCurrentLanguage();
        const messages = [];
        messages.push(
            lang === 'tr'
                ? `${upload.count} hata kodu hazır.`
                : `${upload.count} error codes ready.`
        );
        if (upload.invalidCount) {
            messages.push(
                lang === 'tr'
                    ? `${upload.invalidCount} satır atlandı.`
                    : `${upload.invalidCount} rows skipped.`
            );
        }
        if (upload.truncated && upload.maxAllowed) {
            messages.push(
                lang === 'tr'
                    ? `İlk ${upload.maxAllowed} kod kullanıldı.`
                    : `First ${upload.maxAllowed} codes will be used.`
            );
        }
        const descriptionCount = upload.descriptions ? Object.keys(upload.descriptions).length : 0;
        if (descriptionCount) {
            messages.push(
                lang === 'tr'
                    ? `${descriptionCount} açıklama eşleştirildi.`
                    : `${descriptionCount} descriptions linked.`
            );
        }
        codeExcelStatus.textContent = messages.join(" ");
    } else {
        codeExcelLabel.textContent = t('code_excel_select');
        codeExcelStatus.textContent = t('code_excel_help');
    }
}

function renderCodeDecimalUploadState() {
    if (!codeExcelDecimalLabel || !codeExcelDecimalStatus) {
        return;
    }
    const upload = state.codeDecimalUpload;
    if (upload && Array.isArray(upload.codes) && upload.codes.length) {
        codeExcelDecimalLabel.textContent = `${upload.fileName || t('code_excel_select')} (${upload.count})`;
        const lang = getCurrentLanguage();
        const messages = [];
        messages.push(
            lang === 'tr'
                ? `${upload.count} hata kodu hazır (decimal).`
                : `${upload.count} error codes ready (decimal).`
        );
        if (upload.invalidCount) {
            messages.push(
                lang === 'tr'
                    ? `${upload.invalidCount} satır atlandı.`
                    : `${upload.invalidCount} rows skipped.`
            );
        }
        if (upload.truncated && upload.maxAllowed) {
            messages.push(
                lang === 'tr'
                    ? `İlk ${upload.maxAllowed} kod kullanıldı.`
                    : `First ${upload.maxAllowed} codes will be used.`
            );
        }
        const descriptionCount = upload.descriptions ? Object.keys(upload.descriptions).length : 0;
        if (descriptionCount) {
            messages.push(
                lang === 'tr'
                    ? `${descriptionCount} açıklama eşleştirildi.`
                    : `${descriptionCount} descriptions linked.`
            );
        }
        if (upload.targetSignal) {
            messages.push(
                lang === 'tr'
                    ? `Hedef sinyal: ${upload.targetSignal}`
                    : `Target signal: ${upload.targetSignal}`
            );
        }
        codeExcelDecimalStatus.textContent = messages.join(" ");
    } else {
        codeExcelDecimalLabel.textContent = t('code_excel_select');
        codeExcelDecimalStatus.textContent = t('code_excel_help');
    }
}

function setCodeSourceValue(source, options = {}) {
    let resolved = "excel";
    if (source === "manual") {
        resolved = "manual";
    } else if (source === "excel-decimal") {
        resolved = "excel-decimal";
    }
    state.codeSource = resolved;
    if (!options.skipRadios && codeSourceRadios.length) {
        codeSourceRadios.forEach((radio) => {
            radio.checked = radio.value === resolved;
        });
    }
    if (codeExcelPanel) {
        codeExcelPanel.classList.toggle("hidden", resolved !== "excel");
    }
    if (codeExcelDecimalPanel) {
        codeExcelDecimalPanel.classList.toggle("hidden", resolved !== "excel-decimal");
    }
    if (codeManualPanel) {
        codeManualPanel.classList.toggle("hidden", resolved !== "manual");
    }
    if (resolved === "excel") {
        renderCodeUploadState();
    } else if (resolved === "excel-decimal") {
        renderCodeDecimalUploadState();
        updateDecimalSignalSelector();
    }
}

function setChaserModeValue(mode, options = {}) {
    const resolved = mode === "codes" ? "codes" : "signals";
    state.chaserMode = resolved;
    if (!options.skipRadios && chaserModeRadios.length) {
        chaserModeRadios.forEach((radio) => {
            radio.checked = radio.value === resolved;
        });
    }
    if (codeOptionsContainer) {
        codeOptionsContainer.classList.toggle("hidden", resolved !== "codes");
    }
    if (resolved === "codes") {
        setCodeSourceValue(state.codeSource || "excel", options);
    }
}

function updateDecimalSignalSelector() {
    if (!decimalSignalSelector || !decimalSignalSelectorContainer) {
        return;
    }
    
    if (!state.selectedMessage) {
        decimalSignalSelectorContainer.classList.add("hidden");
        decimalSignalSelector.disabled = true;
        decimalSignalSelector.innerHTML = `<option>${t('select_message_first')}</option>`;
        return;
    }
    
    decimalSignalSelectorContainer.classList.remove("hidden");
    decimalSignalSelector.disabled = false;
    decimalSignalSelector.innerHTML = "";
    
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t('select_signal');
    decimalSignalSelector.append(placeholder);
    
    for (const signal of state.selectedMessage.signals) {
        const option = document.createElement("option");
        option.value = signal.name;
        option.textContent = signal.name;
        decimalSignalSelector.append(option);
    }
    
    // Restore previously selected signal if exists
    if (state.codeDecimalUpload && state.codeDecimalUpload.targetSignal) {
        const exists = state.selectedMessage.signals.some(s => s.name === state.codeDecimalUpload.targetSignal);
        if (exists) {
            decimalSignalSelector.value = state.codeDecimalUpload.targetSignal;
        }
    }
}

async function uploadCodeExcelDecimal(file) {
    if (!codeExcelDecimalStatus || !codeExcelDecimalLabel) {
        return;
    }
    if (!file) {
        state.codeDecimalUpload = null;
        renderCodeDecimalUploadState();
        return;
    }
    const formData = new FormData();
    formData.append("file", file);
    codeExcelDecimalStatus.textContent = t('code_excel_uploading');
    try {
        const response = await api.post("/api/messages/chaser/codes/upload-decimal", formData);
        state.codeDecimalUpload = {
            fileName: response.fileName || file.name,
            codes: Array.isArray(response.codes) ? response.codes : [],
            count: response.count ?? (Array.isArray(response.codes) ? response.codes.length : 0),
            originalCount: response.originalCount ?? response.count ?? (Array.isArray(response.codes) ? response.codes.length : 0),
            invalidCount: response.invalidCount || 0,
            truncated: Boolean(response.truncated),
            maxAllowed: response.maxAllowed || null,
            descriptions: response.descriptions && typeof response.descriptions === "object" ? response.descriptions : {},
            targetSignal: decimalSignalSelector?.value || null,
        };
        renderCodeDecimalUploadState();
    } catch (error) {
        state.codeDecimalUpload = null;
        renderCodeDecimalUploadState();
        codeExcelDecimalStatus.textContent = `${t('error')} ${error.message || error}`;
        console.error("Excel decimal yükleme hatası", error);
    }
}

async function uploadCodeExcel(file) {
    if (!codeExcelStatus || !codeExcelLabel) {
        return;
    }
    if (!file) {
        state.codeUpload = null;
        renderCodeUploadState();
        return;
    }
    const formData = new FormData();
    formData.append("file", file);
    codeExcelStatus.textContent = t('code_excel_uploading');
    try {
        const response = await api.post("/api/messages/chaser/codes/upload", formData);
        state.codeUpload = {
            fileName: response.fileName || file.name,
            codes: Array.isArray(response.codes) ? response.codes : [],
            count: response.count ?? (Array.isArray(response.codes) ? response.codes.length : 0),
            originalCount: response.originalCount ?? response.count ?? (Array.isArray(response.codes) ? response.codes.length : 0),
            invalidCount: response.invalidCount || 0,
            truncated: Boolean(response.truncated),
            maxAllowed: response.maxAllowed || null,
            descriptions: response.descriptions && typeof response.descriptions === "object" ? response.descriptions : {},
        };
        renderCodeUploadState();
    } catch (error) {
        state.codeUpload = null;
        renderCodeUploadState();
        codeExcelStatus.textContent = `${t('error')} ${error.message || error}`;
        console.error("Excel yükleme hatası", error);
    }
}

setChaserModeValue(state.chaserMode || "signals", { skipRadios: true });
setCodeSourceValue(state.codeSource || "excel", { skipRadios: true });
renderCodeUploadState();
renderCodeDecimalUploadState();

function setFaultTypeValue(faultType, options = {}) {
    state.faultType = faultType;
    if (!options.skipRadios && faultTypeRadios.length) {
        faultTypeRadios.forEach((radio) => {
            radio.checked = radio.value === faultType;
        });
    }
    
    // Hide all config panels
    if (faultBitFlipConfig) faultBitFlipConfig.classList.add("hidden");
    if (faultDlcConfig) faultDlcConfig.classList.add("hidden");
    if (faultRangeConfig) faultRangeConfig.classList.add("hidden");
    
    // Show relevant config panel
    if (faultType === "bit-flip" && faultBitFlipConfig) {
        faultBitFlipConfig.classList.remove("hidden");
    } else if (faultType === "dlc-mismatch" && faultDlcConfig) {
        faultDlcConfig.classList.remove("hidden");
    } else if (faultType === "out-of-range" && faultRangeConfig) {
        faultRangeConfig.classList.remove("hidden");
        updateFaultTargetSignalSelector();
    }
}

function updateFaultTargetSignalSelector() {
    if (!faultTargetSignal) return;
    
    if (!state.faultMessage) {
        faultTargetSignal.disabled = true;
        faultTargetSignal.innerHTML = `<option>${t('select_message_first')}</option>`;
        return;
    }
    
    faultTargetSignal.disabled = false;
    faultTargetSignal.innerHTML = "";
    
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t('select_signal');
    faultTargetSignal.append(placeholder);
    
    for (const signal of state.faultMessage.signals) {
        const option = document.createElement("option");
        option.value = signal.name;
        option.textContent = signal.name;
        faultTargetSignal.append(option);
    }
}

function populateFaultMessageSelect(messages) {
    if (!faultMessageList) return;
    
    faultMessageList.innerHTML = "";
    if (!messages.length) {
        const option = document.createElement("option");
        option.textContent = t('no_messages_found');
        faultMessageList.append(option);
        faultMessageList.disabled = true;
        return;
    }
    faultMessageList.disabled = false;
    const placeholder = document.createElement("option");
    placeholder.textContent = t('select_message');
    placeholder.value = "";
    faultMessageList.append(placeholder);

    for (const message of messages) {
        const option = document.createElement("option");
        option.value = message.name;
        option.textContent = `${message.name} (0x${message.frame_id.toString(16).toUpperCase()})`;
        faultMessageList.append(option);
    }
}

function setFaultTestState(faultInfo) {
    state.faultTest = faultInfo;
    if (!faultStartButton || !faultStopButton || !faultStatus) return;
    
    const hasMessage = Boolean(state.faultMessage);
    const isActive = Boolean(faultInfo);
    
    faultStartButton.disabled = !hasMessage || isActive;
    faultStopButton.disabled = !isActive;
    
    if (faultIntervalInput) faultIntervalInput.disabled = isActive;
    if (faultCountInput) faultCountInput.disabled = isActive;
    if (faultMessageList) faultMessageList.disabled = isActive;
    if (faultTypeRadios.length) {
        faultTypeRadios.forEach((radio) => {
            radio.disabled = isActive;
        });
    }
    if (bitFlipCountInput) bitFlipCountInput.disabled = isActive;
    if (dlcValueInput) dlcValueInput.disabled = isActive;
    if (faultTargetSignal) faultTargetSignal.disabled = isActive || !state.faultMessage;
    if (rangeMultiplierInput) rangeMultiplierInput.disabled = isActive;
    
    if (!hasMessage) {
        faultStatus.textContent = t('select_message_first');
        return;
    }
    
    if (isActive) {
        const sent = faultInfo.sentCount || 0;
        const total = faultInfo.totalCount || 0;
        const interval = faultInfo.intervalSeconds || 0;
        const intervalText = interval > 0 && !Number.isNaN(interval)
            ? (Number.isInteger(interval) ? interval.toString() : interval.toFixed(2))
            : "?";
        const unit = getCurrentLanguage() === 'tr' ? 'sn' : 'sec';
        faultStatus.textContent = `${t('fault_test_running')} (${t('every')} ${intervalText} ${unit}). ${t('sent_count')}: ${sent}${t('of')}${total}`;
    } else {
        faultStatus.textContent = t('fault_test_ready');
    }
}

setFaultTypeValue(state.faultType || "bit-flip", { skipRadios: true });

function setManualMode(enabled) {
    state.manualMode = enabled;
    if (enabled) {
        manualInterfaceFields.classList.remove("hidden");
        manualChannelFields.classList.remove("hidden");
        channelSelect.disabled = true;
        channelSelect.innerHTML = `<option value="">Manuel giriş kullanılıyor</option>`;
        interfaceManualInput.focus();
    } else {
        manualInterfaceFields.classList.add("hidden");
        manualChannelFields.classList.add("hidden");
        channelSelect.disabled = false;
        interfaceManualInput.value = "";
        channelManualInput.value = "";
    }
}

function renderInterfaceOptions() {
    interfaceSelect.innerHTML = "";
    setManualMode(false);
    const uniqueInterfaces = [...new Set(state.interfaces.map((item) => item.interface))];

    if (!uniqueInterfaces.length) {
        const manualOption = document.createElement("option");
        manualOption.value = "__manual__";
        manualOption.textContent = t('other_manual');
        interfaceSelect.append(manualOption);
        interfaceSelect.disabled = false;
        interfaceSelect.value = "__manual__";
        setManualMode(true);
        return;
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t('select_interface');
    interfaceSelect.append(placeholder);

    for (const interfaceName of uniqueInterfaces) {
        const option = document.createElement("option");
        option.value = interfaceName;
        option.textContent = interfaceName;
        interfaceSelect.append(option);
    }

    const manualOption = document.createElement("option");
    manualOption.value = "__manual__";
    manualOption.textContent = t('other_manual');
    interfaceSelect.append(manualOption);

    interfaceSelect.disabled = false;
    interfaceSelect.value = "";
    populateChannelOptions("");

    if (uniqueInterfaces.length === 1) {
        interfaceSelect.value = uniqueInterfaces[0];
        populateChannelOptions(uniqueInterfaces[0]);
    }
}

function populateChannelOptions(interfaceName) {
    channelSelect.innerHTML = "";
    if (!interfaceName) {
        channelSelect.disabled = state.manualMode;
        channelSelect.innerHTML = `<option value="">${t('select_interface_first')}</option>`;
        return;
    }
    if (interfaceName === "__manual__") {
        setManualMode(true);
        return;
    }

    setManualMode(false);

    const channels = state.interfaces
        .filter((item) => item.interface === interfaceName)
        .map((item) => String(item.channel));

    const uniqueChannels = [...new Set(channels)];

    if (!uniqueChannels.length) {
        channelSelect.disabled = true;
        channelSelect.innerHTML = `<option value="">${t('no_channels_found')}</option>`;
        return;
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t('select_channel');
    channelSelect.append(placeholder);

    for (const channel of uniqueChannels) {
        const option = document.createElement("option");
        option.value = channel;
        option.textContent = channel;
        channelSelect.append(option);
    }

    channelSelect.disabled = false;
    if (uniqueChannels.length === 1) {
        channelSelect.value = uniqueChannels[0];
    }
}

function findInterfaceConfig(interfaceName, channelName) {
    if (!interfaceName || interfaceName === "__manual__") {
        return undefined;
    }
    return state.interfaces.find(
        (item) => item.interface === interfaceName && String(item.channel) === String(channelName),
    );
}

function renderDbcStatus(metadata) {
    if (!metadata) {
        dbcStatus.textContent = t('dbc_not_loaded');
        return;
    }
    const label = metadata.name || metadata.path || "DBC";
    dbcStatus.innerHTML = `
        <strong>${label}</strong><br>
        ${metadata.messages.length} ${t('messages_found')}
    `;
}

function setRecordingState(activeRecord) {
    state.recordingActive = activeRecord;
    if (!recordStartButton || !recordStopButton || !recordStatus) {
        return;
    }

    if (activeRecord) {
        recordStartButton.disabled = true;
        recordStopButton.disabled = false;
        recordStatus.textContent = `${t('recording_in_progress')} ${activeRecord.name}`;
    } else {
        recordStartButton.disabled = false;
        recordStopButton.disabled = true;
        recordStatus.textContent = t('recording_waiting');
    }
}

function setChaserState(chaserInfo) {
    state.signalChaser = chaserInfo;
    if (!chaserStartButton || !chaserStopButton || !chaserStatus || !chaserIntervalInput) {
        return;
    }

    const hasMessage = Boolean(state.selectedMessage);
    const isActiveForMessage = Boolean(
        chaserInfo && state.selectedMessage && chaserInfo.messageName === state.selectedMessage.name,
    );
    const activeMode = chaserInfo?.mode || state.chaserMode || "signals";

    if (isActiveForMessage) {
        setChaserModeValue(activeMode);
        if (activeMode === "codes") {
            setCodeSourceValue(chaserInfo.codeSource || state.codeSource || "excel");
        }
    } else {
        setChaserModeValue(state.chaserMode || "signals");
        setCodeSourceValue(state.codeSource || "excel");
    }

    chaserStartButton.disabled = !hasMessage || isActiveForMessage;
    chaserStopButton.disabled = !isActiveForMessage;
    if (chaserIntervalInput) {
        chaserIntervalInput.disabled = !hasMessage || isActiveForMessage;
    }

    if (chaserModeRadios.length) {
        chaserModeRadios.forEach((radio) => {
            radio.disabled = isActiveForMessage;
        });
    }
    const disableCodeInputs = isActiveForMessage && (chaserInfo?.mode === "codes");
    if (codeSourceRadios.length) {
        codeSourceRadios.forEach((radio) => {
            radio.disabled = disableCodeInputs;
        });
    }
    if (codeExcelInput) {
        codeExcelInput.disabled = disableCodeInputs;
    }
    if (codeRangeStartInput) {
        codeRangeStartInput.disabled = disableCodeInputs;
    }
    if (codeRangeEndInput) {
        codeRangeEndInput.disabled = disableCodeInputs;
    }

    if (!hasMessage) {
        chaserStatus.textContent = t('select_message_first');
        return;
    }

    if (isActiveForMessage) {
        const interval = Number(chaserInfo.intervalSeconds || 0);
        const intervalText = interval > 0 && !Number.isNaN(interval)
            ? (Number.isInteger(interval) ? interval.toString() : interval.toFixed(2))
            : "?";
        const unit = getCurrentLanguage() === 'tr' ? 'sn' : 'sec';
        if (chaserInfo.mode === "codes") {
            const details = [];
            if (chaserInfo.currentCode) {
                details.push(`${t('current_code')} ${chaserInfo.currentCode}`);
            }
            if (typeof chaserInfo.codeCount === "number") {
                details.push(`${t('code_total')} ${chaserInfo.codeCount}`);
            }
            if (chaserInfo.currentDescription) {
                details.push(`${t('code_description_label')}: ${chaserInfo.currentDescription}`);
            }
            const suffix = details.length ? ` ${details.join(' • ')}` : "";
            chaserStatus.textContent = `${t('code_chaser_running')} (${t('every')} ${intervalText} ${unit}).${suffix}`;
        } else {
            const signal = chaserInfo.currentSignal ? ` • ${t('active')} ${chaserInfo.currentSignal}` : "";
            chaserStatus.textContent = `${t('chaser_running')} (${t('every')} ${intervalText} ${unit}).${signal}`;
        }
    } else {
        const readyKey = state.chaserMode === "codes" ? 'code_chaser_ready' : 'chaser_ready';
        chaserStatus.textContent = t(readyKey);
    }
}

function renderRecordingsList() {
    if (!recordingsList) return;
    recordingsList.innerHTML = "";
    if (!state.recordings.length) {
        recordingsList.textContent = t('no_recordings_yet');
        return;
    }

    for (const log of state.recordings) {
        const item = document.createElement("div");
        item.className = "recording-item";

        const title = document.createElement("div");
        title.className = "recording-item__title";
        const date = log.started_at
            ? new Date(log.started_at * 1000).toLocaleString(getCurrentLanguage() === 'tr' ? 'tr-TR' : 'en-US')
            : "";
        title.textContent = `${log.name || log.id} ${date ? `• ${date}` : ""}`;

        const meta = document.createElement("div");
        meta.className = "recording-item__meta";
        const duration = log.duration
            ? `${log.duration.toFixed(2)} ${getCurrentLanguage() === 'tr' ? 'sn' : 'sec'}`
            : "";
        meta.textContent = `${log.event_count || 0} ${t('events')}${duration ? ` • ${duration}` : ""}`;

        const action = document.createElement("a");
        action.className = "link-button";
        action.href = `/playback?log=${log.id}`;
        action.textContent = t('play');

        item.append(title, meta, action);
        recordingsList.append(item);
    }
}

async function refreshRecordings() {
    if (!recordingsList) return;
    try {
        const response = await api.get("/api/logs");
        state.recordings = response.logs || [];
        setRecordingState(response.active || null);
        renderRecordingsList();
    } catch (error) {
        console.warn("Kayıt listesi alınamadı", error);
    }
}

async function refreshChaserStatus() {
    if (!state.selectedMessage) {
        setChaserState(null);
        return;
    }

    try {
        const response = await api.get(
            `/api/messages/chaser/status?messageName=${encodeURIComponent(state.selectedMessage.name)}`,
        );
        const tasks = response.tasks || [];
        setChaserState(tasks[0] || null);
    } catch (error) {
        console.warn("Sinyal tarama durumu alınamadı", error);
        setChaserState(null);
    }
}

function populateMessageSelect(messages) {
    messageSelector.innerHTML = "";
    if (!messages.length) {
        const option = document.createElement("option");
        option.textContent = t('no_messages_found');
        messageSelector.append(option);
        messageSelector.disabled = true;
        return;
    }
    messageSelector.disabled = false;
    const placeholder = document.createElement("option");
    placeholder.textContent = t('select_message');
    placeholder.value = "";
    messageSelector.append(placeholder);

    for (const message of messages) {
        const option = document.createElement("option");
        option.value = message.name;
        option.textContent = `${message.name} (0x${message.frame_id.toString(16).toUpperCase()})`;
        messageSelector.append(option);
    }
    
    // Also populate fault message selector
    populateFaultMessageSelect(messages);
}

function renderSignals(message) {
    signalsContainer.innerHTML = "";
    messageComment.textContent = message.comment || "";
    for (const signal of message.signals) {
        const card = document.createElement("div");
        card.className = "signal-card";

        const label = document.createElement("label");
        label.className = "signal-card__name";
        const elementId = `signal-${signal.name}`;
        label.htmlFor = elementId;
        label.textContent = signal.name;

        let inputElement;
        const choiceEntries = Array.isArray(signal.choices) ? signal.choices : [];
        if (choiceEntries.length) {
            const select = document.createElement("select");
            select.id = elementId;
            select.dataset.signal = signal.name;

            for (const choice of choiceEntries) {
                const option = document.createElement("option");
                option.value = choice.value;
                option.textContent = `${choice.name} (${choice.value})`;
                select.append(option);
            }
            if (
                signal.initial !== null &&
                signal.initial !== undefined &&
                choiceEntries.some((choice) => String(choice.value) === String(signal.initial))
            ) {
                select.value = signal.initial;
            }
            inputElement = select;
        } else {
            const input = document.createElement("input");
            input.type = "number";
            input.step = "any";
            input.id = elementId;
            input.dataset.signal = signal.name;
            if (signal.minimum !== null && signal.minimum !== undefined) {
                input.min = signal.minimum;
            }
            if (signal.maximum !== null && signal.maximum !== undefined) {
                input.max = signal.maximum;
            }
            if (signal.initial !== null && signal.initial !== undefined) {
                input.value = signal.initial;
            }
            inputElement = input;
        }
        const inputWrapper = document.createElement("div");
        inputWrapper.append(inputElement);

        const info = document.createElement("div");
        info.className = "signal-card__meta";
        const min = signal.minimum ?? "–";
        const max = signal.maximum ?? "–";
        const unit = signal.unit ? ` ${signal.unit}` : "";
        info.textContent = `${t('min')}: ${min} | ${t('max')}: ${max}${unit}`;

        card.append(label, inputWrapper, info);
        signalsContainer.append(card);
    }
}

function gatherSignalValues(message) {
    const values = {};
    for (const signal of message.signals) {
        const element = signalsContainer.querySelector(`[data-signal="${signal.name}"]`);
        if (!element) continue;
        if (element.tagName === "SELECT") {
            const rawChoice = element.value;
            const parsedChoice = Number(rawChoice);
            values[signal.name] = Number.isNaN(parsedChoice) ? rawChoice : parsedChoice;
        } else {
            const raw = element.value;
            if (raw === "") continue;
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) {
                throw new Error(`${t('invalid_value_for')} ${signal.name}: ${raw}`);
            }
            values[signal.name] = parsed;
        }
    }
    return values;
}

function applyBulkValue(value) {
    if (!state.selectedMessage) return;
    for (const signal of state.selectedMessage.signals) {
        const element = signalsContainer.querySelector(`[data-signal="${signal.name}"]`);
        if (!element) continue;

        if (element.tagName === "SELECT") {
            const options = Array.from(element.options);
            const match = options.find((option) => option.value === String(value))
                || options.find((option) => option.value === value)
                || options.find((option) => option.value === String(Number(value)));
            if (match) {
                element.value = match.value;
            }
        } else {
            element.value = value;
        }
    }
}

function logEvent(entry) {
    const timestampSeconds = entry.timestamp ?? Date.now() / 1000;
    entry.timestamp = timestampSeconds;
    state.monitorEntries.unshift(entry);
    if (state.monitorEntries.length > state.monitorLimit) {
        state.monitorEntries.pop();
    }
    renderMonitor();
}

function formatFaultType(faultType) {
    const types = {
        'bit-flip': t('fault_bit_flip'),
        'dlc-mismatch': t('fault_dlc_mismatch'),
        'out-of-range': t('fault_out_of_range'),
        'random-data': t('fault_random_data'),
        'zero-data': t('fault_zero_data'),
        'max-data': t('fault_max_data'),
    };
    return types[faultType] || faultType;
}

function renderMonitor() {
    monitorLog.innerHTML = "";
    for (const entry of state.monitorEntries) {
        const container = document.createElement("div");
        container.className = `log-entry ${entry.type}`;
        const timeValue = entry.timestamp ?? Date.now() / 1000;
        const timestamp = new Date(timeValue * 1000).toLocaleTimeString("tr-TR", { hour12: false });
        const header = document.createElement("strong");
        header.textContent = `${entry.type.toUpperCase()} • ${timestamp}`;
        container.append(header);

        const idLine = document.createElement("span");
        idLine.textContent = `ID: 0x${entry.id.toString(16).toUpperCase()} LEN: ${entry.dlc}`;
        container.append(idLine);

        const dataLine = document.createElement("span");
        const hexData = entry.data.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
        dataLine.textContent = `DATA: ${hexData}`;
        container.append(dataLine);

        if (entry.code !== null && entry.code !== undefined) {
            const codeValue = typeof entry.code === "number"
                ? `0x${entry.code.toString(16).toUpperCase()}`
                : String(entry.code);
            const codeLine = document.createElement("span");
            codeLine.textContent = `${t('code_label')}: ${codeValue}`;
            container.append(codeLine);
        }

        if (entry.description) {
            const descriptionLine = document.createElement("span");
            descriptionLine.textContent = `${t('code_description_label')}: ${entry.description}`;
            container.append(descriptionLine);
        }
        
        if (entry.faultType) {
            const faultLine = document.createElement("span");
            faultLine.style.color = "#ef4444";
            faultLine.style.fontWeight = "600";
            faultLine.textContent = `⚠️ FAULT: ${formatFaultType(entry.faultType)}`;
            container.append(faultLine);
        }
        
        if (entry.faultInfo) {
            const faultInfoLine = document.createElement("span");
            faultInfoLine.style.color = "#f97316";
            faultInfoLine.textContent = `└─ ${entry.faultInfo}`;
            container.append(faultInfoLine);
        }

        if (entry.decoded) {
            const decodedLine = document.createElement("span");
            const details = Object.entries(entry.decoded.signals)
                .map(([key, value]) => `${key}: ${value}`)
                .join(" | ");
            decodedLine.textContent = `DECODED (${entry.decoded.name}): ${details}`;
            container.append(decodedLine);
        }

        monitorLog.append(container);
    }
}

async function loadInterfaces() {
    try {
        const data = await api.get("/api/interface/available");
        const configs = Array.isArray(data.interfaces) ? data.interfaces : [];
        state.interfaces = configs.map((config) => ({
            interface: config.interface,
            channel: String(config.channel),
            kwargs: config.kwargs || {},
        }));
        renderInterfaceOptions();
    } catch (error) {
        console.warn(t('interface_list_failed'), error);
        interfaceSelect.innerHTML = "";
        const manualOption = document.createElement("option");
        manualOption.value = "__manual__";
        manualOption.textContent = t('other_manual');
        interfaceSelect.append(manualOption);
        interfaceSelect.disabled = false;
        interfaceSelect.value = "__manual__";
        setManualMode(true);
        interfaceStatus.textContent = t('interface_list_failed');
    }
}

interfaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const manualMode = state.manualMode || interfaceSelect.value === "__manual__";
    const selectedInterface = manualMode ? interfaceManualInput.value.trim() : interfaceSelect.value;
    const selectedChannel = manualMode ? channelManualInput.value.trim() : channelSelect.value;

    if (!selectedInterface) {
        interfaceStatus.textContent = manualMode ? t('enter_interface_info') : t('select_interface');
        return;
    }
    if (!selectedChannel) {
        interfaceStatus.textContent = manualMode ? t('enter_channel_info') : t('select_channel');
        return;
    }

    const bitrateValue = Number(bitrateInput.value);
    const payload = {
        interface: selectedInterface,
        channel: selectedChannel,
        bitrate: Number.isNaN(bitrateValue) || bitrateValue <= 0 ? null : bitrateValue,
        kwargs: {},
    };

    if (!manualMode) {
        const config = findInterfaceConfig(selectedInterface, selectedChannel);
        if (config && config.kwargs) {
            payload.kwargs = config.kwargs;
        }
    }

    try {
        const status = await api.post("/api/interface/configure", payload);
        renderInterfaceStatus({ configured: true, ...status });
    } catch (error) {
        interfaceStatus.textContent = `${t('error')} ${error.message || error}`;
    }
});

dbcForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = dbcFileInput.files[0];
    if (!file) {
        dbcStatus.textContent = t('select_dbc_file');
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const metadata = await api.post("/api/dbc/load", formData);
        state.dbc = metadata;
        state.messages = metadata.messages;
        renderDbcStatus(metadata);
        populateMessageSelect(metadata.messages);
        state.selectedMessage = null;
        if (messageSelector) {
            messageSelector.value = "";
        }
        dbcFileLabel.textContent = metadata.name || file.name;
        messageFeedback.textContent = "";
        await refreshChaserStatus();
    } catch (error) {
        dbcStatus.textContent = `${t('error')} ${error.message || error}`;
    }
});

interfaceSelect.addEventListener("change", (event) => {
    const value = event.target.value;
    populateChannelOptions(value);
    if (value !== "__manual__") {
        channelSelect.value = "";
    }
});

dbcFileInput.addEventListener("change", () => {
    const file = dbcFileInput.files[0];
    dbcFileLabel.textContent = file ? file.name : "Dosya seçin";
});

messageSelector.addEventListener("change", (event) => {
    const selected = state.messages.find((msg) => msg.name === event.target.value);
    state.selectedMessage = selected || null;
    signalsContainer.innerHTML = "";
    messageComment.textContent = "";
    if (selected) {
        renderSignals(selected);
        messageFeedback.textContent = "";
    }
    updateDecimalSignalSelector();
    refreshChaserStatus();
});

if (chaserModeRadios.length) {
    chaserModeRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (!radio.checked) {
                return;
            }
            const activeChaser = state.signalChaser && state.selectedMessage
                && state.signalChaser.messageName === state.selectedMessage.name;
            if (activeChaser) {
                setChaserModeValue(state.signalChaser.mode || "signals");
                return;
            }
            setChaserModeValue(radio.value);
            if (!state.selectedMessage) {
                chaserStatus.textContent = t('select_message_first');
            } else {
                const readyKey = radio.value === "codes" ? 'code_chaser_ready' : 'chaser_ready';
                chaserStatus.textContent = t(readyKey);
            }
        });
    });
}

if (codeSourceRadios.length) {
    codeSourceRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (!radio.checked) {
                return;
            }
            const activeChaser = state.signalChaser && state.selectedMessage
                && state.signalChaser.messageName === state.selectedMessage.name
                && state.signalChaser.mode === "codes";
            if (activeChaser) {
                setCodeSourceValue(state.signalChaser.codeSource || "excel");
                return;
            }
            setCodeSourceValue(radio.value);
        });
    });
}

if (codeExcelInput) {
    codeExcelInput.addEventListener("change", async () => {
        const file = codeExcelInput.files?.[0];
        await uploadCodeExcel(file);
    });
}

if (codeExcelDecimalInput) {
    codeExcelDecimalInput.addEventListener("change", async () => {
        const file = codeExcelDecimalInput.files?.[0];
        await uploadCodeExcelDecimal(file);
    });
}

if (decimalSignalSelector) {
    decimalSignalSelector.addEventListener("change", () => {
        if (state.codeDecimalUpload) {
            state.codeDecimalUpload.targetSignal = decimalSignalSelector.value;
            renderCodeDecimalUploadState();
        }
    });
}

if (faultMessageList) {
    faultMessageList.addEventListener("change", (event) => {
        const selected = state.messages.find((msg) => msg.name === event.target.value);
        state.faultMessage = selected || null;
        if (selected && state.faultType === "out-of-range") {
            updateFaultTargetSignalSelector();
        }
        setFaultTestState(state.faultTest);
    });
}

if (faultTypeRadios.length) {
    faultTypeRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (!radio.checked) return;
            const isActive = Boolean(state.faultTest);
            if (isActive) {
                setFaultTypeValue(state.faultTest.faultType || "bit-flip");
                return;
            }
            setFaultTypeValue(radio.value);
        });
    });
}

messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.selectedMessage) {
        messageFeedback.textContent = t('select_message_first');
        return;
    }

    const periodValue = Number(document.getElementById("period").value);
    const periodMs = !Number.isNaN(periodValue) && periodValue > 0 ? Math.round(periodValue) : null;

    let signals;
    try {
        signals = gatherSignalValues(state.selectedMessage);
    } catch (error) {
        messageFeedback.textContent = error.message;
        return;
    }

    const payload = {
        messageName: state.selectedMessage.name,
        signals,
        periodMs,
        taskKey: state.selectedMessage.name,
    };

    try {
        const response = await api.post("/api/messages/send", payload);
        if (response.status === "periodic") {
            state.currentTaskKey = response.taskKey;
            stopButton.disabled = false;
            messageFeedback.textContent = `${t('periodic_started')} (${response.periodMs} ms).`;
        } else {
            messageFeedback.textContent = t('message_sent');
        }
    } catch (error) {
        messageFeedback.textContent = `${t('error')} ${error.message || error}`;
    }
});

if (bulkApplyButton && bulkValueInput) {
    bulkApplyButton.addEventListener("click", () => {
        const raw = bulkValueInput.value;
        if (raw === "") {
            messageFeedback.textContent = t('enter_bulk_value');
            return;
        }
        applyBulkValue(raw);
    });
}

if (bulkOnesButton && bulkValueInput) {
    bulkOnesButton.addEventListener("click", () => {
        bulkValueInput.value = "1";
        applyBulkValue("1");
    });
}

if (bulkZerosButton && bulkValueInput) {
    bulkZerosButton.addEventListener("click", () => {
        bulkValueInput.value = "0";
        applyBulkValue("0");
    });
}

if (recordStartButton) {
    recordStartButton.addEventListener("click", async () => {
        const payload = {};
        const name = recordNameInput?.value?.trim();
        if (name) {
            payload.name = name;
        }
        try {
            const info = await api.post("/api/logs/start", payload);
            setRecordingState(info);
            recordStatus.textContent = `${t('recording_started')} ${info.name}`;
            if (recordNameInput) {
                recordNameInput.value = "";
            }
            await refreshRecordings();
        } catch (error) {
            recordStatus.textContent = `${t('error')} ${error.message || error}`;
        }
    });
}

if (recordStopButton) {
    recordStopButton.addEventListener("click", async () => {
        try {
            const info = await api.post("/api/logs/stop", {});
            setRecordingState(null);
            recordStatus.textContent = `${t('recording_completed')} ${info.name}`;
            await refreshRecordings();
        } catch (error) {
            recordStatus.textContent = `${t('error')} ${error.message || error}`;
        }
    });
}

if (chaserStartButton) {
    chaserStartButton.addEventListener("click", async () => {
        if (!state.selectedMessage) {
            chaserStatus.textContent = t('select_message_first');
            return;
        }
        const interval = Number(chaserIntervalInput?.value || 0);
        if (Number.isNaN(interval) || interval <= 0) {
            chaserStatus.textContent = t('interval_must_be_positive');
            return;
        }
        const mode = state.chaserMode || "signals";
        const payload = {
            messageName: state.selectedMessage.name,
            intervalSeconds: interval,
            mode,
        };
        if (mode === "codes") {
            const source = state.codeSource || "excel";
            payload.codeSource = source;
            if (source === "excel") {
                if (!state.codeUpload || !Array.isArray(state.codeUpload.codes) || !state.codeUpload.codes.length) {
                    chaserStatus.textContent = t('code_excel_required');
                    return;
                }
                payload.codes = state.codeUpload.codes;
                if (state.codeUpload.descriptions && Object.keys(state.codeUpload.descriptions).length) {
                    payload.codeDescriptions = state.codeUpload.descriptions;
                }
            } else if (source === "excel-decimal") {
                if (!state.codeDecimalUpload || !Array.isArray(state.codeDecimalUpload.codes) || !state.codeDecimalUpload.codes.length) {
                    chaserStatus.textContent = t('code_excel_required');
                    return;
                }
                const targetSignal = decimalSignalSelector?.value;
                if (!targetSignal) {
                    chaserStatus.textContent = t('select_signal_first');
                    return;
                }
                payload.codes = state.codeDecimalUpload.codes;
                payload.targetSignal = targetSignal;
                if (state.codeDecimalUpload.descriptions && Object.keys(state.codeDecimalUpload.descriptions).length) {
                    payload.codeDescriptions = state.codeDecimalUpload.descriptions;
                }
            } else {
                const startValue = codeRangeStartInput?.value?.trim();
                const endValue = codeRangeEndInput?.value?.trim();
                if (!startValue || !endValue) {
                    chaserStatus.textContent = t('code_range_required');
                    return;
                }
                payload.codeRangeStart = startValue;
                payload.codeRangeEnd = endValue;
            }
        }
        try {
            const response = await api.post("/api/messages/chaser/start", payload);
            const task = response.task || response;
            setChaserState(task);
            const startedKey = mode === "codes" ? 'code_chaser_started' : 'chaser_started';
            chaserStatus.textContent = t(startedKey);
            await refreshChaserStatus();
        } catch (error) {
            chaserStatus.textContent = `${t('error')} ${error.message || error}`;
        }
    });
}

if (chaserStopButton) {
    chaserStopButton.addEventListener("click", async () => {
        if (!state.selectedMessage) {
            chaserStatus.textContent = t('select_message_first');
            return;
        }
        try {
            const previousMode = state.signalChaser?.mode;
            const response = await api.post("/api/messages/chaser/stop", {
                messageName: state.selectedMessage.name,
            });
            setChaserState(null);
            const stoppedKey = previousMode === "codes" ? 'code_chaser_stopped' : 'chaser_stopped';
            chaserStatus.textContent = t(stoppedKey);
            await refreshChaserStatus();
        } catch (error) {
            chaserStatus.textContent = `${t('error')} ${error.message || error}`;
        }
    });
}

if (faultStartButton) {
    faultStartButton.addEventListener("click", async () => {
        if (!state.faultMessage) {
            faultStatus.textContent = t('select_message_first');
            return;
        }
        
        const interval = Number(faultIntervalInput?.value || 0);
        if (Number.isNaN(interval) || interval <= 0) {
            faultStatus.textContent = t('interval_must_be_positive');
            return;
        }
        
        const count = Number(faultCountInput?.value || 0);
        if (Number.isNaN(count) || count <= 0) {
            faultStatus.textContent = t('fault_count') + ' ' + t('interval_must_be_positive');
            return;
        }
        
        const faultType = state.faultType || "bit-flip";
        const payload = {
            messageName: state.faultMessage.name,
            faultType: faultType,
            intervalSeconds: interval,
            count: count,
        };
        
        if (faultType === "bit-flip") {
            const bitCount = Number(bitFlipCountInput?.value || 1);
            payload.bitFlipCount = bitCount;
        } else if (faultType === "dlc-mismatch") {
            const dlc = Number(dlcValueInput?.value || 8);
            payload.dlcValue = dlc;
        } else if (faultType === "out-of-range") {
            const targetSignal = faultTargetSignal?.value;
            if (!targetSignal) {
                faultStatus.textContent = t('select_signal_first');
                return;
            }
            const multiplier = Number(rangeMultiplierInput?.value || 2);
            payload.targetSignal = targetSignal;
            payload.rangeMultiplier = multiplier;
        }
        
        try {
            const response = await api.post("/api/messages/fault/start", payload);
            setFaultTestState(response.task || response);
            faultStatus.textContent = t('fault_test_started');
        } catch (error) {
            faultStatus.textContent = `${t('error')} ${error.message || error}`;
        }
    });
}

if (faultStopButton) {
    faultStopButton.addEventListener("click", async () => {
        if (!state.faultMessage) {
            faultStatus.textContent = t('select_message_first');
            return;
        }
        try {
            await api.post("/api/messages/fault/stop", {
                messageName: state.faultMessage.name,
            });
            setFaultTestState(null);
            faultStatus.textContent = t('fault_test_stopped');
        } catch (error) {
            faultStatus.textContent = `${t('error')} ${error.message || error}`;
        }
    });
}

stopButton.addEventListener("click", async () => {
    if (!state.currentTaskKey) return;
    try {
        await api.post("/api/messages/stop", { taskKey: state.currentTaskKey });
        messageFeedback.textContent = t('periodic_stopped');
    } catch (error) {
        messageFeedback.textContent = `${t('error')} ${error.message || error}`;
    } finally {
        stopButton.disabled = true;
        state.currentTaskKey = null;
    }
});

function handleSocketEvent(event) {
    switch (event.type) {
        case "rx": {
            const timestampSeconds = typeof event.timestamp === "number" ? event.timestamp : Date.now() / 1000;
            logEvent({
                type: "rx",
                id: event.id,
                timestamp: timestampSeconds,
                dlc: event.dlc,
                data: event.data,
                decoded: event.decoded || null,
            });
            break;
        }
        case "tx": {
            const timestampSeconds = typeof event.timestamp === "number" ? event.timestamp : Date.now() / 1000;
            logEvent({
                type: "tx",
                id: event.id,
                timestamp: timestampSeconds,
                dlc: event.dlc,
                data: event.data || [],
                decoded: { name: event.message, signals: {} },
                code: event.code ?? null,
                description: event.description || null,
            });
            if (state.signalChaser && state.signalChaser.messageName === event.message) {
                refreshChaserStatus();
            }
            break;
        }
        case "interface":
            renderInterfaceStatus({ configured: true, ...event.status });
            break;
        case "dbc": {
            const label = event.name || event.path || "DBC";
            dbcStatus.textContent = `${t('loaded_dbc')} ${label}`;
            break;
        }
        case "recording": {
            if (event.state === "started") {
                setRecordingState(event.record);
                if (recordStatus) {
                    recordStatus.textContent = `${t('recording_started')} ${event.record.name}`;
                }
            } else if (event.state === "stopped") {
                setRecordingState(null);
                if (recordStatus) {
                    recordStatus.textContent = `${t('recording_completed')} ${event.record.name}`;
                }
                refreshRecordings();
            }
            break;
        }
        case "fault": {
            if (event.status === "progress" && state.faultTest && state.faultMessage && event.messageName === state.faultMessage.name) {
                state.faultTest.sentCount = event.sentCount;
                setFaultTestState(state.faultTest);
            } else if (event.status === "completed" && state.faultTest && state.faultMessage && event.messageName === state.faultMessage.name) {
                setFaultTestState(null);
                if (faultStatus) {
                    faultStatus.textContent = t('fault_test_completed');
                }
            }
            break;
        }
        default:
            console.debug("Unhandled event", event);
    }
}

function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);

    ws.onopen = () => {
        console.info(t('websocket_opened'));
        ws.send("ping");
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleSocketEvent(data);
        } catch (error) {
            console.error(t('websocket_parse_error'), error);
        }
    };

    ws.onclose = () => {
        console.warn(t('websocket_closed'));
        setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = (event) => {
        console.error(t('websocket_error'), event);
        ws.close();
    };
}

async function bootstrap() {
    // Initialize language
    const currentLang = getCurrentLanguage();
    if (langTrButton && langEnButton) {
        langTrButton.classList.toggle('active', currentLang === 'tr');
        langEnButton.classList.toggle('active', currentLang === 'en');
    }
    updateTranslations();
    
    await loadInterfaces();
    try {
        const status = await api.get("/api/interface/status");
        renderInterfaceStatus(status);
    } catch (error) {
        console.warn(t('interface_status_failed'), error);
    }

    try {
        const metadata = await api.get("/api/dbc/messages");
        state.dbc = metadata;
        state.messages = metadata.messages;
        renderDbcStatus(metadata);
        populateMessageSelect(metadata.messages);
    } catch {
        renderDbcStatus(null);
    }

    if (state.selectedMessage) {
        await refreshChaserStatus();
    } else {
        setChaserState(null);
    }

    if (recordingsList) {
        await refreshRecordings();
    } else {
        setRecordingState(null);
    }

    connectWebSocket();
}

bootstrap();
if (!bitrateInput.value) {
    bitrateInput.value = "500000";
}
