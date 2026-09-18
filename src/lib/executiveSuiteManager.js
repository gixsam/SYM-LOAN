'use strict';
/**
 * src/lib/executiveSuiteManager.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Executive Operations Suite Engine
 *
 * Manages:
 *   1. Executive Keep Notepad (notes, checklists, pinned plans)
 *   2. Executive Calendar & Event Scheduler (meetings, field recovery dates, Google Calendar generator)
 *   3. Alarm Clock & Audio Chime Reminders
 *   4. Google Maps Location & Route Bookmarks
 */

const fs   = require('fs');
const path = require('path');

const SUITE_FILE = path.join(__dirname, '../../data/executiveSuite.json');

const DEFAULT_STATE = {
  notes: [
    {
      id: 'note_demo_1',
      title: 'Executive Meeting & Strategy Plan',
      content: '1. Review upcoming loan maturities\n2. Field recovery visits for overdue clients\n3. Coordinate weekly capital injection',
      tags: ['STRATEGY', 'MEETING'],
      color: '#f59e0b',
      pinned: true,
      updated_at: new Date().toISOString()
    }
  ],
  calendar_events: [
    {
      id: 'evt_demo_1',
      title: 'Weekly Loan Review & Strategy Meeting',
      event_date: new Date().toISOString().split('T')[0],
      event_time: '16:00',
      description: 'Review accepted loans and disbursement receipts',
      client_name: 'Executive Board',
      location: 'Central Office / Remote',
      created_at: new Date().toISOString()
    }
  ],
  alarms: [
    {
      id: 'alm_1',
      alarm_time: '13:00',
      label: 'Daily Strike Engine & Overdue Check',
      enabled: true,
      repeat: 'DAILY'
    }
  ],
  saved_locations: [
    {
      id: 'loc_office',
      name: 'SYM EMPIRE Central Office',
      address: 'Dhaka, Bangladesh',
      lat: 23.8103,
      lng: 90.4125
    }
  ]
};

let suiteState = { ...DEFAULT_STATE };

function loadSuite() {
  try {
    if (fs.existsSync(SUITE_FILE)) {
      const raw = fs.readFileSync(SUITE_FILE, 'utf8');
      suiteState = { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } else {
      suiteState = { ...DEFAULT_STATE };
      saveSuite();
    }
  } catch (err) {
    console.error('[ExecutiveSuite] Error loading data:', err.message);
    suiteState = { ...DEFAULT_STATE };
  }
}

function saveSuite() {
  try {
    const dir = path.dirname(SUITE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SUITE_FILE, JSON.stringify(suiteState, null, 2), 'utf8');
  } catch (err) {
    console.error('[ExecutiveSuite] Error saving data:', err.message);
  }
}

// Initial load
loadSuite();

const executiveSuiteManager = {
  // ─── Executive Notes (Google Keep Style) ───
  getNotes() {
    loadSuite();
    return (suiteState.notes || []).sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  },

  saveNote({ id, title, content, tags, color, pinned }) {
    loadSuite();
    if (!title && !content) {
      throw new Error('Note must have a title or content.');
    }

    const noteId = id || ('note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const existingIdx = (suiteState.notes || []).findIndex(n => n.id === noteId);

    const noteObj = {
      id: noteId,
      title: (title || 'Untitled Note').trim(),
      content: (content || '').trim(),
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : ['GENERAL']),
      color: color || '#1e293b',
      pinned: Boolean(pinned),
      updated_at: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      suiteState.notes[existingIdx] = noteObj;
    } else {
      suiteState.notes.unshift(noteObj);
    }

    saveSuite();
    return noteObj;
  },

  deleteNote(id) {
    loadSuite();
    const idx = (suiteState.notes || []).findIndex(n => n.id === id);
    if (idx === -1) return false;
    const removed = suiteState.notes.splice(idx, 1)[0];
    saveSuite();
    return removed;
  },

  // ─── Calendar & Google Calendar Integration ───
  getEvents() {
    loadSuite();
    return (suiteState.calendar_events || []).sort((a, b) => {
      const dtA = `${a.event_date}T${a.event_time || '00:00'}`;
      const dtB = `${b.event_date}T${b.event_time || '00:00'}`;
      return new Date(dtA) - new Date(dtB);
    });
  },

  createEvent(eventData) {
    loadSuite();
    if (!eventData.title || !eventData.event_date) {
      throw new Error('Event title and date are required.');
    }

    const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const timeStr = eventData.event_time || '10:00';
    const dateStr = eventData.event_date; // YYYY-MM-DD

    // Helper: Build Google Calendar Web Template URL
    // Format: YYYYMMDDTHHMMSSZ
    const cleanDate = dateStr.replace(/-/g, '');
    const cleanTime = timeStr.replace(/:/g, '') + '00';
    const startIso = `${cleanDate}T${cleanTime}`;
    // default 1 hour duration
    const endHour = String(Math.min(23, parseInt(timeStr.split(':')[0] || '10') + 1)).padStart(2, '0');
    const endIso = `${cleanDate}T${endHour}${timeStr.split(':')[1] || '00'}00`;

    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(eventData.description || 'SYM LOAN Executive Operation')}&location=${encodeURIComponent(eventData.location || 'Dhaka, Bangladesh')}`;

    const newEvent = {
      id: eventId,
      title: eventData.title.trim(),
      event_date: dateStr,
      event_time: timeStr,
      description: (eventData.description || '').trim(),
      client_name: (eventData.client_name || '').trim(),
      location: (eventData.location || 'Dhaka, Bangladesh').trim(),
      google_calendar_url: gCalUrl,
      created_at: new Date().toISOString()
    };

    suiteState.calendar_events = suiteState.calendar_events || [];
    suiteState.calendar_events.push(newEvent);
    saveSuite();
    return newEvent;
  },

  deleteEvent(id) {
    loadSuite();
    const idx = (suiteState.calendar_events || []).findIndex(e => e.id === id);
    if (idx === -1) return false;
    const removed = suiteState.calendar_events.splice(idx, 1)[0];
    saveSuite();
    return removed;
  },

  // ─── Alarm Clock Reminders ───
  getAlarms() {
    loadSuite();
    return suiteState.alarms || [];
  },

  saveAlarm({ id, alarm_time, label, enabled }) {
    loadSuite();
    suiteState.alarms = suiteState.alarms || [];
    const alarmId = id || ('alm_' + Date.now());
    const existingIdx = suiteState.alarms.findIndex(a => a.id === alarmId);

    const alarmObj = {
      id: alarmId,
      alarm_time: alarm_time || '12:00',
      label: (label || 'Executive Reminder').trim(),
      enabled: enabled !== false,
      updated_at: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      suiteState.alarms[existingIdx] = alarmObj;
    } else {
      suiteState.alarms.push(alarmObj);
    }

    saveSuite();
    return alarmObj;
  },

  deleteAlarm(id) {
    loadSuite();
    const idx = (suiteState.alarms || []).findIndex(a => a.id === id);
    if (idx === -1) return false;
    const removed = suiteState.alarms.splice(idx, 1)[0];
    saveSuite();
    return removed;
  }
};

module.exports = executiveSuiteManager;
