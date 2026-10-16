import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

function visitorId(): string {
  const key = 'devpilot_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'visitor-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    // Keep internal admin traffic out of product adoption metrics.
    if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) return;
    try {
      void api.post('/analytics/visit', { visitorId: visitorId(), path: location.pathname }).catch(() => {
        // Analytics must never block navigation if the API is sleeping or offline.
      });
    } catch {
      // Local storage may be disabled; fail silently rather than disrupting the app.
    }
  }, [location.pathname]);
  return null;
}
