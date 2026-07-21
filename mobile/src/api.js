// ==========================================================================
// CrimTrack mobile — client API
// Miroir de frontend/api.js (mêmes routes FastAPI), adapté au stockage
// sécurisé mobile (expo-secure-store au lieu de localStorage).
// ==========================================================================
import * as SecureStore from "expo-secure-store";

// À adapter par environnement (dev/prod) — voir README pour la config via
// app.config.js/EAS une fois le scaffold transformé en vraie app.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:8000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const TokenStore = {
  async getAccess() {
    return SecureStore.getItemAsync("ct_access");
  },
  async getRefresh() {
    return SecureStore.getItemAsync("ct_refresh");
  },
  async getUser() {
    const raw = await SecureStore.getItemAsync("ct_user");
    return raw ? JSON.parse(raw) : null;
  },
  async save(tokenResponse) {
    await SecureStore.setItemAsync("ct_access", tokenResponse.access_token);
    await SecureStore.setItemAsync("ct_refresh", tokenResponse.refresh_token);
    await SecureStore.setItemAsync(
      "ct_user",
      JSON.stringify({
        role: tokenResponse.role,
        nom: tokenResponse.nom,
        prenom: tokenResponse.prenom,
      })
    );
  },
  async clear() {
    await SecureStore.deleteItemAsync("ct_access");
    await SecureStore.deleteItemAsync("ct_refresh");
    await SecureStore.deleteItemAsync("ct_user");
  },
};

let refreshInFlight = null;

async function doRefresh() {
  const refresh = await TokenStore.getRefresh();
  if (!refresh) throw new ApiError("Session expirée", 401);
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError("Session expirée", 401);
        const data = await res.json();
        await TokenStore.save(data);
        return data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request(path, opts = {}) {
  const { method = "GET", body, query, retry = true } = opts;
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }
  const access = await TokenStore.getAccess();
  const headers = { "Content-Type": "application/json" };
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && access) {
    await doRefresh();
    return request(path, { ...opts, retry: false });
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function requestMultipart(path, formData) {
  const access = await TokenStore.getAccess();
  const headers = {};
  if (access) headers.Authorization = `Bearer ${access}`;
  // Pas de Content-Type manuel : fetch doit poser lui-même le boundary
  // multipart/form-data, sinon le serveur ne peut plus parser le corps.

  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: formData });

  if (res.status === 401) {
    await doRefresh();
    return requestMultipart(path, formData);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

export const Api = {
  login: async (email, password) => {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) {
      let detail = "Email ou mot de passe incorrect";
      try {
        const b = await res.json();
        if (typeof b.detail === "string") detail = b.detail;
      } catch (_) {}
      throw new ApiError(detail, res.status);
    }
    return res.json();
  },

  me: () => request("/auth/me"),

  incidents: (query) => request("/incidents", { query }),
  incident: (id) => request(`/incidents/${id}`),
  hotspots: (query) => request("/incidents/analyse/hotspots", { query }),
  creerIncident: (payload) => request("/incidents", { method: "POST", body: payload }),
  ajouterEvenementChronologie: (incidentId, payload) =>
    request(`/incidents/${incidentId}/chronologie`, { method: "POST", body: payload }),

  creerPreuve: (payload) => request("/preuves", { method: "POST", body: payload }),
  ajouterPieceJointe: (preuveId, uri) => {
    const form = new FormData();
    form.append("fichier", { uri, name: "photo.jpg", type: "image/jpeg" });
    return requestMultipart(`/preuves/${preuveId}/pieces-jointes`, form);
  },

  personnes: () => request("/personnes"),
  vehicules: () => request("/vehicules"),

  preuves: (incidentId) => request("/preuves", { query: { incident_id: incidentId } }),
  custodyChain: (preuveId) => request(`/preuves/${preuveId}/custody`),

  relationsGraphe: (query) => request("/relations/graphe", { query }),

  lecturesAnpr: (query) => request("/anpr/lectures", { query }),

  // Envoie une photo de plaque (agent terrain) : détection + OCR + rapprochement
  // véhicules sont faits côté serveur (app/anpr_engine.py) — voir POST
  // /anpr/lectures/depuis-image dans backend/app/routers/anpr.py.
  anprDepuisImage: ({ uri, cameraId, latitude, longitude }) => {
    const form = new FormData();
    form.append("fichier", { uri, name: "plaque.jpg", type: "image/jpeg" });
    if (cameraId) form.append("camera_id", cameraId);
    if (latitude != null) form.append("latitude", String(latitude));
    if (longitude != null) form.append("longitude", String(longitude));
    return requestMultipart("/anpr/lectures/depuis-image", form);
  },

  corrigerLectureAnpr: (lectureId, plaqueLue) =>
    request(`/anpr/lectures/${lectureId}`, { method: "PATCH", body: { plaque_lue: plaqueLue } }),

  systemesNationaux: () => request("/integrations-nationales/systemes"),
};

export { ApiError };
