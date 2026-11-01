// REST API Client helper for cPanel PHP backend
// Handles automatic fallback between PHP API and Firebase

const isNativeOrExternal = typeof window !== 'undefined' && (
  (window as any).Capacitor?.isNativePlatform?.() ||
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'file:' ||
  !window.location.hostname.includes('toghrool.ir')
);

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || (isNativeOrExternal ? 'https://toghrool.ir/api.php' : '/api.php');

export async function fetchFromPhpApi(action: string, payload: any = {}, method: 'GET' | 'POST' = 'POST') {
  try {
    const timestamp = Date.now();
    let url = `${API_BASE_URL}?action=${action}&_t=${timestamp}`;
    let options: RequestInit = {
      method: method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    };

    if (method === 'GET') {
      const params = new URLSearchParams(payload);
      url += `&${params.toString()}`;
    } else {
      options.body = JSON.stringify({ action, ...payload });
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      return { status: 'offline', message: `HTTP status ${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (text.trim().startsWith("<") || (!contentType.includes("application/json") && text.trim().startsWith("<!"))) {
      // Endpoint returned HTML (e.g. Vite SPA fallback when api.php is not on this server)
      return { status: 'offline', message: 'PHP API unavailable on current host' };
    }

    return JSON.parse(text);
  } catch (error: any) {
    // Quiet handling for dev environment fallback
    return { status: 'offline', message: error.message };
  }
}
