export interface ReminderEntry {
  enabled: boolean;
  times: string[];      // 'HH:MM' strings
  frequency: string;
  commonName?: string;  // sent to SW for notification title
}

export type ReminderMap = Record<string, ReminderEntry>;

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

// Call once at app startup — idempotent, safe to call multiple times.
export async function initReminders(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    console.log('[reminders] service worker ready');
  } catch (err) {
    console.error('[reminders] SW registration failed', err);
  }
}

// Send the full reminder schedule to the service worker.
export async function scheduleReminders(reminders: ReminderMap): Promise<void> {
  const sw = await getActiveSW();
  if (!sw) return;
  sw.postMessage({ type: 'SCHEDULE_REMINDERS', reminders });
  console.log('[reminders] schedule sent to SW', reminders);
}

export async function cancelAllReminders(): Promise<void> {
  const sw = await getActiveSW();
  sw?.postMessage({ type: 'CANCEL_ALL' });
}

// Register this device for server-sent push notifications and save the
// subscription to the backend so the reminder runner can reach it.
export async function subscribeToPush(userId: string): Promise<void> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) {
    console.warn('[reminders] VITE_VAPID_PUBLIC_KEY not set — skipping push subscribe');
    return;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const reg      = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub      = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: _urlBase64ToUint8Array(vapidKey),
    });

    await fetch('http://localhost:8000/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, subscription: sub.toJSON() }),
    });
    console.log('[reminders] push subscription registered');
  } catch (err) {
    console.error('[reminders] subscribeToPush failed', err);
  }
}

function _urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function getActiveSW(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg.active;
  } catch {
    return null;
  }
}
