const state = {
    logs: [],
    selectedLogId: null,
    decodedData: null,
    selectedSeriesKey: null,
    chart: null,
};

const EVENT_TABLE_LIMIT = 2000;
const DEFAULT_CHART_COLOR = "#dc2626";

const logSelect = document.getElementById("log-select");
const logSummary = document.getElementById("log-summary");
const dbcForm = document.getElementById("playback-dbc-form");
const dbcFileInput = document.getElementById("playback-dbc-file");
const dbcFileLabel = document.getElementById("playback-dbc-label");
const decodeButton = document.getElementById("decode-button");
const decodeStatus = document.getElementById("decode-status");
const signalList = document.getElementById("signal-list");
const signalDetails = document.getElementById("signal-details");
const eventTable = document.getElementById("event-table");
const chartCanvas = document.getElementById("signal-chart");

const api = {
    async get(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
    async postForm(path, formData) {
        const response = await fetch(path, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
};

function formatDuration(seconds) {
    if (!seconds) return "0 sn";
    if (seconds < 60) return `${seconds.toFixed(2)} sn`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes} dk ${remainder.toFixed(1)} sn`;
}

function updateDecodeButtonState() {
    if (!decodeButton) return;
    const hasLog = Boolean(state.selectedLogId);
    const hasFile = dbcFileInput?.files?.length;
    decodeButton.disabled = !(hasLog && hasFile);
}

function populateLogSelect() {
    if (!logSelect) return;
    logSelect.innerHTML = "";
    if (!state.logs.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Kayıt bulunamadı.";
        logSelect.append(option);
        logSelect.disabled = true;
        logSummary.textContent = "";
        return;
    }

    logSelect.disabled = false;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Bir kayıt seçin";
    logSelect.append(placeholder);

    for (const log of state.logs) {
        const option = document.createElement("option");
        option.value = log.id;
        const started = log.started_at
            ? new Date(log.started_at * 1000).toLocaleString("tr-TR")
            : "Bilinmiyor";
        option.textContent = `${log.name || log.id} (${started})`;
        logSelect.append(option);
    }

    if (state.selectedLogId) {
        logSelect.value = state.selectedLogId;
    }
}

function updateLogSummary(log) {
    if (!logSummary) return;
    if (!log) {
        logSummary.textContent = "Kayıt seçilmedi.";
        return;
    }
    const started = log.started_at ? new Date(log.started_at * 1000).toLocaleString("tr-TR") : "Bilinmiyor";
    const duration = log.duration ? formatDuration(log.duration) : "0 sn";
    logSummary.innerHTML = `
        <strong>${log.name || log.id}</strong><br>
        Başlangıç: ${started}<br>
        Süre: ${duration} • ${log.event_count || 0} olay
    `;
}

function setDecodeStatus(message, isError = false) {
    if (!decodeStatus) return;
    decodeStatus.textContent = message;
    decodeStatus.style.color = isError ? "#fca5a5" : "#bfdbfe";
}

function ensureChart() {
    if (state.chart || !chartCanvas || typeof Chart === "undefined") return;
    state.chart = new Chart(chartCanvas, {
        type: "line",
        data: { datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const value = context.parsed.y;
                            return `Değer: ${value}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Zaman (s)" },
                    ticks: { color: "#f8fafc" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                },
                y: {
                    title: { display: true, text: "Değer" },
                    ticks: { color: "#f8fafc" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                },
            },
        },
    });
}

function highlightSelectedSignal() {
    if (!signalList) return;
    signalList.querySelectorAll(".signal-item").forEach((item) => {
        const key = item.dataset.key;
        if (key === state.selectedSeriesKey) {
            item.classList.add("signal-item--active");
        } else {
            item.classList.remove("signal-item--active");
        }
    });
}

function renderSignalList() {
    if (!signalList) return;
    signalList.innerHTML = "";
    const series = state.decodedData?.series || [];
    if (!series.length) {
        signalList.innerHTML = "<p class=\"help-text\">Grafik için sinyal bulunamadı.</p>";
        return;
    }

    for (const item of series) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "signal-item";
        element.dataset.key = item.key;
        element.innerHTML = `
            <strong>${item.message}</strong>
            <span>${item.signal}${item.unit ? ` (${item.unit})` : ""}</span>
            <span class="signal-item__meta">${item.points.length} örnek${item.downsampled ? " • örnekleme" : ""}</span>
        `;
        element.addEventListener("click", () => {
            state.selectedSeriesKey = item.key;
            highlightSelectedSignal();
            renderChartForSeries(item);
        });
        signalList.append(element);
    }
    highlightSelectedSignal();
}

function renderChartForSeries(seriesItem) {
    ensureChart();
    if (!state.chart) return;
    if (!seriesItem || !seriesItem.points.length) {
        state.chart.data.datasets = [];
        state.chart.update();
        if (signalDetails) {
            signalDetails.textContent = "Gösterilecek veri bulunamadı.";
        }
        return;
    }

    const dataPoints = seriesItem.points.map((point) => ({
        x: point.relative ?? (point.timestamp - (state.decodedData?.log?.started_at || 0)),
        y: point.value,
    }));

    state.chart.data.datasets = [
        {
            label: `${seriesItem.message}.${seriesItem.signal}`,
            data: dataPoints,
            borderColor: DEFAULT_CHART_COLOR,
            backgroundColor: "rgba(220, 38, 38, 0.25)",
            tension: 0.2,
            pointRadius: dataPoints.length > 1000 ? 0 : 2,
        },
    ];
    state.chart.update("none");

    if (signalDetails) {
        const values = dataPoints.map((point) => point.y);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const latest = values.at(-1);
        const downsampleNote = seriesItem.downsampled
            ? `<br><em>Not:</em> Grafik, ${seriesItem.original_points} örnekten ${values.length} örnek ile gösteriliyor.`
            : "";
        signalDetails.innerHTML = `
            <strong>${seriesItem.message} • ${seriesItem.signal}</strong><br>
            Örnek sayısı: ${values.length}<br>
            Min: ${min.toFixed(3)} • Max: ${max.toFixed(3)}<br>
            Son değer: ${latest.toFixed(3)}${seriesItem.unit ? ` ${seriesItem.unit}` : ""}
            ${downsampleNote}
        `;
    }
}

function renderEventTable(events) {
    if (!eventTable) return;
    eventTable.innerHTML = "";
    if (!events?.length) {
        eventTable.textContent = "Olay bulunamadı.";
        return;
    }

    const infoBar = document.createElement("div");
    infoBar.className = "event-table__info";
    const total = state.decodedData?.events_total ?? events.length;
    const shown = state.decodedData?.events_shown ?? events.length;
    infoBar.textContent = total > shown
        ? `${total} olayın ilk ${shown} adedi gösteriliyor.`
        : `${shown} olay gösteriliyor.`;
    eventTable.append(infoBar);

    const table = document.createElement("table");
    table.className = "event-table__table";
    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr>
            <th>Zaman (s)</th>
            <th>Tür</th>
            <th>ID</th>
            <th>Mesaj</th>
            <th>Veri (HEX)</th>
        </tr>
    `;
    table.append(thead);

    const tbody = document.createElement("tbody");
    for (const event of events) {
        const row = document.createElement("tr");
        row.className = `event-${event.type}`;
        const timeCell = document.createElement("td");
        timeCell.textContent = (event.relative_time ?? 0).toFixed(3);
        const typeCell = document.createElement("td");
        typeCell.textContent = event.type?.toUpperCase();
        const idCell = document.createElement("td");
        idCell.textContent = event.id != null ? `0x${Number(event.id).toString(16).toUpperCase()}` : "-";
        const nameCell = document.createElement("td");
        nameCell.textContent = event.decoded?.name || event.message || "-";
        const dataCell = document.createElement("td");
        const dataArray = event.data || [];
        dataCell.textContent = dataArray.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
        row.append(timeCell, typeCell, idCell, nameCell, dataCell);
        tbody.append(row);
    }
    table.append(tbody);
    eventTable.append(table);
}

async function loadLogs() {
    try {
        const response = await api.get("/api/logs");
        state.logs = response.logs || [];
        const params = new URLSearchParams(window.location.search);
        const requestedLog = params.get("log");
        if (requestedLog && state.logs.some((log) => log.id === requestedLog)) {
            state.selectedLogId = requestedLog;
        }
        populateLogSelect();
        const selectedLog = state.logs.find((log) => log.id === state.selectedLogId);
        updateLogSummary(selectedLog);
        updateDecodeButtonState();
    } catch (error) {
        logSummary.textContent = `Kayıtlar alınamadı: ${error.message || error}`;
    }
}

async function decodeSelectedLog() {
    if (!state.selectedLogId || !dbcFileInput?.files?.length) return;
    const file = dbcFileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);
    setDecodeStatus("Analiz ediliyor...");
    try {
        const data = await api.postForm(`/api/logs/${state.selectedLogId}/decode`, formData);
        state.decodedData = data;
        state.selectedSeriesKey = data.series?.[0]?.key || null;
        const truncatedNote = data.events_total > data.events_shown
            ? ` (ilk ${data.events_shown}/${data.events_total} olay)`
            : "";
        setDecodeStatus(`Analiz tamamlandı. ${data.series?.length || 0} sinyal bulundu.${truncatedNote}`);
        renderSignalList();
        renderEventTable(data.events);
        if (state.selectedSeriesKey) {
            const firstSeries = data.series.find((item) => item.key === state.selectedSeriesKey);
            renderChartForSeries(firstSeries);
        } else {
            renderChartForSeries(null);
        }
    } catch (error) {
        state.decodedData = null;
        setDecodeStatus(`Hata: ${error.message || error}`, true);
        renderSignalList();
        renderEventTable([]);
        renderChartForSeries(null);
    }
}

logSelect?.addEventListener("change", (event) => {
    state.selectedLogId = event.target.value || null;
    const log = state.logs.find((item) => item.id === state.selectedLogId);
    updateLogSummary(log);
    updateDecodeButtonState();
});

dbcFileInput?.addEventListener("change", () => {
    const file = dbcFileInput.files[0];
    dbcFileLabel.textContent = file ? file.name : "Dosya seçin";
    updateDecodeButtonState();
});

dbcForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await decodeSelectedLog();
});

window.addEventListener("DOMContentLoaded", async () => {
    ensureChart();
    await loadLogs();
    updateDecodeButtonState();
});
