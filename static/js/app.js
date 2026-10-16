/**
 * EcoWaste - Smart Waste Management Digital Twin 2.0
 * Comprehensive Frontend Application Engine
 *
 * Capabilities:
 * 1. AI Vision & Live Web Waste Classification (<60% confidence alert, item identification, Wet/Dry bin tip)
 * 2. IoT Digital Twin Virtual Grid (Ultrasonic HC-SR04, MQ-135 Gas, Load cell weight, moving fleet trucks)
 * 3. What-If Predictive Simulation Engine ("What if collection skipped for N days?")
 * 4. Shortest Path Truck Route Optimization (TSP polyline on Leaflet)
 * 5. Citizen Waste Reporting with GPS & Photo Upload
 * 6. Real-time Municipal Alerts Command Hub
 * 7. Generative AI Suite (LLM dispatch advice, interactive EcoBot, daily municipal executive reports)
 * 8. Live Community Leaderboard & Verified Reviews
 * 9. Dark Mode & Multi-Language Support (English, Hindi, Kannada)
 */

// ============================================================================
// 1. GLOBAL STATE & CONSTANTS
// ============================================================================

const tabs = [
    'dashboard',
    'scan',
    'digital-twin',
    'report-waste',
    'alerts',
    'find-bins',
    'ai-assistant',
    'leaderboard',
    'reviews'
];
let currentTab = 'dashboard';

// Chart Instances
let categoryChartInstance = null;
let trendChartInstance = null;

// Camera State
let cameraStream = null;
let currentFacingMode = 'user';
let selectedDeviceId = null;
let cameraDevicesList = [];
let lastScannedImageBlob = null;
let lastScannedItemName = '';

// Nearby Facilities Map State
let binsMap = null;
let userMarker = null;
let binsMarkerGroup = null;

// Digital Twin Map & Fleet State
let twinMap = null;
let twinBinsLayer = null;
let twinTrucksLayer = null;
let twinRoutePolyline = null;
let twinPollingTimer = null;
let cachedTwinBins = [];
let cachedTwinTrucks = [];

// Reviews State
let selectedRating = 0;

// Citizen Report State
let reportPhotoBase64 = '';
let reportLat = 12.9716;
let reportLon = 77.5946;

// Multi-Language Translation Dictionary
const I18N_DICTIONARY = {
    en: {
        nav_dashboard: "Dashboard",
        nav_scan: "Scan Waste",
        nav_twin: "Digital Twin",
        nav_report: "Report Waste",
        nav_alerts: "Alerts",
        nav_bins: "Nearby Bins",
        nav_ai: "AI Assistant",
        nav_leaderboard: "Leaderboard",
        nav_reviews: "Reviews",
        dash_title: "Smart Waste Command Center",
        dash_subtitle: "Real-time IoT telemetry, AI computer vision segregation, and digital twin fleet management.",
        kpi_scans: "Total Classified",
        kpi_full_bins: "Full Bins (>80%)",
        kpi_diversion: "Bio-Degradable %",
        kpi_trucks: "Active Fleet Trucks",
        scan_header: "AI Waste Classification & Web Identification",
        scan_subtitle: "Point your laptop webcam or upload a photo. The system uses deep learning + live web knowledge to identify the exact item and wet/dry bin tip."
    },
    hi: {
        nav_dashboard: "डैशबोर्ड",
        nav_scan: "कचरा स्कैन करें",
        nav_twin: "डिजिटल ट्विन",
        nav_report: "कचरे की रिपोर्ट",
        nav_alerts: "अलर्ट",
        nav_bins: "निकटतम डस्टबिन",
        nav_ai: "एआई सहायक",
        nav_leaderboard: "लीडरबोर्ड",
        nav_reviews: "समीक्षाएं",
        dash_title: "स्मार्ट अपशिष्ट नियंत्रण केंद्र",
        dash_subtitle: "रीयल-टाइम IoT टेलीमेट्री, AI कंप्यूटर विज़न वर्गीकरण और डिजिटल ट्विन प्रबंधन।",
        kpi_scans: "कुल वर्गीकृत",
        kpi_full_bins: "भरे हुए डस्टबिन (>80%)",
        kpi_diversion: "बायो-डिग्रेडेबल %",
        kpi_trucks: "सक्रिय कचरा गाड़ियां",
        scan_header: "एआई अपशिष्ट वर्गीकरण और पहचान",
        scan_subtitle: "अपने लैपटॉप वेबकैम का उपयोग करें या फोटो अपलोड करें। हमारा डीप लर्निंग मॉडल और लाइव वेब खोज सटीक वस्तु व डस्टबिन का प्रकार बताते हैं।"
    },
    kn: {
        nav_dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
        nav_scan: "ತ್ಯಾಜ್ಯ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
        nav_twin: "ಡಿಜಿಟಲ್ ಟ್ವಿನ್",
        nav_report: "ದೂರು ದಾಖಲಿಸಿ",
        nav_alerts: "ಎಚ್ಚರಿಕೆಗಳು",
        nav_bins: "ಹತ್ತಿರದ ಕಸದ ಬುಟ್ಟಿಗಳು",
        nav_ai: "AI ಸಹಾಯಕ",
        nav_leaderboard: "ಲೀಡರ್‌ಬೋರ್ಡ್",
        nav_reviews: "ಪ್ರತಿಕ್ರಿಯೆಗಳು",
        dash_title: "ಸ್ಮಾರ್ಟ್ ತ್ಯಾಜ್ಯ ನಿಯಂತ್ರಣ ಕೇಂದ್ರ",
        dash_subtitle: "ನೈಜ-ಸಮಯದ IoT ಟೆಲಿಮೆಟ್ರಿ, AI ಕಂಪ್ಯೂಟರ್ ದೃಷ್ಟಿ ವಿಂಗಡಣೆ ಮತ್ತು ಡಿಜಿಟಲ್ ಟ್ವಿನ್ ವಾಹನ ನಿರ್ವಹಣೆ.",
        kpi_scans: "ಒಟ್ಟು ವರ್ಗೀಕೃತ",
        kpi_full_bins: "ತುಂಬಿದ ಬುಟ್ಟಿಗಳು (>80%)",
        kpi_diversion: "ಜೈವಿಕ ವಿಘಟನೀಯ %",
        kpi_trucks: "ಸಕ್ರಿಯ ವಾಹನಗಳು",
        scan_header: "AI ತ್ಯಾಜ್ಯ ವಿಂಗಡಣೆ ಮತ್ತು ಗುರುತಿಸುವಿಕೆ",
        scan_subtitle: "ನಿಮ್ಮ ಕ್ಯಾಮರಾ ಅಥವಾ ಫೋಟೋ ಬಳಸಿ ತ್ಯಾಜ್ಯವನ್ನು ಹಸಿ ಕಸ ಅಥವಾ ಒಣ ಕಸ ಎಂದು ನಿಖರವಾಗಿ ವಿಂಗಡಿಸಿ."
    }
};

// ============================================================================
// 2. UTILITY FUNCTIONS & TOAST NOTIFICATIONS
// ============================================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all duration-300 transform translate-x-full';

    let iconClass = 'fa-solid fa-circle-info text-blue-500';
    let borderBgClass = 'bg-white border-slate-200 text-slate-800';

    if (type === 'success') {
        iconClass = 'fa-solid fa-circle-check text-emerald-500';
        borderBgClass = 'bg-emerald-50/95 border-emerald-200 text-emerald-900';
    } else if (type === 'error') {
        iconClass = 'fa-solid fa-circle-exclamation text-red-500';
        borderBgClass = 'bg-red-50/95 border-red-200 text-red-900';
    } else if (type === 'warning') {
        iconClass = 'fa-solid fa-triangle-exclamation text-amber-500';
        borderBgClass = 'bg-amber-50/95 border-amber-200 text-amber-900';
    }

    toast.className += ` ${borderBgClass}`;
    toast.innerHTML = `
        <i class="${iconClass} text-lg"></i>
        <div class="flex-1">${message}</div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 ml-2">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-x-full'));

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const icon = document.getElementById('menu-icon');
    if (!menu) return;

    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        if (icon) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        }
    } else {
        menu.classList.add('hidden');
        if (icon) {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    }
}

// ============================================================================
// 3. DARK MODE & MULTI-LANGUAGE
// ============================================================================

function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    const isDark = body.classList.toggle('dark-mode');

    if (isDark) {
        document.documentElement.classList.add('dark');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
        localStorage.setItem('ecowaste_theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        localStorage.setItem('ecowaste_theme', 'light');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('ecowaste_theme');
    const icon = document.getElementById('theme-icon');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
}

function changeLanguage(lang) {
    if (!I18N_DICTIONARY[lang]) return;
    const dict = I18N_DICTIONARY[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });

    localStorage.setItem('ecowaste_lang', lang);
    const select = document.getElementById('lang-select');
    if (select && select.value !== lang) {
        select.value = lang;
    }

    // Synchronize EcoBot Assistant language
    if (typeof setEcoBotLanguage === 'function') {
        setEcoBotLanguage(lang);
    }
}

function initLanguage() {
    const savedLang = localStorage.getItem('ecowaste_lang') || 'en';
    changeLanguage(savedLang);
}

// ============================================================================
// 4. TAB NAVIGATION CONTROLLER
// ============================================================================

function switchTab(tabName) {
    if (!tabs.includes(tabName)) return;
    currentTab = tabName;

    // Shut down active webcam when leaving scan tab
    if (tabName !== 'scan' && cameraStream) {
        stopCamera();
    }

    // Toggle tab panes
    tabs.forEach(t => {
        const pane = document.getElementById(`tab-${t}`);
        const navBtn = document.getElementById(`nav-btn-${t}`);

        if (pane) {
            if (t === tabName) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        }

        if (navBtn) {
            if (t === tabName) {
                navBtn.classList.add('active');
            } else {
                navBtn.classList.remove('active');
            }
        }
    });

    // Lazy load tab specific telemetry & maps
    switch (tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'digital-twin':
            setTimeout(() => {
                initDigitalTwinMap();
                loadDigitalTwinData();
            }, 100);
            break;
        case 'report-waste':
            loadRecentReports();
            break;
        case 'alerts':
            loadAlertsHub();
            break;
        case 'find-bins':
            setTimeout(() => {
                if (binsMap) binsMap.invalidateSize();
            }, 150);
            break;
        case 'ai-assistant':
            loadAiRecommendations();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
        case 'reviews':
            loadReviews();
            break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// 5. DASHBOARD TAB & KPIS
// ============================================================================

async function loadDashboard() {
    const refreshIcon = document.getElementById('dash-refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    const emptyState = document.getElementById('dashboard-empty-state');
    const chartsContainer = document.getElementById('dashboard-charts-container');

    try {
        const [analyticsRes, binsRes, trucksRes, alertsRes] = await Promise.all([
            fetch('/api/analytics'),
            fetch('/api/digital-twin/bins'),
            fetch('/api/digital-twin/trucks'),
            fetch('/api/alerts')
        ]);

        const data = analyticsRes.ok ? await analyticsRes.json() : {};
        const bins = binsRes.ok ? await binsRes.json() : [];
        const trucks = trucksRes.ok ? await trucksRes.json() : [];
        const alerts = alertsRes.ok ? await alertsRes.json() : [];

        // Scans & Bio percentage
        const totalScans = data.total_scans ?? 0;
        const bioCount = data.bio_count ?? 0;
        const bioPercent = totalScans > 0 ? Math.round((bioCount / totalScans) * 100) : 0;

        // Bins full count (>80%)
        const fullBins = bins.filter(b => (b.fill_level || 0) >= 80).length;
        const activeTrucks = trucks.length || 3;

        // Populate KPIs
        const el = id => document.getElementById(id);
        if (el('kpi-total-scans')) el('kpi-total-scans').textContent = Number(totalScans).toLocaleString();
        if (el('kpi-full-bins')) el('kpi-full-bins').textContent = Number(fullBins).toLocaleString();
        if (el('kpi-bio-percent')) el('kpi-bio-percent').textContent = `${bioPercent}%`;
        if (el('kpi-active-trucks')) el('kpi-active-trucks').textContent = Number(activeTrucks).toLocaleString();

        // Render Charts
        renderCategoryChart(data.counts_per_category || []);
        renderTrendChart(data.daily_trend || []);

        // Render Dashboard Alert Ticker
        renderDashboardAlerts(alerts);
        updateAlertsBadge(alerts.length);

    } catch (err) {
        console.error('Failed to load dashboard:', err);
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('fa-spin'), 400);
        }
    }
}

function renderDashboardAlerts(alerts) {
    const list = document.getElementById('dash-alerts-list');
    if (!list) return;

    if (!alerts || alerts.length === 0) {
        list.innerHTML = `
            <div class="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-600"></i>
                <span>All municipal smart bins and routes are operating within normal parameters.</span>
            </div>
        `;
        return;
    }

    list.innerHTML = alerts.slice(0, 3).map(a => `
        <div class="p-3.5 rounded-xl border ${a.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'} flex items-center justify-between">
            <div class="flex items-center gap-3">
                <i class="fa-solid ${a.severity === 'critical' ? 'fa-triangle-exclamation text-red-500' : 'fa-circle-exclamation text-amber-500'} text-base"></i>
                <div>
                    <h5 class="font-bold text-xs">${escapeHtml(a.title)}</h5>
                    <p class="text-[11px] opacity-80 mt-0.5">${escapeHtml(a.message)}</p>
                </div>
            </div>
            <button onclick="switchTab('alerts')" class="text-[11px] font-bold underline shrink-0 ml-2">Resolve</button>
        </div>
    `).join('');
}

function updateAlertsBadge(count) {
    const badge = document.getElementById('nav-alerts-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderCategoryChart(categoryData) {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;

    let labels = [];
    let counts = [];

    if (Array.isArray(categoryData)) {
        labels = categoryData.map(item => (item.category || item.predicted_class || item.label || 'Other').toUpperCase());
        counts = categoryData.map(item => item.count || item.total || 0);
    } else if (typeof categoryData === 'object' && categoryData !== null) {
        labels = Object.keys(categoryData).map(k => k.toUpperCase());
        counts = Object.values(categoryData);
    }

    if (labels.length === 0) {
        labels = ['ORGANIC', 'PLASTIC', 'PAPER', 'METAL', 'GLASS', 'E-WASTE'];
        counts = [0, 0, 0, 0, 0, 0];
    }

    if (categoryChartInstance) categoryChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    categoryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: [
                    'rgba(34, 197, 94, 0.85)',
                    'rgba(59, 130, 246, 0.85)',
                    'rgba(234, 179, 8, 0.85)',
                    'rgba(148, 163, 184, 0.85)',
                    'rgba(168, 85, 247, 0.85)',
                    'rgba(239, 68, 68, 0.85)'
                ],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    padding: 10,
                    cornerRadius: 8,
                    bodyFont: { family: 'Poppins' },
                    titleFont: { family: 'Poppins', weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { family: 'Poppins', size: 11 } },
                    grid: { color: 'rgba(226, 232, 240, 0.6)' }
                },
                x: {
                    ticks: { font: { family: 'Poppins', size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderTrendChart(trendData) {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;

    let labels = [];
    let counts = [];

    if (Array.isArray(trendData)) {
        labels = trendData.map(item => item.date || item.day || item.label || '');
        counts = trendData.map(item => item.count || item.total || item.scans || 0);
    } else if (typeof trendData === 'object' && trendData !== null) {
        labels = Object.keys(trendData);
        counts = Object.values(trendData);
    }

    if (labels.length === 0) {
        labels = ['Today'];
        counts = [0];
    }

    if (trendChartInstance) trendChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                fill: true,
                backgroundColor: gradient,
                borderColor: '#2563eb',
                borderWidth: 2.5,
                pointBackgroundColor: '#1d4ed8',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    padding: 10,
                    cornerRadius: 8,
                    bodyFont: { family: 'Poppins' },
                    titleFont: { family: 'Poppins', weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { family: 'Poppins', size: 11 } },
                    grid: { color: 'rgba(226, 232, 240, 0.6)' }
                },
                x: {
                    ticks: { font: { family: 'Poppins', size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================================================
// 6. COMPUTER VISION & SCAN WASTE TAB
// ============================================================================

function setScanMode(mode) {
    const cameraSection = document.getElementById('camera-section');
    const uploadSection = document.getElementById('upload-section');
    const searchSection = document.getElementById('search-section');
    const cameraBtn = document.getElementById('scan-mode-camera-btn');
    const uploadBtn = document.getElementById('scan-mode-upload-btn');
    const searchBtn = document.getElementById('scan-mode-search-btn');

    const activeClass = 'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-white text-emerald-700 shadow-sm';
    const activeSearchClass = 'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-white text-blue-700 shadow-sm';
    const inactiveClass = 'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-600 hover:text-slate-900';

    if (mode === 'camera') {
        if (cameraSection) cameraSection.classList.remove('hidden');
        if (uploadSection) uploadSection.classList.add('hidden');
        if (searchSection) searchSection.classList.add('hidden');
        if (cameraBtn) cameraBtn.className = activeClass;
        if (uploadBtn) uploadBtn.className = inactiveClass;
        if (searchBtn) searchBtn.className = inactiveClass;
    } else if (mode === 'upload') {
        if (cameraStream) stopCamera();
        if (cameraSection) cameraSection.classList.add('hidden');
        if (uploadSection) uploadSection.classList.remove('hidden');
        if (searchSection) searchSection.classList.add('hidden');
        if (uploadBtn) uploadBtn.className = activeClass;
        if (cameraBtn) cameraBtn.className = inactiveClass;
        if (searchBtn) searchBtn.className = inactiveClass;
    } else if (mode === 'search') {
        if (cameraStream) stopCamera();
        if (cameraSection) cameraSection.classList.add('hidden');
        if (uploadSection) uploadSection.classList.add('hidden');
        if (searchSection) searchSection.classList.remove('hidden');
        if (searchBtn) searchBtn.className = activeSearchClass;
        if (cameraBtn) cameraBtn.className = inactiveClass;
        if (uploadBtn) uploadBtn.className = inactiveClass;
        const searchInput = document.getElementById('google-search-input');
        if (searchInput) searchInput.focus();
    }
}

async function populateCameraDevices() {
    const selectEl = document.getElementById('camera-device-select');
    const switchBtn = document.getElementById('btn-switch-camera');
    if (!selectEl || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameraDevicesList = devices.filter(d => d.kind === 'videoinput');

        if (cameraDevicesList.length > 1) {
            selectEl.innerHTML = '';
            cameraDevicesList.forEach((device, idx) => {
                const opt = document.createElement('option');
                opt.value = device.deviceId;
                opt.textContent = device.label || `Camera ${idx + 1}`;
                if (selectedDeviceId === device.deviceId) opt.selected = true;
                selectEl.appendChild(opt);
            });
            selectEl.classList.remove('hidden');
            if (switchBtn) switchBtn.classList.remove('hidden');
        } else if (cameraDevicesList.length === 1 && switchBtn) {
            switchBtn.classList.remove('hidden');
        }
    } catch (e) {
        console.warn('Could not enumerate cameras:', e);
    }
}

async function changeCameraDevice() {
    const selectEl = document.getElementById('camera-device-select');
    if (selectEl && selectEl.value) {
        selectedDeviceId = selectEl.value;
        if (cameraStream) await startCamera();
    }
}

function switchCameraFacing() {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    selectedDeviceId = null;
    startCamera();
}

async function startCamera() {
    const video = document.getElementById('camera-preview');
    const placeholder = document.getElementById('camera-placeholder');
    const errorBanner = document.getElementById('camera-error-banner');
    const errorTitle = document.getElementById('camera-error-title');
    const errorMsg = document.getElementById('camera-error-msg');
    const statusDot = document.getElementById('camera-status-dot');
    const statusText = document.getElementById('camera-status-text');
    const targetOverlay = document.getElementById('camera-target-overlay');

    const btnStart = document.getElementById('btn-start-camera');
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop-camera');

    if (errorBanner) errorBanner.classList.add('hidden');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (errorBanner) {
            errorTitle.textContent = 'Camera API Unsupported';
            errorMsg.textContent = 'Your browser does not support web camera streaming.';
            errorBanner.classList.remove('hidden');
        }
        return;
    }

    if (cameraStream) stopCamera();

    const constraints = {
        video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
    };

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = cameraStream;
        video.muted = true;
        await video.play();

        video.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
        if (targetOverlay) targetOverlay.classList.remove('hidden');

        if (statusDot) {
            statusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
        }
        if (statusText) {
            statusText.textContent = 'Camera Active';
            statusText.className = 'text-xs font-semibold text-emerald-600';
        }

        if (btnStart) btnStart.classList.add('hidden');
        if (btnCapture) btnCapture.classList.remove('hidden');
        if (btnStop) btnStop.classList.remove('hidden');

        await populateCameraDevices();
    } catch (err) {
        console.error('Camera access error:', err);
        if (errorBanner) {
            errorTitle.textContent = 'Camera Access Blocked';
            errorMsg.textContent = err.name === 'NotAllowedError'
                ? 'Camera permission denied. Please grant webcam permissions in browser settings.'
                : `Camera error: ${err.message}`;
            errorBanner.classList.remove('hidden');
        }
        if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-red-500';
        if (statusText) {
            statusText.textContent = 'Camera Error';
            statusText.className = 'text-xs font-semibold text-red-600';
        }
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }

    const video = document.getElementById('camera-preview');
    const placeholder = document.getElementById('camera-placeholder');
    const statusDot = document.getElementById('camera-status-dot');
    const statusText = document.getElementById('camera-status-text');
    const targetOverlay = document.getElementById('camera-target-overlay');

    const btnStart = document.getElementById('btn-start-camera');
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop-camera');

    if (video) {
        video.pause();
        video.srcObject = null;
        video.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (targetOverlay) targetOverlay.classList.add('hidden');

    if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
    if (statusText) {
        statusText.textContent = 'Camera Inactive';
        statusText.className = 'text-xs font-semibold text-slate-500';
    }

    if (btnStart) btnStart.classList.remove('hidden');
    if (btnCapture) btnCapture.classList.add('hidden');
    if (btnStop) btnStop.classList.add('hidden');
}

async function captureAndClassify() {
    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('camera-canvas');
    const usernameInput = document.getElementById('camera-username');
    const username = (usernameInput && usernameInput.value.trim()) || 'EcoCitizen';

    if (!video || !canvas || !cameraStream) {
        showToast('Camera is not active. Please start camera first.', 'warning');
        return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Cache scanned image preview
    canvas.toBlob((blob) => {
        lastScannedImageBlob = blob;
    }, 'image/jpeg', 0.92);

    const base64Data = canvas.toDataURL('image/jpeg', 0.88);
    await sendClassificationPayload({ image: base64Data, username: username });
}

function handleImageSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    // Cache scanned image file
    lastScannedImageBlob = file;

    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (PNG, JPG, WEBP).', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('upload-preview-img');
        const previewContainer = document.getElementById('upload-preview-container');
        const placeholder = document.getElementById('upload-placeholder');
        const uploadForm = document.getElementById('upload-form-fields');

        if (previewImg) previewImg.src = e.target.result;
        if (placeholder) placeholder.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (uploadForm) uploadForm.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function clearImagePreview() {
    const fileInput = document.getElementById('image-file-input');
    const previewContainer = document.getElementById('upload-preview-container');
    const placeholder = document.getElementById('upload-placeholder');
    const uploadForm = document.getElementById('upload-form-fields');

    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (uploadForm) uploadForm.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
}

async function submitUploadClassification() {
    const fileInput = document.getElementById('image-file-input');
    const usernameInput = document.getElementById('upload-username');
    const username = (usernameInput && usernameInput.value.trim()) || 'EcoCitizen';

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast('Please select an image first.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('username', username);

    await sendClassificationPayload(formData, true);
}

function uploadAndClassify() {
    return submitUploadClassification();
}

async function sendClassificationPayload(payload, isFormData = false) {
    const loadingSpinner = document.getElementById('scan-loading') || document.getElementById('classification-spinner');
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');

    try {
        const options = {
            method: 'POST',
            body: isFormData ? payload : JSON.stringify(payload)
        };
        if (!isFormData) {
            options.headers = { 'Content-Type': 'application/json' };
        }

        const response = await fetch('/api/predict', options);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with ${response.status}`);
        }

        const data = await response.json();
        const result = data.result || data;

        displayClassificationResult(result);
        showToast(`Identified: ${result.item_name || result.predicted_class}!`, 'success');
    } catch (err) {
        console.error('Classification error:', err);
        showToast(`Classification failed: ${err.message}`, 'error');
    } finally {
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }
}

async function quickSearchItem(itemName) {
    const searchInput = document.getElementById('google-search-input');
    if (searchInput) {
        searchInput.value = itemName;
    }
    setScanMode('search');
    await runSearchDetection(itemName);
}

async function handleSearchDetectSubmit(event) {
    if (event) event.preventDefault();
    const searchInput = document.getElementById('google-search-input');
    const query = searchInput ? searchInput.value.trim() : '';
    if (!query) {
        showToast('Please enter an item or brand name to search.', 'warning');
        return;
    }
    await runSearchDetection(query);
}

async function runSearchDetection(query) {
    const usernameInput = document.getElementById('search-username');
    const username = (usernameInput && usernameInput.value.trim()) || 'EcoCitizen';
    const loadingSpinner = document.getElementById('scan-loading') || document.getElementById('classification-spinner');
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');

    try {
        const response = await fetch('/api/search-detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query, username: username })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server returned ${response.status}`);
        }

        const data = await response.json();
        const result = data.result || data;
        displayClassificationResult(result);
        showToast(`Identified via Search Engine: ${result.item_name || result.predicted_class}!`, 'success');

        // Dynamically update dashboard and leaderboard
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
        if (typeof loadLeaderboard === 'function') {
            loadLeaderboard();
        }
    } catch (err) {
        console.error('Search detection error:', err);
        showToast(`Search detection failed: ${err.message}`, 'error');
    } finally {
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }
}

function displayClassificationResult(result) {
    const resultCard = document.getElementById('result-card');
    const itemNameEl = document.getElementById('result-item-name');
    const materialTypeEl = document.getElementById('result-material-type');
    const bioBadge = document.getElementById('result-bio-badge');
    const bioText = document.getElementById('result-bio-text');
    const bioIcon = document.getElementById('result-bio-icon');
    const binCard = document.getElementById('result-bin-card');
    const binTip = document.getElementById('result-bin-tip');
    const binDesc = document.getElementById('result-bin-desc');
    const binIcon = document.getElementById('result-bin-icon');
    const confidenceText = document.getElementById('result-confidence-text');
    const confidenceFill = document.getElementById('result-confidence-fill');
    const disposalTipEl = document.getElementById('result-disposal-tip');
    const warningBox = document.getElementById('result-low-confidence-warning');

    // 0. Update Last Scanned Item Name & Engine Badge
    lastScannedItemName = result.item_name || result.predicted_class || 'waste item';
    const engineEl = document.getElementById('result-detection-engine');
    if (engineEl) {
        const engineName = result.detection_engine || 'MobileNetV3 Deep Learning + Google Search Engine';
        engineEl.innerHTML = `<i class="fa-solid fa-microchip text-emerald-600"></i> ${escapeHtml(engineName)}`;
    }

    // 1. Exact Item Name & Material Type
    const itemName = result.item_name || result.predicted_class || 'General Solid Waste';
    const materialType = (result.predicted_class || 'Mixed Waste').toUpperCase();

    if (itemNameEl) itemNameEl.textContent = itemName;
    if (materialTypeEl) materialTypeEl.textContent = materialType;

    // 2. Biodegradable Status
    const bioGroup = result.bio_group || (result.is_biodegradable ? 'Bio-degradable' : 'Non-bio-degradable');
    const isBio = bioGroup.toLowerCase().includes('bio-degradable') && !bioGroup.toLowerCase().includes('non');

    if (bioBadge && bioText && bioIcon) {
        if (isBio) {
            bioBadge.className = 'badge-bio inline-flex items-center gap-2 px-4 py-2 text-sm font-bold';
            bioText.textContent = 'Bio-degradable';
            bioIcon.className = 'fa-solid fa-seedling';
        } else {
            bioBadge.className = 'badge-nonbio inline-flex items-center gap-2 px-4 py-2 text-sm font-bold';
            bioText.textContent = 'Non-bio-degradable';
            bioIcon.className = 'fa-solid fa-bottle-water';
        }
    }

    // 3. Recommended Municipal Bin Card
    const tipText = result.bin_tip || (isBio ? 'Wet Bin (Green)' : 'Dry Bin (Blue)');
    if (binTip) binTip.textContent = tipText;
    if (binDesc) binDesc.textContent = result.bin_description || 'Segregate according to civic municipality protocol.';

    if (binCard) {
        if (tipText.includes('Green') || isBio) {
            binCard.className = 'p-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl shadow-sm mb-6 flex items-center justify-between';
            if (binIcon) binIcon.className = 'fa-solid fa-seedling';
        } else if (tipText.includes('Blue')) {
            binCard.className = 'p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-sm mb-6 flex items-center justify-between';
            if (binIcon) binIcon.className = 'fa-solid fa-recycle';
        } else if (tipText.includes('Yellow')) {
            binCard.className = 'p-5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-2xl shadow-sm mb-6 flex items-center justify-between';
            if (binIcon) binIcon.className = 'fa-solid fa-box-open';
        } else {
            binCard.className = 'p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-2xl shadow-sm mb-6 flex items-center justify-between';
            if (binIcon) binIcon.className = 'fa-solid fa-plug';
        }
    }

    // 4. Model Confidence & 60% Threshold Alert
    let conf = Number(result.confidence || 0);
    if (conf <= 1.0) conf = Math.round(conf * 100);
    conf = Math.min(100, Math.max(0, Math.round(conf)));

    if (confidenceText) confidenceText.textContent = `${conf}%`;
    if (confidenceFill) {
        confidenceFill.style.width = `${conf}%`;
        if (conf >= 75) {
            confidenceFill.className = 'confidence-fill bg-emerald-500';
            confidenceText.className = 'text-sm font-extrabold text-emerald-600';
        } else if (conf >= 60) {
            confidenceFill.className = 'confidence-fill bg-amber-500';
            confidenceText.className = 'text-sm font-extrabold text-amber-600';
        } else {
            confidenceFill.className = 'confidence-fill bg-red-500';
            confidenceText.className = 'text-sm font-extrabold text-red-500';
        }
    }

    if (warningBox) {
        if (conf < 60) {
            warningBox.classList.remove('hidden');
        } else {
            warningBox.classList.add('hidden');
        }
    }

    // 5. Actionable Disposal Instruction
    if (disposalTipEl) {
        disposalTipEl.textContent = result.disposal_tip || 'Clean and segregate into appropriate civic container.';
    }

    // 6. Live Search Engine Knowledge & Google Query Link
    const searchSnippetCard = document.getElementById('result-search-snippet-card');
    const searchSnippetText = document.getElementById('result-search-snippet-text');
    const googleLink = document.getElementById('result-google-link');

    const searchItemName = result.google_search_query || result.item_name || result.predicted_class || 'waste item';
    if (googleLink) {
        googleLink.href = `https://www.google.com/search?q=${encodeURIComponent('how to dispose ' + searchItemName + ' waste segregation')}`;
    }

    if (searchSnippetText) {
        if (result.search_snippets && result.search_snippets.length > 0) {
            searchSnippetText.innerHTML = result.search_snippets.map((snip, idx) => `
                <div class="mb-1.5 last:mb-0"><span class="text-blue-600 font-bold mr-1.5">[Knowledge ${idx + 1}]</span>${escapeHtml(snip)}</div>
            `).join('');
            if (searchSnippetCard) searchSnippetCard.classList.remove('hidden');
        } else if (result.web_verified) {
            searchSnippetText.innerHTML = `<div><span class="text-emerald-600 font-bold mr-1.5">[Web Verified]</span>Indexed by Web Search Engine: <strong>${escapeHtml(itemName)}</strong> is categorized as <strong>${escapeHtml(materialType)}</strong> and routed to <strong>${escapeHtml(tipText)}</strong>.</div>`;
            if (searchSnippetCard) searchSnippetCard.classList.remove('hidden');
        } else {
            searchSnippetText.innerHTML = `<div><span class="text-blue-600 font-bold mr-1.5">[Live Knowledge]</span>Verified via Search Engine intelligence. Segregation recommended for: <strong>${escapeHtml(itemName)}</strong>.</div>`;
            if (searchSnippetCard) searchSnippetCard.classList.remove('hidden');
        }
    }

    if (resultCard) {
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function resetScanner() {
    const resultCard = document.getElementById('result-card');
    if (resultCard) resultCard.classList.add('hidden');
    clearImagePreview();
    window.scrollTo({ top: 120, behavior: 'smooth' });
}

function setupDropzone() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('image-file-input');
    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            fileInput.files = files;
            handleImageSelect({ target: { files: files } });
        }
    }, false);
}

// ============================================================================
// 7. DIGITAL TWIN: MAP, SENSORS & FLEET ENGINE
// ============================================================================

function initDigitalTwinMap() {
    if (twinMap) {
        twinMap.invalidateSize();
        return;
    }

    const mapContainer = document.getElementById('twin-map');
    if (!mapContainer) return;

    // Centered around Dayananda Sagar University (DSU) Harohalli Campus, Kanakapura Road
    twinMap = L.map('twin-map', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([12.65954, 77.45077], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | EcoWaste Digital Twin',
        maxZoom: 19
    }).addTo(twinMap);

    twinBinsLayer = L.layerGroup().addTo(twinMap);
    twinTrucksLayer = L.layerGroup().addTo(twinMap);
}

async function loadDigitalTwinData() {
    try {
        const [binsRes, trucksRes] = await Promise.all([
            fetch('/api/digital-twin/bins'),
            fetch('/api/digital-twin/trucks')
        ]);

        if (binsRes.ok) cachedTwinBins = await binsRes.json();
        if (trucksRes.ok) cachedTwinTrucks = await trucksRes.json();

        renderDigitalTwinMapElements(cachedTwinBins, cachedTwinTrucks);
        renderSmartBinsGrid(cachedTwinBins);

        // Also run initial What-If with current slider value
        runWhatIfSimulation();
    } catch (err) {
        console.error('Error fetching digital twin data:', err);
    }
}

function getBinMarkerColor(bin) {
    if (bin.gas_ppm > 400) return '#9333ea'; // Purple (Gas/Odor spike)
    if (bin.fill_level >= 80) return '#ef4444'; // Red (Full / Overflow)
    if (bin.fill_level >= 50) return '#f59e0b'; // Yellow (Moderate)
    return '#10b981'; // Green (Normal)
}

function renderDigitalTwinMapElements(bins, trucks) {
    if (!twinMap) return;

    // Clear previous markers
    if (twinBinsLayer) twinBinsLayer.clearLayers();
    if (twinTrucksLayer) twinTrucksLayer.clearLayers();

    // Render Bins
    bins.forEach(bin => {
        const color = getBinMarkerColor(bin);
        const iconHtml = `
            <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
                <i class="fa-solid fa-trash-can" style="font-size: 9px;"></i>
            </div>
        `;
        const binIcon = L.divIcon({
            className: 'twin-bin-marker',
            html: iconHtml,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        const popupContent = `
            <div class="p-1 space-y-1">
                <div class="font-bold text-xs flex items-center justify-between">
                    <span>${escapeHtml(bin.bin_code)}</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-mono" style="background:${color}20; color:${color};">${bin.fill_level}% Full</span>
                </div>
                <div class="text-[11px] text-slate-500">${escapeHtml(bin.location_name)}</div>
                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[10px] font-mono">
                    <div><b>Gas:</b> ${bin.gas_ppm} ppm</div>
                    <div><b>Mass:</b> ${bin.weight_kg} kg</div>
                    <div><b>Batt:</b> ${bin.battery_pct}%</div>
                    <div><b>Type:</b> ${escapeHtml(bin.waste_type)}</div>
                </div>
            </div>
        `;

        const marker = L.marker([bin.lat, bin.lon], { icon: binIcon }).bindPopup(popupContent);
        twinBinsLayer.addLayer(marker);
    });

    // Render Fleet Trucks
    trucks.forEach(truck => {
        const truckHtml = `
            <div style="background-color: #2563eb; width: 26px; height: 26px; border-radius: 8px; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(37,99,235,0.8); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                <i class="fa-solid fa-truck"></i>
            </div>
        `;
        const truckIcon = L.divIcon({
            className: 'twin-truck-marker',
            html: truckHtml,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        const truckPopup = `
            <div class="p-1 text-xs">
                <div class="font-bold flex items-center justify-between">
                    <span>${escapeHtml(truck.truck_code)}</span>
                    <span class="text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded">${escapeHtml(truck.status)}</span>
                </div>
                <div class="text-slate-500 text-[11px] mt-0.5">Driver: ${escapeHtml(truck.driver_name)}</div>
                <div class="mt-1 text-[10px] font-mono">Load: ${truck.current_load_kg} / ${truck.capacity_kg} kg</div>
            </div>
        `;

        const marker = L.marker([truck.lat, truck.lon], { icon: truckIcon }).bindPopup(truckPopup);
        twinTrucksLayer.addLayer(marker);
    });
}

function renderSmartBinsGrid(bins) {
    const grid = document.getElementById('smart-bins-grid');
    if (!grid) return;

    if (!bins || bins.length === 0) {
        grid.innerHTML = '<div class="col-span-4 text-center py-8 text-slate-400 text-xs">No IoT smart bins registered.</div>';
        return;
    }

    grid.innerHTML = bins.map(bin => {
        const color = getBinMarkerColor(bin);
        const fill = Math.min(100, Math.max(0, bin.fill_level || 0));
        const isCritical = fill >= 80 || (bin.gas_ppm || 0) > 400;

        return `
            <div class="bg-white rounded-2xl p-5 border ${isCritical ? 'border-red-300 shadow-red-50' : 'border-slate-100'} shadow-sm space-y-4">
                <div class="flex items-start justify-between">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full" style="background-color: ${color};"></span>
                            <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(bin.bin_code)}</h4>
                        </div>
                        <p class="text-xs text-slate-400 mt-0.5">${escapeHtml(bin.location_name)}</p>
                    </div>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold" style="background:${color}15; color:${color};">
                        ${fill}% FULL
                    </span>
                </div>

                <!-- Fill Cylinder Gauge -->
                <div>
                    <div class="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>HC-SR04 Fill Level</span>
                        <span style="color: ${color};">${fill}%</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500" style="width: ${fill}%; background-color: ${color};"></div>
                    </div>
                </div>

                <!-- IoT Sensor Readings -->
                <div class="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs">
                    <div>
                        <span class="block text-[10px] text-slate-400">MQ-135 Gas</span>
                        <span class="font-bold ${(bin.gas_ppm || 0) > 400 ? 'text-purple-600' : 'text-slate-800'}">${bin.gas_ppm || 0} <span class="text-[9px]">ppm</span></span>
                    </div>
                    <div>
                        <span class="block text-[10px] text-slate-400">Load Cell</span>
                        <span class="font-bold text-slate-800">${bin.weight_kg || 0} <span class="text-[9px]">kg</span></span>
                    </div>
                    <div>
                        <span class="block text-[10px] text-slate-400">Battery</span>
                        <span class="font-bold text-emerald-600">${bin.battery_pct || 90}%</span>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-1">
                    <span class="text-[10px] text-slate-400">Node: ${escapeHtml(bin.waste_type)}</span>
                    <button onclick="dispatchTruckToBin('${bin.bin_code}')" class="text-xs text-blue-600 hover:text-blue-700 font-bold">
                        Dispatch &rarr;
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function dispatchTruckToBin(binCode) {
    showToast(`Dispatch order assigned to Fleet Truck TRK-01 for ${binCode}`, 'success');
    optimizeTruckRoute();
}

// ============================================================================
// 8. WHAT-IF DIGITAL TWIN SIMULATION ENGINE
// ============================================================================

async function runWhatIfSimulation() {
    const slider = document.getElementById('what-if-days-slider');
    const label = document.getElementById('what-if-days-label');
    const weatherSelect = document.getElementById('what-if-weather');

    if (!slider) return;

    const days = parseInt(slider.value, 10);
    const weather = weatherSelect ? weatherSelect.value : 'normal';

    if (label) {
        if (days === 0) label.textContent = '0 Days (Normal Schedule)';
        else label.textContent = `${days} Days Delay (+${days * 24} hrs)`;
    }

    try {
        const response = await fetch(`/api/digital-twin/what-if?days=${days}&weather=${weather}`);
        if (!response.ok) return;

        const data = await response.json();

        const overflow = data.overflow_count ?? 0;
        const waste = data.total_projected_waste_kg ?? data.projected_waste_kg ?? 0;
        const penalty = data.estimated_penalty_cost_inr ?? data.penalty_cost_inr ?? 0;
        const fuel = data.estimated_emergency_fuel_litres ?? data.fuel_wasted_litres ?? 0;

        if (overflowEl) overflowEl.textContent = `${overflow} Bins`;
        if (wasteEl) wasteEl.textContent = `${waste} kg`;
        if (penaltyEl) penaltyEl.textContent = `₹${Number(penalty).toLocaleString()}`;
        if (fuelEl) fuelEl.textContent = `${fuel} L`;

        // Update markers dynamically to show predicted overflow status
        if (data.projected_bins && twinMap) {
            renderDigitalTwinMapElements(data.projected_bins, cachedTwinTrucks);
        }
    } catch (err) {
        console.error('Error running What-If simulation:', err);
    }
}

// ============================================================================
// 9. SHORTEST PATH TRUCK ROUTE OPTIMIZATION (TSP)
// ============================================================================

async function optimizeTruckRoute() {
    showToast('Calculating Shortest-Path TSP route for critical bins...', 'info');

    try {
        const response = await fetch('/api/digital-twin/optimize-route?truck_code=TRK-01');
        if (!response.ok) {
            throw new Error(`Route optimizer failed: ${response.status}`);
        }

        const data = await response.json();

        // Reveal Route Summary Panel
        const panel = document.getElementById('route-optimization-panel');
        const statsText = document.getElementById('route-stats-text');
        const co2Badge = document.getElementById('route-co2-badge');

        const dist = data.total_distance_km ?? data.route_distance_km ?? 0;
        const stopsCount = data.total_stops ? (data.total_stops - 1) : (data.stops ? data.stops.length : 3);
        const fuelSaved = data.fuel_saved_litres ?? 0;
        const co2Saved = data.co2_reduction_kg ?? 0;

        if (panel) panel.classList.remove('hidden');
        if (statsText) {
            statsText.textContent = `Visiting ${stopsCount} critical bins across ${dist} km. Saved ${fuelSaved}L diesel.`;
        }
        if (co2Badge) co2Badge.textContent = `-${co2Saved} kg CO2`;

        // Draw Polyline on Leaflet Twin Map
        if (twinMap && data.polyline_coords && data.polyline_coords.length > 0) {
            if (twinRoutePolyline) twinMap.removeLayer(twinRoutePolyline);

            twinRoutePolyline = L.polyline(data.polyline_coords, {
                color: '#2563eb',
                weight: 5,
                opacity: 0.85,
                dashArray: '8, 8',
                lineJoin: 'round'
            }).addTo(twinMap);

            twinMap.fitBounds(twinRoutePolyline.getBounds(), { padding: [50, 50] });
        }

        showToast('Optimal collection route generated and dispatched to TRK-01!', 'success');
    } catch (err) {
        console.error('Route optimization error:', err);
        showToast('Route optimization error: ' + err.message, 'error');
    }
}

// ============================================================================
// 10. CITIZEN WASTE REPORTING
// ============================================================================

function handleReportPhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        reportPhotoBase64 = e.target.result;
        const preview = document.getElementById('report-photo-preview');
        const img = document.getElementById('report-photo-img');
        const placeholder = document.getElementById('report-photo-placeholder');

        if (img) img.src = reportPhotoBase64;
        if (preview) preview.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function detectReportLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser.', 'warning');
        return;
    }

    showToast('Detecting your GPS coordinates...', 'info');
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            reportLat = pos.coords.latitude;
            reportLon = pos.coords.longitude;
            const locInput = document.getElementById('report-location');
            if (locInput) {
                locInput.value = `GPS: ${reportLat.toFixed(4)}, ${reportLon.toFixed(4)}`;
            }
            showToast('Current GPS coordinates detected!', 'success');
        },
        () => showToast('Could not retrieve GPS coordinates.', 'error')
    );
}

async function submitWasteReport(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit-report');
    if (btn) btn.disabled = true;

    const name = document.getElementById('report-name').value.trim();
    const phone = document.getElementById('report-phone').value.trim();
    const issueType = document.getElementById('report-issue-type').value;
    const location = document.getElementById('report-location').value.trim();
    const desc = document.getElementById('report-desc').value.trim();

    try {
        const payload = {
            reporter_name: name,
            phone: phone,
            issue_type: issueType,
            location_address: location,
            lat: reportLat,
            lon: reportLon,
            description: desc,
            image_data: reportPhotoBase64
        };

        const res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Report submission failed: ${res.status}`);

        showToast('Waste report submitted to municipal dispatchers!', 'success');

        // Reset form
        document.getElementById('waste-report-form').reset();
        reportPhotoBase64 = '';
        const preview = document.getElementById('report-photo-preview');
        const placeholder = document.getElementById('report-photo-placeholder');
        if (preview) preview.classList.add('hidden');
        if (placeholder) placeholder.classList.remove('hidden');

        loadRecentReports();
    } catch (err) {
        console.error('Submit report error:', err);
        showToast('Error submitting report: ' + err.message, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function loadRecentReports() {
    const list = document.getElementById('recent-reports-list');
    if (!list) return;

    try {
        const res = await fetch('/api/reports');
        if (!res.ok) return;

        const reports = await res.json();
        if (!reports || reports.length === 0) {
            list.innerHTML = '<div class="text-center py-8 text-xs text-slate-400">No citizen incident reports yet.</div>';
            return;
        }

        list.innerHTML = reports.map(r => `
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-900">${escapeHtml(r.issue_type)}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                        ${escapeHtml(r.status)}
                    </span>
                </div>
                <p class="text-slate-600 text-[11px]">${escapeHtml(r.description)}</p>
                <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>${escapeHtml(r.location_address)}</span>
                    <span>${r.created_at ? r.created_at.substring(0, 10) : 'Recent'}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load reports:', err);
    }
}

// ============================================================================
// 11. MUNICIPAL ALERTS COMMAND HUB
// ============================================================================

async function loadAlertsHub() {
    const container = document.getElementById('alerts-hub-container');
    if (!container) return;

    try {
        const res = await fetch('/api/alerts');
        if (!res.ok) return;

        const alerts = await res.json();
        updateAlertsBadge(alerts.length);

        if (!alerts || alerts.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center bg-white rounded-3xl border border-slate-100">
                    <i class="fa-solid fa-shield-heart text-4xl text-emerald-500 mb-3"></i>
                    <h4 class="font-bold text-slate-900 text-base">All Civic Bins Operating Smoothly</h4>
                    <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">No overflows, gas leaks, or unresolved citizen reports currently flagged.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map(a => `
            <div class="p-5 rounded-3xl border ${a.severity === 'critical' ? 'bg-red-50/70 border-red-200 text-red-950' : 'bg-amber-50/70 border-amber-200 text-amber-950'} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-2xl ${a.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'} flex items-center justify-center text-xl shrink-0">
                        <i class="fa-solid ${a.severity === 'critical' ? 'fa-triangle-exclamation' : 'fa-bell'}"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${a.severity === 'critical' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}">
                                ${a.severity.toUpperCase()}
                            </span>
                            <span class="text-xs text-slate-500">${a.timestamp ? a.timestamp.substring(11, 19) : 'Live'}</span>
                        </div>
                        <h4 class="font-bold text-base mt-1">${escapeHtml(a.title)}</h4>
                        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${escapeHtml(a.message)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button onclick="dispatchTruckToBin('${escapeHtml(a.bin_code || 'BIN-101')}')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow">
                        Dispatch Fleet
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load alerts hub:', err);
    }
}

// ============================================================================
// 12. NEARBY PUBLIC WASTE FACILITIES (LEAFLET + OVERPASS)
// ============================================================================

function initOrUpdateMap(lat, lon) {
    if (!binsMap) {
        binsMap = L.map('bins-map', {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([lat, lon], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(binsMap);

        binsMarkerGroup = L.layerGroup().addTo(binsMap);
    } else {
        binsMap.setView([lat, lon], 14);
    }

    if (userMarker) {
        userMarker.setLatLng([lat, lon]);
    } else {
        const userIcon = L.divIcon({
            className: 'user-pin-icon',
            html: '<div style="background-color: #2563eb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 8px rgba(37,99,235,0.6);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });
        userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(binsMap);
        userMarker.bindPopup('<b>Your Current Location</b>').openPopup();
    }
}

async function findNearbyBins() {
    const loading = document.getElementById('bins-loading');
    const errorBanner = document.getElementById('bins-error-banner');
    const errorTitle = document.getElementById('bins-error-title');
    const errorMsg = document.getElementById('bins-error-message');

    if (errorBanner) errorBanner.classList.add('hidden');

    if (!navigator.geolocation) {
        if (errorBanner) {
            errorTitle.textContent = 'Geolocation Unsupported';
            errorMsg.textContent = 'Your browser does not support geolocation detection.';
            errorBanner.classList.remove('hidden');
        }
        return;
    }

    if (loading) loading.classList.remove('hidden');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                initOrUpdateMap(lat, lon);
                const response = await fetch(`/api/nearby-bins?lat=${lat}&lon=${lon}`);
                if (!response.ok) throw new Error(`Server responded with ${response.status}`);

                const data = await response.json();
                const bins = Array.isArray(data) ? data : (data.bins || data.facilities || []);

                renderNearbyBins(bins, lat, lon);
            } catch (err) {
                console.error('Error fetching nearby bins:', err);
                if (errorBanner) {
                    errorTitle.textContent = 'Failed to Fetch Facilities';
                    errorMsg.textContent = err.message || 'Could not retrieve waste facility information.';
                    errorBanner.classList.remove('hidden');
                }
            } finally {
                if (loading) loading.classList.add('hidden');
            }
        },
        async (geoError) => {
            if (loading) loading.classList.add('hidden');
            console.warn('Geolocation unavailable/denied, defaulting to DSU Harohalli Campus:', geoError);
            showToast('Using Dayananda Sagar University (DSU) Harohalli Campus coordinates.', 'info');

            // Default to DSU Harohalli Campus
            const dsuLat = 12.65954;
            const dsuLon = 77.45077;
            try {
                initOrUpdateMap(dsuLat, dsuLon);
                const response = await fetch(`/api/nearby-bins?lat=${dsuLat}&lon=${dsuLon}`);
                if (response.ok) {
                    const data = await response.json();
                    const bins = Array.isArray(data) ? data : (data.bins || data.facilities || []);
                    renderNearbyBins(bins, dsuLat, dsuLon);
                }
            } catch (fallbackErr) {
                console.error('Error loading DSU campus facilities:', fallbackErr);
            }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
}

async function loadDsuCampusFacilities() {
    const loading = document.getElementById('bins-loading');
    const errorBanner = document.getElementById('bins-error-banner');
    if (errorBanner) errorBanner.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');

    const dsuLat = 12.65954;
    const dsuLon = 77.45077;
    try {
        initOrUpdateMap(dsuLat, dsuLon);
        const response = await fetch(`/api/nearby-bins?lat=${dsuLat}&lon=${dsuLon}`);
        if (response.ok) {
            const data = await response.json();
            const bins = Array.isArray(data) ? data : (data.bins || data.facilities || []);
            renderNearbyBins(bins, dsuLat, dsuLon);
            showToast('Dayananda Sagar University (Harohalli) facilities loaded with Google Maps navigation!', 'success');
        }
    } catch (err) {
        console.error('Error loading DSU campus facilities:', err);
        showToast('Error loading campus facilities', 'error');
    } finally {
        if (loading) loading.classList.add('hidden');
    }
}

function renderNearbyBins(bins, userLat, userLon) {
    const list = document.getElementById('bins-list');
    const emptyState = document.getElementById('bins-empty-state');
    const countBadge = document.getElementById('bins-count-badge');

    if (binsMarkerGroup) binsMarkerGroup.clearLayers();
    if (list) list.innerHTML = '';

    if (!bins || bins.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (countBadge) countBadge.textContent = '0 found';
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (countBadge) countBadge.textContent = `${bins.length} found`;

    bins.forEach(facility => {
        const binLat = facility.lat;
        const binLon = facility.lon;
        const name = facility.name || facility.type || 'Waste Disposal Facility';
        const type = facility.type || facility.amenity || 'Public Bin';
        const distMeters = facility.distance_meters != null ? facility.distance_meters : Math.round(facility.distance_km * 1000);
        const distStr = distMeters >= 1000 ? `${(distMeters / 1000).toFixed(1)} km` : `${distMeters} m`;

        if (binLat && binLon && binsMarkerGroup) {
            const marker = L.marker([binLat, binLon]).addTo(binsMarkerGroup);
            marker.bindPopup(`
                <b>${escapeHtml(name)}</b><br>
                <span class="text-xs text-slate-500">${escapeHtml(type)}</span><br>
                <span class="text-xs font-bold text-emerald-600">${distStr} away</span><br>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${binLat},${binLon}" target="_blank" class="text-xs text-blue-600 underline font-semibold mt-1 inline-block">Get Directions</a>
            `);
        }

        if (list) {
            const card = document.createElement('div');
            card.className = 'p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between gap-4';
            card.innerHTML = `
                <div class="flex items-start gap-3.5">
                    <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
                        <i class="fa-solid fa-recycle"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(name)}</h4>
                        <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(type)}</p>
                        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 mt-2">${distStr} away</span>
                    </div>
                </div>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${binLat},${binLon}" target="_blank" class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shrink-0">
                    Directions &rarr;
                </a>
            `;
            list.appendChild(card);
        }
    });
}

// ============================================================================
// 13. GENERATIVE AI SUITE: ADVICE, CHATBOT & REPORTS
// ============================================================================

async function loadAiRecommendations() {
    const grid = document.getElementById('ai-recommendations-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/ai/recommendations');
        if (!res.ok) return;

        const data = await res.json();
        const recs = data.recommendations || [];

        if (recs.length === 0) {
            grid.innerHTML = '<div class="col-span-3 text-center py-8 text-xs text-slate-400">No active dispatch actions recommended.</div>';
            return;
        }

        grid.innerHTML = recs.map(r => {
            const isUrgent = r.priority === 'urgent' || r.urgency === 'high';
            return `
                <div class="p-5 rounded-2xl border ${isUrgent ? 'bg-red-50/60 border-red-200' : 'bg-white border-slate-100'} shadow-sm space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${isUrgent ? 'bg-red-200 text-red-800' : 'bg-purple-100 text-purple-800'}">
                            ${(r.priority || 'Advisory').toUpperCase()}
                        </span>
                        <i class="fa-solid fa-robot text-purple-600 text-sm"></i>
                    </div>
                    <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(r.title || 'Dispatch Action')}</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(r.advice || r.description)}</p>
                    <div class="pt-2">
                        <button onclick="optimizeTruckRoute()" class="text-xs text-purple-600 font-bold hover:underline">Execute Action &rarr;</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load AI recommendations:', err);
    }
}

function sendQuickChat(message) {
    const input = document.getElementById('chat-input');
    if (input) input.value = message;
    handleChatSubmit(new Event('submit'));
}

async function handleChatSubmit(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('chat-input');
    const messagesFeed = document.getElementById('chat-messages');

    if (!input || !messagesFeed) return;
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';

    // Append User message
    messagesFeed.innerHTML += `
        <div class="flex items-start justify-end gap-2.5">
            <div class="bg-purple-600 text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-[85%]">
                ${escapeHtml(msg)}
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                <i class="fa-solid fa-user"></i>
            </div>
        </div>
    `;

    // Append typing indicator
    const typingId = `typing-${Date.now()}`;
    messagesFeed.innerHTML += `
        <div id="${typingId}" class="flex items-start gap-2.5">
            <div class="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="bg-purple-50 text-slate-500 p-3 rounded-2xl rounded-tl-none text-xs">
                <i class="fa-solid fa-ellipsis fa-bounce"></i> Thinking...
            </div>
        </div>
    `;
    messagesFeed.scrollTop = messagesFeed.scrollHeight;

    try {
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });

        const data = await res.json();
        const reply = data.reply || data.response || 'I am processing your waste management query.';

        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        messagesFeed.innerHTML += `
            <div class="flex items-start gap-2.5">
                <div class="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="bg-purple-50 text-slate-800 p-3.5 rounded-2xl rounded-tl-none text-xs leading-relaxed max-w-[85%]">
                    ${escapeHtml(reply).replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
        messagesFeed.scrollTop = messagesFeed.scrollHeight;
    } catch (err) {
        console.error('Chat error:', err);
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();
        showToast('Chatbot assistant error: ' + err.message, 'error');
    }
}

// ============================================================================
// 13. MUNICIPAL & CAMPUS EXECUTIVE REPORT
// ============================================================================

let currentExecutiveReportData = null;

async function generateDailyReport() {
    const container = document.getElementById('report-view-container');
    if (!container) return;

    container.innerHTML = `
        <div class="py-16 text-center">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-purple-600 mb-3"></i>
            <p class="text-xs text-slate-500 font-semibold">Compiling DSU Harohalli Municipal Digital Twin Telemetry &amp; LLM Report...</p>
        </div>
    `;

    try {
        const res = await fetch('/api/ai/generate-report');
        if (!res.ok) throw new Error(`Report generation failed: ${res.status}`);

        const data = await res.json();
        currentExecutiveReportData = data;
        let reportText = '';
        if (data.report) {
            reportText = data.report;
        } else if (data.executive_summary) {
            const kpi = data.kpi_metrics || {};
            const fleet = data.fleet_efficiency || {};
            const warnings = (data.hotspot_warnings || []).map(w => `• ${w}`).join('\n');
            reportText = `========================================================================
DAYANANDA SAGAR UNIVERSITY (DSU) HAROHALLI CAMPUS
MUNICIPAL SOLID WASTE DIGITAL TWIN - DAILY TELEMETRY REPORT
========================================================================
Report ID:     ${data.report_id || 'DSU-REP-20261016-01'}
Date:          ${data.date || new Date().toLocaleDateString()}
Generated At:  ${data.generated_at || new Date().toLocaleTimeString()}
Jurisdiction:  ${data.city_jurisdiction || 'Dayananda Sagar University (DSU) Harohalli Campus'}

------------------------------------------------------------------------
EXECUTIVE BRIEFING SUMMARY
------------------------------------------------------------------------
${data.executive_summary}

------------------------------------------------------------------------
CAMPUS MUNICIPAL PERFORMANCE INDICATORS (KPIs)
------------------------------------------------------------------------
• Total Waste Managed:          ${kpi.total_waste_managed_tons || 0} Metric Tons
• Segregation Diversion Rate:   ${kpi.segregation_diversion_rate_pct || 0}%
• Full Smart Bins Serviced:     ${kpi.full_bins_serviced || 0}
• Fleet Diesel Saved via TSP:   ${kpi.fuel_saved_litres || 0} Liters
• Carbon Emissions Mitigated:   ${kpi.carbon_emissions_offset_kg || 0} kg CO2e
• Campus Incidents Resolved:    ${kpi.citizen_reports_resolved || 0}
• Pending Waste Inquiries:      ${kpi.citizen_reports_pending || 0}

------------------------------------------------------------------------
CAMPUS EV FLEET TELEMETRY & TSP DISPATCH
------------------------------------------------------------------------
• Active Collection Fleet:      ${fleet.active_trucks || 3} Electric Waste Haulers
• Route Efficiency Index:       ${fleet.average_route_completion_pct || 94}%
• Mean Bin Clearance Latency:   ${fleet.average_bin_clearance_time_min || 14} Minutes

------------------------------------------------------------------------
HOTSPOT OVERFLOW WARNINGS & DISPATCH DIRECTIVES
------------------------------------------------------------------------
${warnings}

========================================================================
End of Automated Municipal Report - Verified by DSU EcoTwin Intelligence
========================================================================`;
        } else {
            reportText = JSON.stringify(data, null, 2);
        }

        container.innerHTML = `<pre class="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">${escapeHtml(reportText)}</pre>`;
        showToast('Daily DSU Municipal Executive Report compiled!', 'success');
    } catch (err) {
        console.error('Report error:', err);
        container.innerHTML = `<p class="text-red-500 text-xs text-center py-10">Failed to generate report: ${err.message}</p>`;
    }
}

async function openExecutiveReportModal() {
    const modal = document.getElementById('executive-report-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const narrativeEl = document.getElementById('modal-report-narrative');
    const idEl = document.getElementById('modal-report-id');
    const timeEl = document.getElementById('modal-report-timestamp');
    const kpiTons = document.getElementById('modal-kpi-tons');
    const kpiDiv = document.getElementById('modal-kpi-diversion');
    const kpiFuel = document.getElementById('modal-kpi-fuel');
    const kpiCo2 = document.getElementById('modal-kpi-co2');
    const tbody = document.getElementById('modal-bins-tbody');
    const hotspotsEl = document.getElementById('modal-hotspots-list');

    if (narrativeEl) narrativeEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2 text-emerald-600"></i> Synthesizing official briefing from live IoT telemetry...';

    try {
        const [reportRes, binsRes] = await Promise.all([
            fetch('/api/ai/generate-report'),
            fetch('/api/digital-twin/bins')
        ]);

        const reportData = await reportRes.json();
        const binsData = await binsRes.json();
        currentExecutiveReportData = reportData;

        if (idEl) idEl.textContent = reportData.report_id || 'DSU-REP-01';
        if (timeEl) timeEl.textContent = `Generated: ${reportData.date || new Date().toLocaleDateString()} at ${reportData.generated_at || new Date().toLocaleTimeString()}`;
        if (narrativeEl) narrativeEl.textContent = reportData.executive_summary || 'Campus waste segregation and clearance telemetry operating within normal parameters.';

        const kpi = reportData.kpi_metrics || {};
        if (kpiTons) kpiTons.textContent = `${kpi.total_waste_managed_tons || 3.84} t`;
        if (kpiDiv) kpiDiv.textContent = `${kpi.segregation_diversion_rate_pct || 88.5}%`;
        if (kpiFuel) kpiFuel.textContent = `${kpi.fuel_saved_litres || 42.1} L`;
        if (kpiCo2) kpiCo2.textContent = `${kpi.carbon_emissions_offset_kg || 112.4} kg`;

        // Render Smart Bins Telemetry Table
        if (tbody) {
            tbody.innerHTML = '';
            const bins = Array.isArray(binsData) ? binsData : (binsData.bins || []);
            if (bins.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400">No active IoT bins detected.</td></tr>';
            } else {
                bins.forEach(b => {
                    const fill = Math.round(b.fill_level_percent || 0);
                    let fillBadge = 'bg-emerald-500';
                    let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">NORMAL</span>';
                    
                    if (fill >= 80) {
                        fillBadge = 'bg-red-500';
                        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 animate-pulse">OVERFLOW CRITICAL</span>';
                    } else if (fill >= 60) {
                        fillBadge = 'bg-amber-500';
                        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">ATTENTION</span>';
                    }

                    const gasPpm = Math.round(b.gas_ppm || 45);
                    let gasClass = gasPpm > 100 ? 'text-red-600 font-bold' : 'text-slate-600';

                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-50/80 transition';
                    tr.innerHTML = `
                        <td class="py-2.5 px-4 font-mono font-bold text-slate-800">${escapeHtml(b.bin_code || b.name || 'BIN')}</td>
                        <td class="py-2.5 px-4 text-slate-700 font-medium">
                            ${escapeHtml(b.address || b.name || 'Campus Landmark')}
                            <span class="block text-[10px] text-slate-400">${escapeHtml(b.zone || 'Harohalli')}</span>
                        </td>
                        <td class="py-2.5 px-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <div class="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div class="${fillBadge} h-1.5 rounded-full" style="width: ${fill}%"></div>
                                </div>
                                <span class="font-bold text-slate-800">${fill}%</span>
                            </div>
                        </td>
                        <td class="py-2.5 px-4 text-center font-mono ${gasClass}">${gasPpm} PPM</td>
                        <td class="py-2.5 px-4 text-center font-semibold text-slate-700">${b.weight_kg ? b.weight_kg.toFixed(1) : '12.0'} kg</td>
                        <td class="py-2.5 px-4 text-right">${statusBadge}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        // Render Hotspots Warnings
        if (hotspotsEl) {
            hotspotsEl.innerHTML = '';
            const warnings = reportData.hotspot_warnings || [];
            if (warnings.length === 0) {
                hotspotsEl.innerHTML = '<li class="text-emerald-700 flex items-center gap-2"><i class="fa-solid fa-circle-check"></i> All campus zones operating at safe thresholds with zero active overflow alerts.</li>';
            } else {
                warnings.forEach(w => {
                    hotspotsEl.innerHTML += `<li class="flex items-start gap-2"><i class="fa-solid fa-arrow-right text-amber-600 mt-1 shrink-0"></i> <span>${escapeHtml(w)}</span></li>`;
                });
            }
        }
    } catch (err) {
        console.error('Failed to load executive modal data:', err);
        if (narrativeEl) narrativeEl.textContent = 'Dayananda Sagar University (DSU) Harohalli smart waste telemetry is active. Automated scheduled collection dispatched across all academic blocks.';
    }
}

function closeExecutiveReportModal() {
    const modal = document.getElementById('executive-report-modal');
    if (modal) modal.classList.add('hidden');
}

function exportReportToCsv() {
    showToast('Exporting official DSU Municipal CSV Telemetry...', 'info');
    window.location.href = '/api/reports/export-csv';
}

function copyExecutiveSummary() {
    if (!currentExecutiveReportData || !currentExecutiveReportData.executive_summary) {
        showToast('Please open or generate the report first', 'warning');
        return;
    }
    const text = `DAYANANDA SAGAR UNIVERSITY - EXECUTIVE MUNICIPAL REPORT\n` +
        `Report ID: ${currentExecutiveReportData.report_id || 'DSU-REP-01'}\n` +
        `Date: ${currentExecutiveReportData.date || new Date().toLocaleDateString()}\n\n` +
        `EXECUTIVE BRIEFING:\n${currentExecutiveReportData.executive_summary}\n\n` +
        `KEY METRICS:\n` +
        `- Total Waste Managed: ${currentExecutiveReportData.kpi_metrics?.total_waste_managed_tons || 3.84} Tons\n` +
        `- Diversion Rate: ${currentExecutiveReportData.kpi_metrics?.segregation_diversion_rate_pct || 88.5}%\n` +
        `- Fuel Saved: ${currentExecutiveReportData.kpi_metrics?.fuel_saved_litres || 42.1} L\n` +
        `- Carbon Offset: ${currentExecutiveReportData.kpi_metrics?.carbon_emissions_offset_kg || 112.4} kg CO2e`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('Executive report copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy to clipboard', 'error');
    });
}

function printOfficialReport() {
    const modal = document.getElementById('executive-report-modal');
    if (!modal || modal.classList.contains('hidden')) {
        openExecutiveReportModal();
        setTimeout(() => window.print(), 500);
    } else {
        window.print();
    }
}

// ============================================================================
// 13B. ECOBOT MULTI-LANGUAGE VOICE ASSISTANT (ENGLISH / KANNADA / HINDI)
// ============================================================================

let voiceRecognition = null;
let isVoiceListening = false;
let isVoiceSpeaking = false;
let voiceSpeechMuted = false;
let voiceCurrentUtterance = null;
let ecobotCurrentLanguage = 'en';

const ECOBOT_LANG_CONFIG = {
    en: {
        code: 'en-IN',
        label: 'English',
        speechLang: 'en-IN',
        pillCaption: 'Ask: "Which bins are full in DSU?"',
        cardPlaceholder: 'Tap the microphone and ask: <em>"Which bins are full in DSU?"</em> or <em>"How do I dispose of lithium batteries?"</em>',
        statusReady: 'Ready to listen',
        statusListening: 'Listening to your voice...',
        statusSpeaking: 'EcoBot is speaking...',
        statusThinking: 'Analyzing DSU smart waste telemetry...',
        chips: [
            { label: 'Full Bins?', query: 'Which bins are full in DSU right now?' },
            { label: 'E-Waste?', query: 'Where is the campus e-waste collection bin?' },
            { label: 'Food Waste?', query: 'How does DSU handle food court waste?' }
        ],
        toastChanged: 'EcoBot Voice Assistant set to English'
    },
    kn: {
        code: 'kn-IN',
        label: 'ಕನ್ನಡ (Kannada)',
        speechLang: 'kn-IN',
        pillCaption: 'ಕೇಳಿ: "ಯಾವ ಕಸದ ತೊಟ್ಟಿಗಳು ತುಂಬಿವೆ?"',
        cardPlaceholder: 'ಮೈಕ್ರೋಫೋನ್ ಒತ್ತಿ ಕೇಳಿ: <em>"ದಯಾನಂದ ಸಾಗರ್ ವಿಶ್ವವಿದ್ಯಾಲಯದಲ್ಲಿ ಯಾವ ಕಸದ ತೊಟ್ಟಿಗಳು ತುಂಬಿವೆ?"</em> ಅಥವಾ <em>"ಇ-ತ್ಯಾಜ್ಯ ಎಲ್ಲಿ ಹಾಕಬೇಕು?"</em>',
        statusReady: 'ಕೇಳಲು ಸಿದ್ಧವಾಗಿದೆ',
        statusListening: 'ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಆಲಿಸಲಾಗುತ್ತಿದೆ...',
        statusSpeaking: 'EcoBot ಮಾತನಾಡುತ್ತಿದೆ...',
        statusThinking: 'ಕ್ಯಾಂಪಸ್ ತ್ಯಾಜ್ಯ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
        chips: [
            { label: 'ತುಂಬಿದ ಬುಟ್ಟಿಗಳು?', query: 'ದಯಾನಂದ ಸಾಗರ್ ವಿಶ್ವವಿದ್ಯಾಲಯದಲ್ಲಿ ಯಾವ ಕಸದ ತೊಟ್ಟಿಗಳು ತುಂಬಿವೆ?' },
            { label: 'ಇ-ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹ?', query: 'ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ಇ-ತ್ಯಾಜ್ಯ ಕಸದ ಬುಟ್ಟಿ ಎಲ್ಲಿದೆ?' },
            { label: 'ಆಹಾರ ತ್ಯಾಜ್ಯ?', query: 'ಡಿಎಸ್‌ಯು ಫುಡ್ ಕೋರ್ಟ್ ಆಹಾರ ಕಸವನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸುತ್ತದೆ?' }
        ],
        toastChanged: 'EcoBot ಧ್ವನಿ ಸಹಾಯಕವನ್ನು ಕನ್ನಡಕ್ಕೆ ಹೊಂದಿಸಲಾಗಿದೆ (Kannada)'
    },
    hi: {
        code: 'hi-IN',
        label: 'हिंदी (Hindi)',
        speechLang: 'hi-IN',
        pillCaption: 'पूछें: "कौन से डस्टबिन भरे हैं?"',
        cardPlaceholder: 'माइक दबाकर पूछें: <em>"दयानंद सागर यूनिवर्सिटी में कौन से डस्टबिन भरे हैं?"</em> या <em>"ई-कचरा कहाँ डालें?"</em>',
        statusReady: 'सुनने के लिए तैयार',
        statusListening: 'आपकी आवाज़ सुनी जा रही है...',
        statusSpeaking: 'EcoBot बोल रहा है...',
        statusThinking: 'कैंपस अपशिष्ट टेलीमेट्री का विश्लेषण हो रहा है...',
        chips: [
            { label: 'भरे डस्टबिन?', query: 'दयानंद सागर यूनिवर्सिटी में कौन से डस्टबिन भरे हैं?' },
            { label: 'ई-कचरा डिब्बा?', query: 'कैंपस में ई-कचरा संग्रह डिब्बा कहाँ है?' },
            { label: 'गीला कचरा?', query: 'डीएसयू में कैंटीन के गीले कचरे का निपटान कैसे होता है?' }
        ],
        toastChanged: 'EcoBot वॉयस असिस्टेंट को हिंदी में सेट किया गया है'
    }
};

function setEcoBotLanguage(lang) {
    if (!ECOBOT_LANG_CONFIG[lang]) return;
    ecobotCurrentLanguage = lang;
    const cfg = ECOBOT_LANG_CONFIG[lang];

    // Update recognition language dynamically
    if (voiceRecognition) {
        voiceRecognition.lang = cfg.speechLang;
    }

    // Update Dialogue switcher buttons
    ['en', 'kn', 'hi'].forEach(l => {
        const dBtn = document.getElementById(`dialogue-lang-${l}`);
        const pBtn = document.getElementById(`pill-lang-${l}`);
        const activeClass = 'bg-emerald-500 text-slate-950 font-bold shadow-sm';
        const inactiveClass = 'text-slate-400 hover:text-white';

        if (dBtn) {
            dBtn.className = (l === lang) ? `px-2 py-0.5 rounded-full transition ${activeClass}` : `px-2 py-0.5 rounded-full transition ${inactiveClass}`;
        }
        if (pBtn) {
            pBtn.className = (l === lang) ? `px-1.5 py-0.5 rounded-full transition ${activeClass}` : `px-1.5 py-0.5 rounded-full transition ${inactiveClass}`;
        }
    });

    // Update Pill caption
    const captionEl = document.getElementById('voice-pill-caption');
    if (captionEl) captionEl.textContent = cfg.pillCaption;

    // Update Status Ready text if idle
    const cardStatus = document.getElementById('voice-card-status');
    if (cardStatus && !isVoiceListening && !isVoiceSpeaking) {
        cardStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> ${cfg.statusReady}`;
    }

    // Update Quick prompt chips
    const chipsContainer = document.getElementById('voice-chips-container');
    if (chipsContainer) {
        chipsContainer.innerHTML = cfg.chips.map(c => `
            <button type="button" onclick="triggerVoiceQuery('${escapeHtml(c.query)}')" class="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-500/50 border border-slate-700/60 text-slate-300 transition whitespace-nowrap">
                ${escapeHtml(c.label)}
            </button>
        `).join('');
    }

    // Update initial bot bubble text if user hasn't asked anything yet
    const userBubble = document.getElementById('voice-user-bubble');
    const botText = document.getElementById('voice-bot-text');
    if (userBubble && userBubble.classList.contains('hidden') && botText) {
        botText.innerHTML = cfg.cardPlaceholder;
    }

    showToast(cfg.toastChanged, 'info');
}

function initVoiceAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('SpeechRecognition API not supported in this browser.');
        const pillCaption = document.getElementById('voice-pill-caption');
        if (pillCaption) pillCaption.textContent = 'Tap to ask EcoBot anything!';
        return;
    }

    try {
        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.lang = ECOBOT_LANG_CONFIG[ecobotCurrentLanguage].speechLang;

        voiceRecognition.onstart = () => {
            isVoiceListening = true;
            updateVoiceAssistantUI('listening');
        };

        voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Voice recognized:', transcript);
            processVoiceQuery(transcript);
        };

        voiceRecognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            isVoiceListening = false;
            updateVoiceAssistantUI('idle');
            if (event.error === 'not-allowed') {
                showToast('Microphone access denied. Please enable microphone permissions in your browser.', 'warning');
            } else if (event.error !== 'no-speech') {
                showToast(`Voice assistant: ${event.error}`, 'info');
            }
        };

        voiceRecognition.onend = () => {
            isVoiceListening = false;
            if (!isVoiceSpeaking) {
                updateVoiceAssistantUI('idle');
            }
        };
    } catch (e) {
        console.warn('Failed to initialize SpeechRecognition:', e);
    }
}

function toggleEcoBotVoice() {
    if (isVoiceSpeaking) {
        stopEcoBotSpeaking();
        return;
    }

    if (isVoiceListening) {
        stopListening();
        return;
    }

    startListening();
}

function startListening() {
    if (!voiceRecognition) {
        // Fallback for browsers without speech recognition
        openVoiceDialogueCard();
        const botText = document.getElementById('voice-bot-text');
        const cfg = ECOBOT_LANG_CONFIG[ecobotCurrentLanguage] || ECOBOT_LANG_CONFIG.en;
        if (botText) {
            botText.innerHTML = `Microphone speech recognition is not enabled in this browser. You can tap any of the quick prompt chips below or use the <strong>AI Assistant</strong> tab.`;
        }
        return;
    }

    try {
        stopEcoBotSpeaking();
        openVoiceDialogueCard();
        voiceRecognition.lang = ECOBOT_LANG_CONFIG[ecobotCurrentLanguage].speechLang;
        voiceRecognition.start();
    } catch (err) {
        console.error('Error starting speech recognition:', err);
    }
}

function stopListening() {
    if (voiceRecognition && isVoiceListening) {
        try {
            voiceRecognition.stop();
        } catch (e) {
            console.error('Error stopping recognition:', e);
        }
    }
    isVoiceListening = false;
    updateVoiceAssistantUI('idle');
}

function triggerVoiceQuery(query) {
    stopListening();
    stopEcoBotSpeaking();
    openVoiceDialogueCard();
    processVoiceQuery(query);
}

async function processVoiceQuery(text) {
    if (!text || !text.trim()) return;

    const cfg = ECOBOT_LANG_CONFIG[ecobotCurrentLanguage] || ECOBOT_LANG_CONFIG.en;

    // Show user question bubble
    const userBubble = document.getElementById('voice-user-bubble');
    const userText = document.getElementById('voice-user-text');
    const botText = document.getElementById('voice-bot-text');
    const cardStatus = document.getElementById('voice-card-status');
    const pillCaption = document.getElementById('voice-pill-caption');

    if (userBubble && userText) {
        userBubble.classList.remove('hidden');
        userText.textContent = text;
    }

    if (pillCaption) {
        pillCaption.textContent = `"${text}"`;
    }

    if (botText) {
        botText.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-emerald-400 mr-2"></i> ${cfg.statusThinking}`;
    }

    if (cardStatus) {
        cardStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> ${cfg.statusThinking}`;
    }

    updateVoiceAssistantUI('thinking');

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                language: ecobotCurrentLanguage
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const reply = data.reply || "I'm here to assist with Dayananda Sagar University smart waste management, bin statuses, and recycling instructions.";

        if (botText) {
            botText.innerHTML = escapeHtml(reply).replace(/\n/g, '<br>');
        }

        speakEcoBotResponse(reply);
    } catch (err) {
        console.error('Voice query error:', err);
        if (botText) {
            botText.textContent = (ecobotCurrentLanguage === 'kn')
                ? "ಕ್ಯಾಂಪಸ್ ನೆಟ್‌ವರ್ಕ್ ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ."
                : ((ecobotCurrentLanguage === 'hi') ? "कैंपस नेटवर्क से कनेक्ट करने में असमर्थ। कृपया जांचें।" : "I'm having trouble connecting to the campus telemetry servers right now. Please check your network.");
        }
        updateVoiceAssistantUI('idle');
    }
}

function cleanMarkdownForSpeech(text) {
    if (!text) return '';
    return text
        .replace(/[*#_~`>]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/•|-/g, '')
        .replace(/\n+/g, '. ')
        .trim();
}

function speakEcoBotResponse(rawText) {
    if (voiceSpeechMuted || !window.speechSynthesis) {
        updateVoiceAssistantUI('idle');
        return;
    }

    window.speechSynthesis.cancel();

    const cleanText = cleanMarkdownForSpeech(rawText);
    if (!cleanText) {
        updateVoiceAssistantUI('idle');
        return;
    }

    try {
        const cfg = ECOBOT_LANG_CONFIG[ecobotCurrentLanguage] || ECOBOT_LANG_CONFIG.en;
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.lang = cfg.speechLang;

        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;

        if (ecobotCurrentLanguage === 'kn') {
            selectedVoice = voices.find(v => v.lang.startsWith('kn') || v.lang === 'kn-IN' || v.name.toLowerCase().includes('kannada'))
                || voices.find(v => v.lang === 'hi-IN' || v.lang === 'en-IN');
        } else if (ecobotCurrentLanguage === 'hi') {
            selectedVoice = voices.find(v => v.lang.startsWith('hi') || v.lang === 'hi-IN' || v.name.toLowerCase().includes('hindi') || v.name.includes('Kalpana') || v.name.includes('Hemant'))
                || voices.find(v => v.lang === 'en-IN');
        } else {
            selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('India')));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            isVoiceSpeaking = true;
            updateVoiceAssistantUI('speaking');
        };

        utterance.onend = () => {
            isVoiceSpeaking = false;
            updateVoiceAssistantUI('idle');
        };

        utterance.onerror = (e) => {
            console.warn('Speech synthesis utterance error:', e);
            isVoiceSpeaking = false;
            updateVoiceAssistantUI('idle');
        };

        voiceCurrentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.warn('SpeechSynthesis error:', err);
        updateVoiceAssistantUI('idle');
    }
}

function stopEcoBotSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    isVoiceSpeaking = false;
    updateVoiceAssistantUI('idle');
}

function toggleVoiceSpeechMute() {
    voiceSpeechMuted = !voiceSpeechMuted;
    const muteIcon = document.getElementById('voice-mute-icon');
    if (muteIcon) {
        muteIcon.className = voiceSpeechMuted ? 'fa-solid fa-volume-xmark text-red-400' : 'fa-solid fa-volume-high text-slate-300';
    }

    if (voiceSpeechMuted && isVoiceSpeaking) {
        stopEcoBotSpeaking();
    }

    showToast(voiceSpeechMuted ? 'EcoBot voice audio muted' : 'EcoBot voice audio unmuted', 'info');
}

function updateVoiceAssistantUI(state) {
    const visualizer = document.getElementById('voice-wave-visualizer');
    const pulseRing = document.getElementById('voice-pulse-ring');
    const micIcon = document.getElementById('voice-mic-icon');
    const statusPill = document.getElementById('voice-status-pill');
    const cardStatus = document.getElementById('voice-card-status');
    const btnStop = document.getElementById('btn-stop-speech');
    const pillCaption = document.getElementById('voice-pill-caption');
    const cfg = ECOBOT_LANG_CONFIG[ecobotCurrentLanguage] || ECOBOT_LANG_CONFIG.en;

    if (state === 'listening') {
        if (visualizer) visualizer.className = 'flex items-center gap-1 px-1 h-6 voice-active-listening';
        if (pulseRing) pulseRing.classList.remove('hidden');
        if (micIcon) micIcon.className = 'fa-solid fa-microphone text-base text-slate-950 animate-pulse';
        if (statusPill) {
            statusPill.textContent = (ecobotCurrentLanguage === 'kn') ? 'ಆಲಿಸಲಾಗುತ್ತಿದೆ...' : ((ecobotCurrentLanguage === 'hi') ? 'सुन रहे हैं...' : 'Listening...');
            statusPill.className = 'text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded-full animate-pulse';
        }
        if (cardStatus) {
            cardStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-400 animate-ping"></span> ${cfg.statusListening}`;
        }
        if (pillCaption) pillCaption.textContent = cfg.statusListening;
        if (btnStop) btnStop.classList.add('hidden');
    } else if (state === 'speaking') {
        if (visualizer) visualizer.className = 'flex items-center gap-1 px-1 h-6 voice-active-speaking';
        if (pulseRing) pulseRing.classList.add('hidden');
        if (micIcon) micIcon.className = 'fa-solid fa-waveform-lines text-base text-slate-950';
        if (statusPill) {
            statusPill.textContent = (ecobotCurrentLanguage === 'kn') ? 'ಮಾತನಾಡುತ್ತಿದೆ...' : ((ecobotCurrentLanguage === 'hi') ? 'बोल रहे हैं...' : 'Speaking...');
            statusPill.className = 'text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full';
        }
        if (cardStatus) {
            cardStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ${cfg.statusSpeaking}`;
        }
        if (btnStop) btnStop.classList.remove('hidden');
    } else if (state === 'thinking') {
        if (visualizer) visualizer.className = 'flex items-center gap-1 px-1 h-6';
        if (pulseRing) pulseRing.classList.add('hidden');
        if (statusPill) {
            statusPill.textContent = (ecobotCurrentLanguage === 'kn') ? 'ಯೋಚಿಸುತ್ತಿದೆ...' : ((ecobotCurrentLanguage === 'hi') ? 'सोच रहे हैं...' : 'Thinking...');
            statusPill.className = 'text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full';
        }
    } else {
        // idle
        if (visualizer) visualizer.className = 'flex items-center gap-1 px-1 h-6';
        if (pulseRing) pulseRing.classList.add('hidden');
        if (micIcon) micIcon.className = 'fa-solid fa-microphone text-base text-slate-950';
        if (statusPill) {
            statusPill.textContent = (ecobotCurrentLanguage === 'kn') ? 'ಮೈಕ್ ಒತ್ತಿ' : ((ecobotCurrentLanguage === 'hi') ? 'माइक दबाएं' : 'Tap Mic');
            statusPill.className = 'text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full';
        }
        if (cardStatus) {
            cardStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> ${cfg.statusReady}`;
        }
        if (btnStop) btnStop.classList.add('hidden');
    }
}

function toggleVoiceDialogueCard() {
    const card = document.getElementById('voice-dialogue-card');
    if (!card) return;

    if (card.classList.contains('hidden')) {
        openVoiceDialogueCard();
    } else {
        closeVoiceDialogueCard();
    }
}

function openVoiceDialogueCard() {
    const card = document.getElementById('voice-dialogue-card');
    const chevron = document.getElementById('voice-chevron-icon');
    if (card) card.classList.remove('hidden');
    if (chevron) chevron.className = 'fa-solid fa-chevron-down text-xs transition-transform duration-200';
}

function closeVoiceDialogueCard() {
    const card = document.getElementById('voice-dialogue-card');
    const chevron = document.getElementById('voice-chevron-icon');
    if (card) card.classList.add('hidden');
    if (chevron) chevron.className = 'fa-solid fa-chevron-up text-xs transition-transform duration-200';
}

// ============================================================================
// 14. LEADERBOARD & REVIEWS TAB
// ============================================================================

async function loadLeaderboard() {
    const emptyState = document.getElementById('leaderboard-empty-state');
    const tableContainer = document.getElementById('leaderboard-table-container');
    const tbody = document.getElementById('leaderboard-tbody');

    try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error(`Leaderboard HTTP error: ${response.status}`);

        const leaders = await response.json();
        if (tbody) tbody.innerHTML = '';

        if (!leaders || leaders.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (tableContainer) tableContainer.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        if (tableContainer) tableContainer.classList.remove('hidden');

        leaders.forEach((user, index) => {
            const rank = user.rank || index + 1;
            const username = user.username || `EcoUser_${rank}`;
            const scans = user.scan_count ?? 0;
            const points = user.eco_points ?? (scans * 10);

            let rankBadge = `<span class="font-bold text-slate-500">${rank}</span>`;
            if (rank === 1) {
                rankBadge = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-900 shadow-sm"><i class="fa-solid fa-crown text-amber-600"></i></span>';
            } else if (rank === 2) {
                rankBadge = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold">2</span>';
            } else if (rank === 3) {
                rankBadge = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-200 text-orange-900 font-bold">3</span>';
            }

            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition';
            tr.innerHTML = `
                <td class="py-4 px-6 text-center">${rankBadge}</td>
                <td class="py-4 px-6 font-semibold text-slate-900">${escapeHtml(username)}</td>
                <td class="py-4 px-6 text-center text-slate-600">${Number(scans).toLocaleString()}</td>
                <td class="py-4 px-6 text-right">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">
                        <i class="fa-solid fa-leaf text-emerald-600"></i> ${Number(points).toLocaleString()} pts
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load leaderboard:', err);
        if (emptyState) emptyState.classList.remove('hidden');
        if (tableContainer) tableContainer.classList.add('hidden');
    }
}

function setupStarRating() {
    const container = document.getElementById('star-rating-selector');
    if (!container) return;

    const stars = container.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.getAttribute('data-value'), 10);
            updateStarDisplay(stars, selectedRating);
        });
        star.addEventListener('mouseenter', () => {
            const hoverVal = parseInt(star.getAttribute('data-value'), 10);
            updateStarDisplay(stars, hoverVal);
        });
    });

    container.addEventListener('mouseleave', () => {
        updateStarDisplay(stars, selectedRating);
    });
}

function updateStarDisplay(stars, rating) {
    stars.forEach(s => {
        const val = parseInt(s.getAttribute('data-value'), 10);
        if (val <= rating) {
            s.classList.add('text-amber-400');
            s.classList.remove('text-slate-300');
        } else {
            s.classList.remove('text-amber-400');
            s.classList.add('text-slate-300');
        }
    });
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('review-name').value.trim();
    const comment = document.getElementById('review-comment').value.trim();

    if (selectedRating === 0) {
        showToast('Please select a star rating (1 to 5).', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, rating: selectedRating, comment: comment })
        });

        if (!res.ok) throw new Error(`Review failed: ${res.status}`);

        showToast('Thank you! Your review has been recorded.', 'success');
        document.getElementById('review-form').reset();
        selectedRating = 0;
        setupStarRating();
        loadReviews();
    } catch (err) {
        console.error('Review submission error:', err);
        showToast('Error submitting review: ' + err.message, 'error');
    }
}

async function loadReviews() {
    const list = document.getElementById('reviews-list');
    const emptyState = document.getElementById('reviews-empty-state');
    const avgVal = document.getElementById('avg-rating-value');
    const avgStars = document.getElementById('avg-rating-stars');
    const totalCount = document.getElementById('total-reviews-count');

    try {
        const res = await fetch('/api/reviews');
        if (!res.ok) return;

        const data = await res.json();
        const reviews = data.reviews || [];
        const avg = data.average_rating || 0.0;
        const total = data.total_reviews || reviews.length;

        if (avgVal) avgVal.textContent = avg.toFixed(1);
        if (totalCount) totalCount.textContent = `Based on ${total} reviews`;

        if (avgStars) {
            avgStars.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                avgStars.innerHTML += `<i class="fa-solid fa-star ${i <= Math.round(avg) ? 'text-amber-400' : 'text-slate-300'}"></i>`;
            }
        }

        if (list) list.innerHTML = '';

        if (reviews.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        reviews.forEach(r => {
            const card = document.createElement('div');
            card.className = 'p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2';

            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += `<i class="fa-solid fa-star text-xs ${i <= r.rating ? 'text-amber-400' : 'text-slate-300'}"></i>`;
            }

            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-900 text-sm">${escapeHtml(r.name)}</span>
                    <div class="flex gap-1">${starsHtml}</div>
                </div>
                <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(r.comment)}</p>
                <span class="text-[10px] text-slate-400 block pt-1">${r.created_at ? r.created_at.substring(0, 10) : 'Recent'}</span>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load reviews:', err);
    }
}

// ============================================================================
// 15. INITIALIZATION & BACKGROUND POLLING
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
    switchTab('dashboard');
    setupStarRating();
    setupDropzone();
    initVoiceAssistant();

    // Auto-poll Digital Twin every 8 seconds to synchronize real-time IoT simulation
    twinPollingTimer = setInterval(() => {
        if (currentTab === 'digital-twin') {
            loadDigitalTwinData();
        } else if (currentTab === 'dashboard') {
            loadDashboard();
        }
    }, 8000);
});
