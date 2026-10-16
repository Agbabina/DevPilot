import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";

const VISITOR_KEY = "devpilot_visitor_id";
const LAST_VISIT_KEY = "devpilot_last_visit_date";

function getVisitorId() {
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "visitor-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

/** Counts one anonymous browser visit per UTC day. No IP address or page content is sent. */
export default function AnalyticsTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(LAST_VISIT_KEY) === today) return;
      const visitorId = getVisitorId();
      void api.post("/analytics/visit", { visitorId, path: pathname })
        .then(() => localStorage.setItem(LAST_VISIT_KEY, today))
        .catch(() => undefined);
    } catch {
      // Analytics must never prevent the app from working.
    }
  }, [pathname]);

  return null;
}
