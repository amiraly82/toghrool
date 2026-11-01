// REST API Client helper for cPanel PHP backend
// Manages sliding token authentication, CORS whitelist compliance, and 401 handling

const isNativeOrExternal = typeof window !== 'undefined' && (
  (window as any).Capacitor?.isNativePlatform?.() ||
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'file:' ||
  !window.location.hostname.includes('toghrool.ir')
);

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || (isNativeOrExternal ? 'https://toghrool.ir/api.php' : '/api.php');

const TOKEN_STORAGE_KEY = 'toghrool_auth_token';
let inMemoryToken: string | null = null;

// Retrieve auth token from memory, localStorage, or Capacitor Preferences
export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      inMemoryToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    }
  } catch (e) {
    // LocalStorage restricted or disabled
  }
  return inMemoryToken;
}

// Persist auth token across web and Capacitor environments
export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    // Capacitor Preferences plugin support if available in runtime
    const capPreferences = (window as any).Capacitor?.Plugins?.Preferences;
    if (capPreferences) {
      if (token) {
        capPreferences.set({ key: TOKEN_STORAGE_KEY, value: token }).catch(() => {});
      } else {
        capPreferences.remove({ key: TOKEN_STORAGE_KEY }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("Could not persist auth token:", e);
  }
}

// Clear all credentials upon logout or 401 unauthorized
export function clearAuthSession() {
  setAuthToken(null);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem("custom_user_session");
      localStorage.removeItem("cached_user_profile");
    }
  } catch (e) {}
}

// Automatically navigate user back to login when unauthorized
export function handleUnauthorizedSession() {
  clearAuthSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toghrool:unauthorized'));
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }
}

export async function fetchFromPhpApi(action: string, payload: any = {}, method: 'GET' | 'POST' = 'POST') {
  try {
    const timestamp = Date.now();
    let url = `${API_BASE_URL}?action=${action}&_t=${timestamp}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };

    // Attach authorization bearer and cPanel fallback token header
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Auth-Token'] = token;
    }

    let options: RequestInit = {
      method: method,
      cache: 'no-store',
      headers: headers
    };

    if (method === 'GET') {
      const params = new URLSearchParams(payload);
      url += `&${params.toString()}`;
    } else {
      options.body = JSON.stringify({ action, ...payload });
    }

    const response = await fetch(url, options);

    // 401 Unauthorized handling: redirect to login
    if (response.status === 401) {
      if (action !== 'login' && action !== 'register') {
        handleUnauthorizedSession();
      }
      try {
        const errJson = await response.json();
        return { status: 'error', code: 'UNAUTHORIZED', message: errJson.message || 'نشست شما معتبر نیست یا منقضی شده است.' };
      } catch {
        return { status: 'error', code: 'UNAUTHORIZED', message: 'نشست شما معتبر نیست.' };
      }
    }

    // 429 Too Many Requests handling
    if (response.status === 429) {
      try {
        const errJson = await response.json();
        return { status: 'error', code: 'RATE_LIMITED', message: errJson.message || 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً بعداً دوباره امتحان کنید.' };
      } catch {
        return { status: 'error', code: 'RATE_LIMITED', message: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است.' };
      }
    }

    if (!response.ok) {
      try {
        const errJson = await response.json();
        return { status: 'error', code: `HTTP_${response.status}`, message: errJson.message || `خطای ارتباط (${response.status})` };
      } catch {
        return { status: 'offline', message: `HTTP status ${response.status}` };
      }
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (text.trim().startsWith("<") || (!contentType.includes("application/json") && text.trim().startsWith("<!"))) {
      // Endpoint returned HTML (e.g. Vite SPA fallback when api.php is not on this server)
      return { status: 'offline', message: 'PHP API unavailable on current host' };
    }

    const data = JSON.parse(text);

    // Automatically store raw token upon successful login or registration
    if (data && data.status === 'success' && data.token) {
      setAuthToken(data.token);
    }

    return data;
  } catch (error: any) {
    // Quiet handling for dev environment fallback
    return { status: 'offline', message: error.message };
  }
}
