import * as FileSystem from "expo-file-system";

const QUEUE_FILE = `${FileSystem.documentDirectory}anpr-queue.json`;
const CAPTURES_DIR = `${FileSystem.documentDirectory}anpr-captures`;

function makeId(prefix = "anpr") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CAPTURES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CAPTURES_DIR, { intermediates: true });
  }
}

export async function loadQueue() {
  try {
    const info = await FileSystem.getInfoAsync(QUEUE_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(QUEUE_FILE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue) {
  await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(queue));
}

export async function enqueueLecture({ uri, cameraId, latitude, longitude }) {
  await ensureDir();
  const localId = makeId("local");
  const clientUid = makeId("client");
  const destination = `${CAPTURES_DIR}/${localId}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: destination });

  const queue = await loadQueue();
  const item = {
    localId,
    clientUid,
    uri: destination,
    cameraId: cameraId || null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

export async function markAttempt(localId, lastError = null) {
  const queue = await loadQueue();
  const next = queue.map((item) =>
    item.localId === localId
      ? { ...item, attempts: (item.attempts || 0) + 1, lastError }
      : item
  );
  await saveQueue(next);
}

export async function removeLecture(localId) {
  const queue = await loadQueue();
  const item = queue.find((entry) => entry.localId === localId);
  const next = queue.filter((entry) => entry.localId !== localId);
  await saveQueue(next);
  if (item?.uri) {
    try {
      await FileSystem.deleteAsync(item.uri, { idempotent: true });
    } catch {}
  }
}

export async function queueCount() {
  const queue = await loadQueue();
  return queue.length;
}
