// Mobile System Notifications & Haptic Heartbeat Vibration Engine for Toghrool PWA

/**
 * Heartbeat rhythm in milliseconds: [lub, silence, dub, silence, lub, silence, dub, silence, lub, silence, dub]
 * Rhythmic pulse mimics a real human heartbeat on mobile phones.
 */
export const HEARTBEAT_VIBRATION_PATTERN = [140, 100, 220, 350, 140, 100, 220, 350, 140, 100, 220];

/**
 * Gentle notification vibration pattern: [buzz, silence, buzz]
 */
export const GENTLE_VIBRATION_PATTERN = [120, 80, 120];

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
 * notification tray / status bar, accompanied by vibration.
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

  // 2. Validate browser Notification support & permission
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
    data: {
      url: "/",
      isLovePing,
      timestamp: Date.now()
    }
  };

  // 3. Prefer Service Worker Registration (Required for installed mobile PWAs on Android & iOS 16.4+)
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

  // 4. Fallback to standard window Notification constructor (desktop browsers, dev mode)
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
      // Gentle confirmation buzz
      triggerHardwareVibration([100, 50, 100]);
      return true;
    }
  } catch (err) {
    console.error("Error requesting notification permission:", err);
  }
  return false;
}
