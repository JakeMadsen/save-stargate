type ClickCategory = "petition" | "gofundme" | "contact";
type ClickTrackingEvent = {
  category: ClickCategory;
  label: string;
  targetUrl: string;
  sourcePath?: string;
};

const recentClicks = new Map<string, number>();

const currentSourcePath = () => {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export const trackOutboundClick = (event: ClickTrackingEvent) => {
  if (typeof window === "undefined") return;
  const sourcePath = event.sourcePath ?? currentSourcePath();
  const dedupeKey = `${event.category}|${event.label}|${event.targetUrl}|${sourcePath}`;
  const now = Date.now();
  const lastSentAt = recentClicks.get(dedupeKey) ?? 0;
  if (now - lastSentAt < 1500) return;
  recentClicks.set(dedupeKey, now);

  const body = JSON.stringify({
    category: event.category,
    label: event.label,
    targetUrl: event.targetUrl,
    sourcePath
  });

  fetch("/api/public/clicks", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
};

export const outboundTrackingProps = (event: ClickTrackingEvent) => ({
  onPointerDown: () => trackOutboundClick(event),
  onClick: () => trackOutboundClick(event)
});
