import { newId } from './db.js';

export function pushActivity(ws, type, message) {
  if (!Array.isArray(ws.activity)) ws.activity = [];
  ws.activity.unshift({ id: newId(), type, message, at: new Date().toISOString() });
  ws.activity = ws.activity.slice(0, 40);
}

export function recordEvent(ws, type, data = {}) {
  if (!Array.isArray(ws.events)) ws.events = [];
  ws.events.unshift({ id: newId(), type, at: new Date().toISOString(), ...data });
  ws.events = ws.events.slice(0, 2000);
}
