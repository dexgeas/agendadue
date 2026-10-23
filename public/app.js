/**
 * agenda2.0 - Core Application Logic
 * Mobile-first reactive SPA with Desk Italia integration & GoTo Meeting generator
 * Apple Glassmorphism & Material 3 Refinements
 */

// Application State
const state = {
  currentDate: new Date(),
  calendarViewDate: new Date(), // Active month displayed in full calendar
  tipoElenco: 'singolo', // 'singolo' (Andrea Selvatici) or 'globale' (Tutti)
  appointments: [],
  allGlobaleAppointments: [], // Cached for live counters
  monthEventDays: {},
  monthCache: {}, // Cached event counts by "YYYY_M"
  activeFilter: 'all',
  searchQuery: '',
  isLoading: false,
  technicianName: 'Andrea Selvatici',
  credentials: {
    username: localStorage.getItem('agenda2_user') || 'andrea',
    password: localStorage.getItem('agenda2_pwd') || 'DESKitali@2021',
    gotoClientId: localStorage.getItem('agenda2_goto_cid') || '4bc8f4e9-075e-48a7-8ab4-52ea3c5f2d35',
    gotoClientSecret: localStorage.getItem('agenda2_goto_csec') || 'FyFRXaREW1ZyswbsGnFT2ocE',
    gotoRefreshToken: localStorage.getItem('agenda2_goto_rtok') || 'eyJraWQiOiI2MjAiLCJhbGciOiJSUzUxMiJ9.eyJzYyI6ImNvbGxhYjogaWRlbnRpdHk6c2NpbS5tZSIsInN1YiI6IjM5OTYzMDE5MTI5NDE3ODk5MTAiLCJhdWQiOiI0YmM4ZjRlOS0wNzVlLTQ4YTctOGFiNC01MmVhM2M1ZjJkMzUiLCJvZ24iOiJwd2QiLCJ0eXAiOiJyIiwibGV2ZWxPZkFzc3VyYW5jZSI6MiwiZXhwIjoxNzk1MzYxODgyLCJpYXQiOjE3OTI3Njk4ODIsImp0aSI6ImRjMDhmOGQwLTZkYjAtNDUyMC1iNTk2LThmOWIxNjdlNzEyNCJ9.o8xVOZB6WGIyS9hlASH3iJJle23s3nzNGcp3NQ17lqBk2O0HqUnWG8Mhy9IdxUpc8EjrKaS7tmFdgeopyIgX5aeNKzY5PcwXEGBgPLHIUuQnYToNIryD5QJbDKdfshtHvjtyTFP_yGdlqK9zzWd0y2Ld1-XtMb8P_E9UMCv0LE2lfaqVmkqBURvrfkOMpGSGY6mtfsL6he5gH-px-KSwmVkjhyQBLkekAJ1MpJGYpHezsH1AwXJfo5b9YiXUCE50JdFz27dfp9HdiXWtCcrsj7JBiKs9ecRUdXQ5MqQbgqs-B5pLufWGgELbP0-DpIWCQeuQjRYTtDzysWqeb5O__A'
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
  btnPrevMonth: document.getElementById('btn-prev-month'),
  btnNextMonth: document.getElementById('btn-next-month'),
  btnOpenMonthModal: document.getElementById('btn-open-month-modal'),
  btnTodayShortcut: document.getElementById('btn-today-shortcut'),
  desktopCalWidget: document.getElementById('desktop-calendar-widget'),
  desktopCalTitle: document.getElementById('desktop-cal-title'),
  desktopCalGrid: document.getElementById('desktop-cal-grid'),
  desktopCalPrevBtn: document.getElementById('desktop-cal-prev-btn'),
  desktopCalNextBtn: document.getElementById('desktop-cal-next-btn'),
  desktopCalTodayBtn: document.getElementById('desktop-cal-today-btn'),
  monthModal: document.getElementById('month-modal'),
  modalCalTitle: document.getElementById('modal-cal-title'),
  modalCalGrid: document.getElementById('modal-cal-grid'),
  modalCalPrevBtn: document.getElementById('modal-cal-prev-btn'),
  modalCalNextBtn: document.getElementById('modal-cal-next-btn'),
  modalCalTodayBtn: document.getElementById('modal-cal-today-btn'),
  monthModalClose: document.getElementById('month-modal-close'),
  navCalendar: document.getElementById('nav-calendar'),
  appointmentsList: document.getElementById('appointments-list'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  statsTotal: document.getElementById('stat-total'),
  statsWebinars: document.getElementById('stat-webinars'),
  statsContracts: document.getElementById('stat-contracts'),
  tabSingolo: document.getElementById('tab-singolo'),
  tabGlobale: document.getElementById('tab-globale'),
  countSingolo: document.getElementById('count-singolo'),
  countGlobale: document.getElementById('count-globale'),
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
  renderFullMonthCalendars();
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

  // Horizontal scroller month chevrons
  if (elements.btnPrevMonth) {
    elements.btnPrevMonth.addEventListener('click', (e) => {
      e.stopPropagation();
      changeMonth(-1);
    });
  }
  if (elements.btnNextMonth) {
    elements.btnNextMonth.addEventListener('click', (e) => {
      e.stopPropagation();
      changeMonth(1);
    });
  }

  // Full Month Calendar Triggers & Shortcuts
  if (elements.btnOpenMonthModal) {
    elements.btnOpenMonthModal.addEventListener('click', openMonthModal);
  }
  if (elements.monthModalClose) {
    elements.monthModalClose.addEventListener('click', closeMonthModal);
  }
  if (elements.monthModal) {
    elements.monthModal.addEventListener('click', (e) => {
      if (e.target === elements.monthModal) closeMonthModal();
    });
  }
  if (elements.btnTodayShortcut) {
    elements.btnTodayShortcut.addEventListener('click', jumpToToday);
  }
  if (elements.desktopCalTodayBtn) {
    elements.desktopCalTodayBtn.addEventListener('click', jumpToToday);
  }
  if (elements.modalCalTodayBtn) {
    elements.modalCalTodayBtn.addEventListener('click', jumpToToday);
  }

  // Full Month Calendar Navigation (< >)
  if (elements.desktopCalPrevBtn) {
    elements.desktopCalPrevBtn.addEventListener('click', () => changeCalendarViewMonth(-1));
  }
  if (elements.desktopCalNextBtn) {
    elements.desktopCalNextBtn.addEventListener('click', () => changeCalendarViewMonth(1));
  }
  if (elements.modalCalPrevBtn) {
    elements.modalCalPrevBtn.addEventListener('click', () => changeCalendarViewMonth(-1));
  }
  if (elements.modalCalNextBtn) {
    elements.modalCalNextBtn.addEventListener('click', () => changeCalendarViewMonth(1));
  }

  // Search input & clear button
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      if (elements.searchClearBtn) {
        if (state.searchQuery.length > 0) {
          elements.searchClearBtn.classList.add('visible');
        } else {
          elements.searchClearBtn.classList.remove('visible');
        }
      }
      renderAppointments();
    });
  }

  if (elements.searchClearBtn) {
    elements.searchClearBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.searchClearBtn.classList.remove('visible');
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
      loadMonthCalendar(state.calendarViewDate, true);
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
    navBtnToday.addEventListener('click', jumpToToday);
  }
  if (elements.navCalendar) {
    elements.navCalendar.addEventListener('click', openMonthModal);
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
      loadMonthCalendar(state.calendarViewDate, true);
    });
  }
  if (navBtnSettings) {
    navBtnSettings.addEventListener('click', openSettingsModal);
  }
}

// Select a specific Date (centralized handler)
function selectDate(date) {
  const prevMonth = state.currentDate.getMonth();
  const prevYear = state.currentDate.getFullYear();
  state.currentDate = new Date(date);
  state.calendarViewDate = new Date(date);

  renderDateStrip();
  renderFullMonthCalendars();

  if (state.currentDate.getMonth() !== prevMonth || state.currentDate.getFullYear() !== prevYear) {
    loadMonthCalendar(state.currentDate);
  }

  loadAppointments();
}

// Jump back to Today
function jumpToToday() {
  selectDate(new Date());
  closeMonthModal();
  showToast('Oggi selezionato', '📅');
}

// Change scroller month
function changeMonth(delta) {
  const newDate = new Date(state.currentDate);
  newDate.setMonth(newDate.getMonth() + delta);
  selectDate(newDate);
}

// Change Full Calendar view month
function changeCalendarViewMonth(delta) {
  const newDate = new Date(state.calendarViewDate);
  newDate.setMonth(newDate.getMonth() + delta);
  state.calendarViewDate = newDate;
  renderFullMonthCalendars();
  loadMonthCalendar(state.calendarViewDate);
}

// Open / Close Full Month Calendar Modal (Mobile)
function openMonthModal() {
  state.calendarViewDate = new Date(state.currentDate);
  loadMonthCalendar(state.calendarViewDate);
  renderFullMonthCalendars();
  if (elements.monthModal) {
    elements.monthModal.classList.add('open');
  }
}

function closeMonthModal() {
  if (elements.monthModal) {
    elements.monthModal.classList.remove('open');
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
  renderFullMonthCalendars();
  renderDateStrip();
  loadAppointments();
}

// Render Date Strip Scroller (Horizontal Carousel)
function renderDateStrip() {
  if (!elements.scrollerDates) return;
  elements.scrollerDates.innerHTML = '';

  const currentYear = state.currentDate.getFullYear();
  const currentMonth = state.currentDate.getMonth();
  const realToday = new Date();

  if (elements.monthLabel) {
    elements.monthLabel.textContent = `${MONTHS_IT[currentMonth]} ${currentYear}`;
  }

  // 21 days window centered around selected date
  const startDate = new Date(state.currentDate);
  startDate.setDate(startDate.getDate() - 7);

  for (let i = 0; i < 21; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);

    const dayNum = d.getDate();
    const dayName = DAYS_IT[d.getDay()];
    const isSelected = d.toDateString() === state.currentDate.toDateString();
    const isToday = d.toDateString() === realToday.toDateString();
    
    // Check if month matches for event dots
    const isSameMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    const dayInfo = isSameMonth ? state.monthEventDays[dayNum.toString()] : null;
    const eventCount = dayInfo ? (state.tipoElenco === 'singolo' ? dayInfo.count : dayInfo.total) : 0;

    const chip = document.createElement('div');
    chip.className = `date-chip ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}`;
    
    let counterHtml = '';
    if (eventCount > 0) {
      counterHtml = `<span class="chip-dot-counter">${eventCount} app.</span>`;
    }

    chip.innerHTML = `
      <span class="day-name">${dayName}</span>
      <span class="day-num">${dayNum}</span>
      ${counterHtml}
    `;

    chip.addEventListener('click', () => {
      selectDate(d);
    });

    elements.scrollerDates.appendChild(chip);

    if (isSelected) {
      setTimeout(() => {
        chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 100);
    }
  }
}

// Render Full Month Interactive Calendars (Desktop & Mobile Modal)
function renderFullMonthCalendars() {
  const viewYear = state.calendarViewDate.getFullYear();
  const viewMonth = state.calendarViewDate.getMonth();
  const titleText = `${MONTHS_IT[viewMonth]} ${viewYear}`;

  if (elements.desktopCalTitle) elements.desktopCalTitle.textContent = titleText;
  if (elements.modalCalTitle) elements.modalCalTitle.textContent = titleText;

  const realToday = new Date();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  // Monday-first offset (0 = Lunedi, ..., 6 = Domenica)
  const firstDayDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  let html = '';

  // Trailing days from previous month
  for (let i = firstDayDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevDate = new Date(viewYear, viewMonth - 1, d);
    html += `<div class="cal-day-cell other-month" data-iso="${prevDate.toISOString()}">${d}</div>`;
  }

  // Days of current view month
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (
      viewYear === realToday.getFullYear() &&
      viewMonth === realToday.getMonth() &&
      d === realToday.getDate()
    );
    const isSelected = (
      viewYear === state.currentDate.getFullYear() &&
      viewMonth === state.currentDate.getMonth() &&
      d === state.currentDate.getDate()
    );

    // Get event count from state.monthEventDays if matching current view month
    const isViewingCurrentDataMonth = (
      state.monthDataMonth === (viewMonth + 1) &&
      state.monthDataYear === viewYear
    );
    const dayInfo = isViewingCurrentDataMonth && state.monthEventDays ? state.monthEventDays[d.toString()] : null;
    const count = dayInfo ? (state.tipoElenco === 'singolo' ? dayInfo.count : dayInfo.total) : 0;

    let badgeHtml = '';
    if (count > 0) {
      badgeHtml = `<span class="cal-cell-badge">${count}</span>`;
    }

    const thisDate = new Date(viewYear, viewMonth, d);
    html += `
      <div class="cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-iso="${thisDate.toISOString()}" data-day="${d}">
        <span class="cal-day-number">${d}</span>
        ${badgeHtml}
      </div>
    `;
  }

  // Leading days from next month to complete the row
  const remainder = (firstDayDow + daysInMonth) % 7;
  const nextDays = remainder === 0 ? 0 : 7 - remainder;
  for (let d = 1; d <= nextDays; d++) {
    const nextDate = new Date(viewYear, viewMonth + 1, d);
    html += `<div class="cal-day-cell other-month" data-iso="${nextDate.toISOString()}">${d}</div>`;
  }

  const grids = [elements.desktopCalGrid, elements.modalCalGrid];
  grids.forEach(grid => {
    if (!grid) return;
    grid.innerHTML = html;

    // Attach click listeners to all cells
    const cells = grid.querySelectorAll('.cal-day-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const iso = cell.getAttribute('data-iso');
        if (iso) {
          const clickedDate = new Date(iso);
          selectDate(clickedDate);
          closeMonthModal();
        }
      });
    });
  });
}

// Load Month Calendar (for day indicator dots with memory caching)
async function loadMonthCalendar(targetDate = state.calendarViewDate || state.currentDate, forceRefresh = false) {
  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();
  const cacheKey = `${year}_${month}`;

  if (!forceRefresh && state.monthCache && state.monthCache[cacheKey]) {
    state.monthEventDays = state.monthCache[cacheKey];
    state.monthDataMonth = month;
    state.monthDataYear = year;
    renderFullMonthCalendars();
    renderDateStrip();
    return;
  }

  try {
    const res = await fetch(`/api/calendar/month?month=${month}&year=${year}`);
    const data = await res.json();
    if (data.success && data.days) {
      if (!state.monthCache) state.monthCache = {};
      state.monthCache[cacheKey] = data.days;
      
      state.monthEventDays = data.days;
      state.monthDataMonth = month;
      state.monthDataYear = year;
      renderFullMonthCalendars();
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
      
      // Update Tab Counter
      if (state.tipoElenco === 'singolo') {
        if (elements.countSingolo) elements.countSingolo.textContent = state.appointments.length;
      } else {
        if (elements.countGlobale) elements.countGlobale.textContent = state.appointments.length;
      }

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
      renderEmptyState('Impossibile contattare il portale. Verifica la connessione o tocca Aggiorna.');
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
    renderEmptyState(state.searchQuery ? 'Nessun appuntamento corrisponde alla ricerca inserita.' : 'Nessun intervento programmato per questo giorno.');
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

// Extract Clean School Initials for Avatar
function getSchoolMonogram(name) {
  if (!name) return 'DS';
  const clean = name.replace(/^(POLO|ISTITUTO|LICEALE|COMPRENSIVO|STATALE|I\.C\.|I\.S\.|I\.S\.I\.S\.|LICEO)\s+/i, '').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 1);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Create an Appointment Card Element
function createAppointmentCard(app) {
  const card = document.createElement('div');
  card.className = `appointment-card ${app.isWebinar || app.gotoLink ? 'has-webinar' : ''}`;
  card.id = `card-app-${app.id}`;

  const hasGoto = Boolean(app.gotoLink);
  const mapUrl = `https://maps.apple.com/?q=${encodeURIComponent(app.address || (app.schoolName + ' ' + (app.city || '')))}`;
  const monogram = getSchoolMonogram(app.schoolName);

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
          ${(app.nature || 'tec').toLowerCase() === 'tec' ? '🔧 Tecnico' : '💼 Commerciale'}
        </span>
      </div>
    </div>

    <!-- School Header with Monogram Avatar -->
    <div class="school-header-block">
      <div class="school-avatar-monogram ${app.isWebinar ? 'webinar-avatar' : ''}">
        ${app.isWebinar ? '📹' : monogram}
      </div>
      <div class="school-title-text">
        <h2 class="school-title">${escapeHtml(app.schoolName || 'Intervento')}</h2>
      </div>
    </div>

    <!-- School Metadata & Badges -->
    <div class="school-meta-row">
      ${app.schoolCode ? `
        <span class="code-chip" onclick="copyText('${app.schoolCode}', 'Codice Meccanografico copiato!')" title="Tocca per copiare">
          📋 ${app.schoolCode}
        </span>
      ` : ''}

      <span class="contract-badge ${app.hasContract ? 'si' : 'no'}">
        ${app.hasContract ? '🛡️ Assistenza SI' : '⚠️ Assistenza NO'}
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--primary); flex-shrink:0;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>${escapeHtml(app.address)}</span>
        <span class="map-action-pill">Mappe ↗</span>
      </a>
    ` : ''}

    <!-- Notes / Details Box with Styled Tags -->
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
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
      <span>Genera Stanza GoTo Meeting</span>
      <span class="goto-verified-tag">Ufficiale</span>
    </button>
  `;
}

// Render Active GoTo Meeting Details & Action Hub
function renderGotoActivePanel(app) {
  const gotoLink = app.gotoLink;
  const meetingId = app.gotoMeetingId || (gotoLink.split('/').pop() || '');

  return `
    <div class="goto-active-panel">
      <div class="goto-active-header">
        <div class="goto-badge-brand">
          <span class="live-dot"></span>
          <span>GoTo Meeting Attivo</span>
        </div>
        ${meetingId ? `<span class="meeting-id-chip">#${meetingId}</span>` : ''}
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Avvia Stanza</span>
        </a>

        <button class="goto-btn-action whatsapp" onclick="shareWhatsApp('${app.id}')">
          <span>💬 Invia WhatsApp</span>
        </button>

        <button class="goto-btn-action portal-sync" id="portal-btn-${app.id}" onclick="saveLinkToPortal('${app.id}')" title="Salva nelle note del portale aziendale">
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
      <div style="text-align:center; padding:16px; color:var(--goto-purple); font-weight:800; font-size:0.92rem; display:flex; align-items:center; justify-content:center; gap:8px;">
        <span class="badge-pulse" style="background:var(--goto-purple);"></span>
        <span>Creazione stanza GoTo OAuth 2.0 in corso...</span>
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
      app.gotoMeetingId = data.meetingId;
      state.gotoLinks[appointmentId] = data;
      localStorage.setItem('agenda2_goto_links', JSON.stringify(state.gotoLinks));

      if (section) {
        section.innerHTML = renderGotoActivePanel(app);
      }

      showToast(`Stanza GoTo creata: #${data.meetingId || ''}`, '📹');
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

  const btn = document.getElementById(`portal-btn-${appointmentId}`);
  if (btn) btn.innerHTML = '<span>⏳ Salvataggio...</span>';

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
      if (btn) btn.innerHTML = '<span>✅ Salvato nel Portale</span>';
    } else {
      showToast(data.error || 'Errore salvataggio portale', '⚠️');
      if (btn) btn.innerHTML = '<span>💾 Salva su Portale</span>';
    }
  } catch (err) {
    showToast('Errore di rete', '❌');
    if (btn) btn.innerHTML = '<span>💾 Salva su Portale</span>';
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
  toast.innerHTML = `<span style="font-size:1.1rem;">${icon}</span><span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-14px) scale(0.95)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
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
      <h3 style="font-weight:900; font-size:1.15rem; margin-bottom:6px; letter-spacing:-0.3px;">Nessun Impegno</h3>
      <p style="color:var(--text-muted); font-size:0.88rem; line-height:1.5;">${escapeHtml(message)}</p>
    </div>
  `;
}

function highlightKeywords(text) {
  return text
    .replace(/(WEBINAR)/gi, '<span class="notes-tag-pill webinar">📹 $1</span>')
    .replace(/(TAGLIANDO)/gi, '<span class="notes-tag-pill tagliando">🔧 $1</span>')
    .replace(/(CORSO)/gi, '<span class="notes-tag-pill corso">🎓 $1</span>')
    .replace(/(DM 219|DM 40|DM 66|PASSWEB)/gi, '<span class="notes-tag-pill dm">📜 $1</span>');
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
