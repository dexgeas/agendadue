/**
 * agenda2.0 - Core Application Logic
 * Mobile-first reactive SPA with Desk Italia integration & GoTo Meeting generator
 */

// Application State
const state = {
  currentDate: new Date(),
  tipoElenco: 'singolo', // 'singolo' (Andrea Selvatici) or 'globale' (Tutti)
  appointments: [],
  monthEventDays: {},
  activeFilter: 'all',
  searchQuery: '',
  isLoading: false,
  technicianName: 'Andrea Selvatici',
  credentials: {
    username: localStorage.getItem('agenda2_user') || 'andrea',
    password: localStorage.getItem('agenda2_pwd') || 'DESKitali@2021',
    gotoClientId: localStorage.getItem('agenda2_goto_cid') || '',
    gotoClientSecret: localStorage.getItem('agenda2_goto_csec') || '',
    gotoRefreshToken: localStorage.getItem('agenda2_goto_rtok') || ''
  },
  gotoLinks: JSON.parse(localStorage.getItem('agenda2_goto_links') || '{}')
};

// Italian Localized Day/Month names
const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// DOM Elements
const elements = {
  scrollerDates: document.getElementById('date-scroller'),
  monthLabel: document.getElementById('current-month-label'),
  appointmentsList: document.getElementById('appointments-list'),
  searchInput: document.getElementById('search-input'),
  statsTotal: document.getElementById('stat-total'),
  statsWebinars: document.getElementById('stat-webinars'),
  statsContracts: document.getElementById('stat-contracts'),
  tabSingolo: document.getElementById('tab-singolo'),
  tabGlobale: document.getElementById('tab-globale'),
  btnSync: document.getElementById('btn-sync'),
  btnSettings: document.getElementById('btn-settings'),
  settingsModal: document.getElementById('settings-modal'),
  settingsForm: document.getElementById('settings-form'),
  settingsClose: document.getElementById('settings-close'),
  toastContainer: document.getElementById('toast-container'),
  filterChips: document.querySelectorAll('.filter-chip')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderDateStrip();
  loadMonthCalendar();
  loadAppointments();
  registerServiceWorker();
});

// Setup Events
function setupEventListeners() {
  // Mode switcher (Singolo vs Globale)
  if (elements.tabSingolo) {
    elements.tabSingolo.addEventListener('click', () => switchViewMode('singolo'));
  }
  if (elements.tabGlobale) {
    elements.tabGlobale.addEventListener('click', () => switchViewMode('globale'));
  }

  // Search input
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderAppointments();
    });
  }

  // Filter chips
  elements.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      renderAppointments();
    });
  });

  // Sync button
  if (elements.btnSync) {
    elements.btnSync.addEventListener('click', () => {
      showToast('Sincronizzazione in corso...', '🔄');
      loadAppointments(true);
      loadMonthCalendar();
    });
  }

  // Settings Modal
  if (elements.btnSettings) {
    elements.btnSettings.addEventListener('click', openSettingsModal);
  }
  if (elements.settingsClose) {
    elements.settingsClose.addEventListener('click', closeSettingsModal);
  }
  if (elements.settingsModal) {
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) closeSettingsModal();
    });
  }
  if (elements.settingsForm) {
    elements.settingsForm.addEventListener('submit', handleSaveSettings);
  }

  // Mobile Bottom Nav actions
  const navBtnToday = document.getElementById('nav-today');
  const navBtnToggle = document.getElementById('nav-toggle-mode');
  const navBtnSync = document.getElementById('nav-sync');
  const navBtnSettings = document.getElementById('nav-settings');

  if (navBtnToday) {
    navBtnToday.addEventListener('click', () => {
      state.currentDate = new Date();
      renderDateStrip();
      loadAppointments();
      showToast('Oggi selezionato', '📅');
    });
  }
  if (navBtnToggle) {
    navBtnToggle.addEventListener('click', () => {
      const newMode = state.tipoElenco === 'singolo' ? 'globale' : 'singolo';
      switchViewMode(newMode);
    });
  }
  if (navBtnSync) {
    navBtnSync.addEventListener('click', () => {
      showToast('Sincronizzazione in corso...', '🔄');
      loadAppointments(true);
    });
  }
  if (navBtnSettings) {
    navBtnSettings.addEventListener('click', openSettingsModal);
  }
}

// Switch between 'singolo' and 'globale'
function switchViewMode(mode) {
  if (state.tipoElenco === mode) return;
  state.tipoElenco = mode;
  
  if (elements.tabSingolo && elements.tabGlobale) {
    if (mode === 'singolo') {
      elements.tabSingolo.classList.add('active');
      elements.tabGlobale.classList.remove('active');
    } else {
      elements.tabGlobale.classList.add('active');
      elements.tabSingolo.classList.remove('active');
    }
  }

  const navToggleLabel = document.getElementById('nav-toggle-label');
  if (navToggleLabel) {
    navToggleLabel.textContent = mode === 'singolo' ? 'I Miei' : 'Tutti';
  }

  showToast(`Vista: ${mode === 'singolo' ? 'I Miei Interventi' : 'Tutti i Tecnici'}`, '👥');
  loadAppointments();
}

// Render Date Strip Scroller (14 days before & after)
function renderDateStrip() {
  if (!elements.scrollerDates) return;
  elements.scrollerDates.innerHTML = '';

  const currentYear = state.currentDate.getFullYear();
  const currentMonth = state.currentDate.getMonth();
  const currentDay = state.currentDate.getDate();

  if (elements.monthLabel) {
    elements.monthLabel.textContent = `${MONTHS_IT[currentMonth]} ${currentYear}`;
  }

  // Generate 21 days window around selected date
  const startDate = new Date(state.currentDate);
  startDate.setDate(startDate.getDate() - 7);

  for (let i = 0; i < 21; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);

    const dayNum = d.getDate();
    const dayName = DAYS_IT[d.getDay()];
    const isSelected = d.toDateString() === state.currentDate.toDateString();
    const hasEvents = state.monthEventDays[dayNum.toString()] !== undefined;

    const chip = document.createElement('div');
    chip.className = `date-chip ${isSelected ? 'active' : ''}`;
    chip.innerHTML = `
      <span class="day-name">${dayName}</span>
      <span class="day-num">${dayNum}</span>
      ${hasEvents ? '<span class="event-dot"></span>' : ''}
    `;

    chip.addEventListener('click', () => {
      state.currentDate = new Date(d);
      renderDateStrip();
      loadAppointments();
    });

    elements.scrollerDates.appendChild(chip);

    // Scroll active chip into view
    if (isSelected) {
      setTimeout(() => {
        chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 100);
    }
  }
}

// Load Month Calendar (for day indicator dots)
async function loadMonthCalendar() {
  const month = state.currentDate.getMonth() + 1;
  const year = state.currentDate.getFullYear();
  try {
    const res = await fetch(`/api/calendar/month?month=${month}&year=${year}`);
    const data = await res.json();
    if (data.success && data.days) {
      state.monthEventDays = data.days;
      renderDateStrip();
    }
  } catch (err) {
    console.warn('[agenda2.0] Could not load month dots:', err);
  }
}

// Load Appointments for Selected Day
async function loadAppointments(forceSync = false) {
  const day = state.currentDate.getDate();
  const month = state.currentDate.getMonth() + 1;
  const year = state.currentDate.getFullYear();
  const cacheKey = `agenda2_day_${year}_${month}_${day}_${state.tipoElenco}`;

  // 1. Try Cache First for Instant Mobile Rendering
  if (!forceSync) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        state.appointments = JSON.parse(cached);
        renderAppointments();
      } catch (e) {}
    }
  }

  // 2. Fetch fresh data
  showLoadingShimmer(true);
  try {
    const res = await fetch(`/api/calendar/day?day=${day}&month=${month}&year=${year}&tipoElenco=${state.tipoElenco}`);
    const data = await res.json();

    if (data.success) {
      state.appointments = data.appointments || [];
      // Merge stored GoTo Links into appointments
      state.appointments.forEach(app => {
        if (!app.gotoLink && state.gotoLinks[app.id]) {
          app.gotoLink = state.gotoLinks[app.id].joinUrl;
        }
      });
      // Save cache
      localStorage.setItem(cacheKey, JSON.stringify(state.appointments));
      renderAppointments();
    } else {
      if (state.appointments.length === 0) {
        renderEmptyState(data.error || 'Nessun intervento trovato per questa data.');
      }
    }
  } catch (err) {
    console.error('Fetch error:', err);
    if (state.appointments.length === 0) {
      renderEmptyState('Impossibile contattare il server. Verifica la connessione.');
    }
  } finally {
    showLoadingShimmer(false);
  }
}

// Filter and Render Appointments
function renderAppointments() {
  if (!elements.appointmentsList) return;

  // Filter list
  let filtered = state.appointments.filter(app => {
    // 1. Search filter
    if (state.searchQuery) {
      const q = state.searchQuery;
      const match = 
        (app.schoolName && app.schoolName.toLowerCase().includes(q)) ||
        (app.schoolCode && app.schoolCode.toLowerCase().includes(q)) ||
        (app.address && app.address.toLowerCase().includes(q)) ||
        (app.notes && app.notes.toLowerCase().includes(q)) ||
        (app.technician && app.technician.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 2. Tag filter
    if (state.activeFilter === 'webinar') {
      return app.isWebinar || app.gotoLink;
    } else if (state.activeFilter === 'tecnico') {
      return (app.nature || '').toLowerCase().includes('tec');
    } else if (state.activeFilter === 'commerciale') {
      return (app.nature || '').toLowerCase().includes('com');
    } else if (state.activeFilter === 'confermato') {
      return app.statusColor === 'giallo' || app.statusColor === 'verde';
    }
    return true;
  });

  // Update Stats Counters
  updateStats(filtered);

  if (filtered.length === 0) {
    renderEmptyState(state.searchQuery ? 'Nessun appuntamento corrisponde alla ricerca.' : 'Nessun intervento in programma per questa data.');
    return;
  }

  elements.appointmentsList.innerHTML = '';
  filtered.forEach(app => {
    const card = createAppointmentCard(app);
    elements.appointmentsList.appendChild(card);
  });
}

// Update Statistics Display
function updateStats(items) {
  const total = items.length;
  const webinars = items.filter(i => i.isWebinar || i.gotoLink).length;
  const contracts = items.filter(i => i.hasContract).length;

  if (elements.statsTotal) elements.statsTotal.textContent = total;
  if (elements.statsWebinars) elements.statsWebinars.textContent = webinars;
  if (elements.statsContracts) elements.statsContracts.textContent = contracts;
}

// Create an Appointment Card Element
function createAppointmentCard(app) {
  const card = document.createElement('div');
  card.className = 'appointment-card';
  card.id = `card-app-${app.id}`;

  const hasGoto = Boolean(app.gotoLink);
  const mapUrl = `https://maps.apple.com/?q=${encodeURIComponent(app.address || (app.schoolName + ' ' + (app.city || '')))}`;

  card.innerHTML = `
    <!-- Card Top Header -->
    <div class="card-top-row">
      <div class="time-badge ${app.statusColor || 'giallo'}">
        <span class="badge-pulse"></span>
        <span>${app.startTime} - ${app.endTime}</span>
      </div>
      
      <div class="badges-right">
        ${app.isWebinar ? '<span class="pill-badge webinar-tag">📹 WEBINAR</span>' : ''}
        <span class="pill-badge ${(app.nature || 'tec').toLowerCase() === 'tec' ? 'tecnico' : 'commerciale'}">
          ${app.natureLabel || 'Tecnico'}
        </span>
      </div>
    </div>

    <!-- School Title -->
    <h2 class="school-title">${escapeHtml(app.schoolName || 'Intervento')}</h2>

    <!-- School Metadata & Badges -->
    <div class="school-meta-row">
      ${app.schoolCode ? `
        <span class="code-chip" onclick="copyText('${app.schoolCode}', 'Codice Meccanografico copiato!')" title="Tocca per copiare">
          📋 ${app.schoolCode}
        </span>
      ` : ''}

      <span class="contract-badge ${app.hasContract ? 'si' : 'no'}">
        ${app.hasContract ? '● Assistenza SI' : '○ Assistenza NO'}
      </span>

      ${state.tipoElenco === 'globale' && app.technician ? `
        <span class="technician-assigned">
          👤 ${escapeHtml(app.technician)}
        </span>
      ` : ''}
    </div>

    <!-- Address with Map Link -->
    ${app.address ? `
      <a href="${mapUrl}" target="_blank" rel="noopener" class="address-link-row" title="Apri su Mappe">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>${escapeHtml(app.address)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </a>
    ` : ''}

    <!-- Notes / Details Box -->
    ${app.notes ? `
      <div class="notes-container">${highlightKeywords(escapeHtml(app.notes))}</div>
    ` : ''}

    <!-- GoTo Meeting Hub Section -->
    <div class="goto-hub-section" id="goto-section-${app.id}">
      ${hasGoto ? renderGotoActivePanel(app) : renderGotoGenerateButton(app)}
    </div>
  `;

  return card;
}

// Render "Genera GoTo Meeting" Button
function renderGotoGenerateButton(app) {
  return `
    <button class="btn-generate-goto" onclick="handleGenerateGoTo('${app.id}')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
      <span>Genera Stanza GoTo Meeting</span>
    </button>
  `;
}

// Render Active GoTo Meeting Details & Action Hub
function renderGotoActivePanel(app) {
  const gotoLink = app.gotoLink;
  return `
    <div class="goto-active-panel">
      <div class="goto-active-header">
        <div class="goto-badge-brand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <span>GoTo Meeting Attivo</span>
        </div>
        <span class="badge-version" style="background:#ede9fe; color:#6d28d9;">PRONTO</span>
      </div>

      <!-- Link URL Bar with Copy Button -->
      <div class="goto-link-display">
        <span class="goto-url-text">${gotoLink}</span>
        <button class="copy-mini-btn" onclick="copyText('${gotoLink}', 'Link GoTo copiato negli appunti!')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copia</span>
        </button>
      </div>

      <!-- Actions Grid -->
      <div class="goto-actions-grid">
        <a href="${gotoLink}" target="_blank" rel="noopener" class="goto-btn-action join">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Avvia Stanza</span>
        </a>

        <button class="goto-btn-action whatsapp" onclick="shareWhatsApp('${app.id}')">
          <span>💬 WhatsApp</span>
        </button>

        <button class="goto-btn-action portal-sync" onclick="saveLinkToPortal('${app.id}')" title="Salva nelle note del portale aziendale">
          <span>💾 Salva su Portale</span>
        </button>
      </div>
    </div>
  `;
}

// Generate GoTo Meeting Handler
async function handleGenerateGoTo(appointmentId) {
  const app = state.appointments.find(a => a.id === appointmentId);
  if (!app) return;

  const section = document.getElementById(`goto-section-${appointmentId}`);
  if (section) {
    section.innerHTML = `
      <div style="text-align:center; padding:12px; color:var(--goto-purple); font-weight:700;">
        ⏳ Generazione stanza GoTo in corso...
      </div>
    `;
  }

  try {
    const res = await fetch('/api/goto/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment: app,
        gotoSettings: {
          clientId: state.credentials.gotoClientId,
          clientSecret: state.credentials.gotoClientSecret,
          refreshToken: state.credentials.gotoRefreshToken
        }
      })
    });

    const data = await res.json();
    if (data.success && data.joinUrl) {
      app.gotoLink = data.joinUrl;
      state.gotoLinks[appointmentId] = data;
      localStorage.setItem('agenda2_goto_links', JSON.stringify(state.gotoLinks));

      if (section) {
        section.innerHTML = renderGotoActivePanel(app);
      }

      showToast(`Stanza creata: ${data.meetingId || ''}`, '📹');
    } else {
      showToast('Errore durante la generazione GoTo', '❌');
      if (section) section.innerHTML = renderGotoGenerateButton(app);
    }
  } catch (err) {
    console.error('Error generating GoTo:', err);
    showToast('Errore di connessione', '❌');
    if (section) section.innerHTML = renderGotoGenerateButton(app);
  }
}

// Share via WhatsApp with Italian Preformatted Message
function shareWhatsApp(appointmentId) {
  const app = state.appointments.find(a => a.id === appointmentId);
  if (!app || !app.gotoLink) return;

  const message = 
`Buongiorno,
Le invio il link per il collegamento GoTo Meeting programmato per oggi dalle ore ${app.startTime} alle ${app.endTime}:

🏫 *${app.schoolName}*
🔗 *Link Stanza:* ${app.gotoLink}

A presto,
${state.technicianName} - Desk Italia`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// Save GoTo Link back into Desk Italia Portal's notes!
async function saveLinkToPortal(appointmentId) {
  const app = state.appointments.find(a => a.id === appointmentId);
  if (!app || !app.gotoLink) return;

  showToast('Salvataggio su portale Desk Italia...', '💾');
  try {
    const res = await fetch('/api/portal/save-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interventionId: appointmentId,
        gotoLink: app.gotoLink
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Link salvato con successo nel portale!', '✅');
    } else {
      showToast(data.error || 'Errore salvataggio portale', '⚠️');
    }
  } catch (err) {
    showToast('Errore di rete', '❌');
  }
}

// Settings Modal Handlers
function openSettingsModal() {
  if (!elements.settingsModal) return;
  document.getElementById('input-user').value = state.credentials.username;
  document.getElementById('input-pwd').value = state.credentials.password;
  document.getElementById('input-goto-cid').value = state.credentials.gotoClientId;
  document.getElementById('input-goto-csec').value = state.credentials.gotoClientSecret;
  document.getElementById('input-goto-rtok').value = state.credentials.gotoRefreshToken;
  elements.settingsModal.classList.add('open');
}

function closeSettingsModal() {
  if (elements.settingsModal) {
    elements.settingsModal.classList.remove('open');
  }
}

function handleSaveSettings(e) {
  e.preventDefault();
  state.credentials.username = document.getElementById('input-user').value.trim();
  state.credentials.password = document.getElementById('input-pwd').value.trim();
  state.credentials.gotoClientId = document.getElementById('input-goto-cid').value.trim();
  state.credentials.gotoClientSecret = document.getElementById('input-goto-csec').value.trim();
  state.credentials.gotoRefreshToken = document.getElementById('input-goto-rtok').value.trim();

  localStorage.setItem('agenda2_user', state.credentials.username);
  localStorage.setItem('agenda2_pwd', state.credentials.password);
  localStorage.setItem('agenda2_goto_cid', state.credentials.gotoClientId);
  localStorage.setItem('agenda2_goto_csec', state.credentials.gotoClientSecret);
  localStorage.setItem('agenda2_goto_rtok', state.credentials.gotoRefreshToken);

  closeSettingsModal();
  showToast('Impostazioni salvate!', '⚙️');
  loadAppointments(true);
}

// Helpers: Copy to clipboard & Toast
function copyText(text, successMsg) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
  showToast(successMsg, '📋');
}

function showToast(message, icon = 'ℹ️') {
  if (!elements.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'glass-toast';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function showLoadingShimmer(show) {
  if (!elements.appointmentsList) return;
  if (show && state.appointments.length === 0) {
    elements.appointmentsList.innerHTML = `
      <div class="shimmer-card"></div>
      <div class="shimmer-card"></div>
      <div class="shimmer-card"></div>
    `;
  }
}

function renderEmptyState(message) {
  if (!elements.appointmentsList) return;
  elements.appointmentsList.innerHTML = `
    <div class="empty-state-box">
      <div class="empty-state-icon">☕</div>
      <h3 style="font-weight:800; font-size:1.1rem; margin-bottom:6px;">Nessun Impegno</h3>
      <p style="color:var(--text-muted); font-size:0.86rem;">${escapeHtml(message)}</p>
    </div>
  `;
}

function highlightKeywords(text) {
  return text
    .replace(/(WEBINAR)/gi, '<b style="color:#7c3aed;">$1</b>')
    .replace(/(TAGLIANDO)/gi, '<b style="color:#0284c7;">$1</b>')
    .replace(/(CORSO)/gi, '<b style="color:#d97706;">$1</b>')
    .replace(/(DM 219|DM 40|DM 66|PASSWEB)/gi, '<b style="color:#059669;">$1</b>');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Service worker registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}
