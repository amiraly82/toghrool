// Mobile System Notifications, Web Audio Heartbeat Synthesizer & Hardware Haptics for Toghrool
import { fetchFromPhpApi } from "../apiClient";

/**
 * Authentic rhythmic human heartbeat vibration pattern in milliseconds:
 * [lub, pause, dub, rest, lub, pause, dub, rest, lub, pause, dub]
 */
export const HEARTBEAT_VIBRATION_PATTERN = [140, 100, 220, 350, 140, 100, 220, 350, 140, 100, 220];

/**
 * Gentle notification vibration pattern
 */
export const GENTLE_VIBRATION_PATTERN = [120, 80, 120];

/**
 * Synthesizes a warm, realistic acoustic human heartbeat sound using Web Audio API.
 * This works on ALL devices including iOS/iPhone (which does not support navigator.vibrate),
 * Android, and desktop.
 */
export function playHeartbeatAudio(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const playBeat = (time: number, freq: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(28, time + duration);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime + 0.05;

    // Cycle 1: Lub-Dub
    playBeat(now, 75, 0.11, 0.45);
    playBeat(now + 0.16, 58, 0.16, 0.7);

    // Cycle 2: Lub-Dub
    playBeat(now + 0.58, 75, 0.11, 0.45);
    playBeat(now + 0.74, 58, 0.16, 0.7);

    // Cycle 3: Lub-Dub
    playBeat(now + 1.16, 75, 0.11, 0.45);
    playBeat(now + 1.32, 58, 0.16, 0.7);
  } catch (e) {
    console.warn("Heartbeat audio synthesis notice:", e);
  }
}

/**
 * Triggers hardware vibration on mobile devices (Android, Chrome, Mobile PWA).
 */
export function triggerHardwareVibration(pattern: number[] = HEARTBEAT_VIBRATION_PATTERN): boolean {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      return navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Hardware vibration failed or not supported by device/mode:", e);
    }
  }
  return false;
}

export interface ShowDeviceNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  isLovePing?: boolean;
}

/**
 * Dispatches a native mobile system notification that appears in the device's
 * notification tray / status bar, accompanied by hardware vibration and acoustic heartbeat.
 */
export async function triggerDeviceNotification({
  title,
  body,
  icon = "/icons/icon-192.png",
  badge = "/icons/icon-192.png",
  tag,
  isLovePing = false
}: ShowDeviceNotificationOptions): Promise<void> {
  const vibrationPattern = isLovePing ? HEARTBEAT_VIBRATION_PATTERN : GENTLE_VIBRATION_PATTERN;

  // 1. Immediately trigger device hardware vibration
  triggerHardwareVibration(vibrationPattern);

  // 2. If it's a love ping, play synthesized acoustic heartbeat (essential for iPhone/iOS where navigator.vibrate is missing)
  if (isLovePing) {
    playHeartbeatAudio();
  }

  // 3. Validate browser Notification support & permission
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const notificationOptions: any = {
    body,
    icon,
    badge,
    tag: tag || (isLovePing ? "toghrool_love_ping" : "toghrool_notification"),
    renotify: true,
    vibrate: vibrationPattern,
    silent: false,
    requireInteraction: isLovePing,
    data: {
      url: "/",
      isLovePing,
      timestamp: Date.now()
    }
  };

  // 4. Primary: Via Service Worker Registration (Required for installed mobile PWAs on Android & iOS 16.4+)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    } catch (swError) {
      console.warn("SW showNotification failed, trying fallback:", swError);
    }
  }

  // 5. Fallback: Standard window Notification constructor
  try {
    new Notification(title, notificationOptions);
  } catch (windowNotificationError) {
    console.warn("window Notification constructor failed:", windowNotificationError);
  }
}

/**
 * Requests system notification permission from the user.
 */
export async function requestDeviceNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      triggerHardwareVibration(HEARTBEAT_VIBRATION_PATTERN);
      playHeartbeatAudio();
      return true;
    }
  } catch (err) {
    console.error("Error requesting notification permission:", err);
  }
  return false;
}

/**
 * Converts a base64 string to a Uint8Array for PushManager subscription
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers device with browser PushManager and transmits
 * the subscription endpoint and public keys to the server.
 * Enables push notifications even when the app/browser is completely closed.
 */
export async function subscribeUserToPushNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  try {
    // 1. Fetch VAPID Public Key from backend
    const keyRes = await fetchFromPhpApi("getVapidPublicKey", {}, "GET");
    if (!keyRes || !keyRes.publicKey) {
      console.warn("Could not retrieve VAPID public key from backend");
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration || !registration.pushManager) {
      return false;
    }

    // 2. Check existing subscription or subscribe new
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(keyRes.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    if (!subscription) {
      return false;
    }

    // 3. Persist subscription keys to the server
    const subJson = subscription.toJSON();
    const saveRes = await fetchFromPhpApi("savePushSubscription", {
      subscription: {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth
        }
      }
    }, "POST");

    return !!(saveRes && saveRes.status === "success");
  } catch (err) {
    console.warn("Failed to subscribe to Web Push notifications:", err);
    return false;
  }
}
