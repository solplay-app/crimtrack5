import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";

import { Api, ApiError } from "../api";
import { obtenirPositionActuelle } from "../location";
import { enqueueLecture, loadQueue, markAttempt, queueCount, removeLecture } from "../anprQueue";
import { colors, radius } from "../theme/tokens";

const BEEP_URI = "data:audio/wav;base64,UklGRtAUAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YawUAAAAAPAHYg/dFfoaZx7tH3QfAx3CGPQS9ws6BDr8dvRq7YnnL+Oi4AzgdeHI5M7pOPCf94z/fwf7DocVuxpCHuUfiR80HQsZUhNjDK0Ervzj9Mrt1Odi47rgB+BT4Yvke+nT7y/3F/8NB5MOMBV6Ghse2x+cH2MdUxmuE84MIQUi/VH1Ku4h6Jfj0+AD4DPhUOQp6W/vv/ai/psGKw7YFDca8x3PH60fkB2aGQoUOQ2UBZf9v/WM7nDozePu4AHgFOEW5NfoDO9P9i7+KQbCDX8U9BnJHcEfvR+8Hd8ZZBSjDQcGC/4u9u7uv+gF5AvhAeD34N7jiOip7uD1uf22BVgNJRSvGZ4dsh/LH+YdIxq+FAwOeQZ//p32Ue8Q6T/kKuEC4Nvgp+M56EfucvVF/UMF7gzKE2kZcR2hH9cfDx5mGhYVdA7rBvT+Dfe172LpeeRJ4QXgweBy4+vn5+0E9dH80ASDDG4TIRlCHY8f4h82HqcabRXcDl0Haf999xrwtem25GvhCuCp4D7jn+eH7Zb0XfxcBBcMEBPYGBIdex/rH1we5xrDFUMPzgfd/+73gPAK6vPkjuEQ4JLgC+NU5yjtKvTp++kDqwuyEo4Y4RxlH/IfgB4mGxgWqQ8/CFEAX/jm8F/qMuWz4RngfeDa4gvnyuy+83X7dQM+C1MSQxiuHE0f+B+jHmMbbBYPELAIxgDR+E3xtupz5dnhIuBq4KviwuZt7FLzAvsBA9AK8xH2F3kcNB/8H8Qenhu/FnMQIAk7AUP5tfEN67XlAeIu4FjgfeJ75hLs5/KP+owCYgqSEagXQxwaH/4f4x7ZGxAX1xCPCa8Btfke8mbr+OUq4jvgSOBR4jXmt+t98hz6GAL0CTARWRcMHP4e/x8AHxEcYRc6Ef8JJAIn+ojywOs85lXiSeA54Cbi8eVd6xTyqfmjAYQJzRAIF9Mb4B7+Hx0fSRywF5sRbQqYApr68vIb7ILmguJa4Czg/eGu5QTrq/E3+S8BFQlpELcWmBvAHvwfNx9+HP4X/BHbCgwDDftd83fsyeaw4mzgIeDV4WzlrepD8cX4ugClCAQQZBZdG58e+B9QH7McShhcEkkLgAOB+8jz1OwS59/if+AY4K/hLOVW6tzwVPhGADQInw8QFh8bfR7yH2cf5hyVGLwStgv0A/X7NfQ=";

// Scanner live v2 :
// - caméra continue
// - cadence adaptative selon succès / alerte / offline / échec
// - bip audio + vibration
// - fenêtre de refroidissement pour éviter d'inonder le serveur
// - anti-répétition renforcé côté UX
export default function AnprScreen() {
  const cameraRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const scanBusyRef = useRef(false);
  const beepSoundRef = useRef(null);
  const recentPlatesRef = useRef({});
  const cooldownUntilRef = useRef(0);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [cameraId, setCameraId] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [scanStatus, setScanStatus] = useState("Caméra inactive.");
  const [resultat, setResultat] = useState(null);
  const [correction, setCorrection] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [position, setPosition] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastQueueMessage, setLastQueueMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanMetrics, setScanMetrics] = useState({ detections: 0, alerts: 0, offline: 0, duplicates: 0 });

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    rafraichirCompteur();
    synchroniserFile(true);
    return () => {
      stopScanLoop();
      if (beepSoundRef.current) beepSoundRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!liveMode || !scanActive) {
      stopScanLoop();
      return;
    }
    planifierScan(450);
    return () => stopScanLoop();
  }, [liveMode, scanActive]);

  function stopScanLoop() {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }

  function planifierScan(delayMs = 1300) {
    stopScanLoop();
    if (!liveMode || !scanActive) return;
    scanTimeoutRef.current = setTimeout(async () => {
      const nextDelay = await capturerEtAnalyserFrame();
      if (liveMode && scanActive) planifierScan(nextDelay);
    }, delayMs);
  }

  async function ensureBeepLoaded() {
    if (beepSoundRef.current) return beepSoundRef.current;
    const { sound } = await Audio.Sound.createAsync({ uri: BEEP_URI }, { shouldPlay: false, volume: 1.0 });
    beepSoundRef.current = sound;
    return sound;
  }

  async function playFeedbackBeep(isAlert = false) {
    if (!soundEnabled) return;
    try {
      const sound = await ensureBeepLoaded();
      await sound.replayAsync();
      if (isAlert) {
        setTimeout(() => {
          sound.replayAsync().catch(() => {});
        }, 180);
      }
    } catch {}
  }

  async function rafraichirCompteur() {
    setPendingCount(await queueCount());
  }

  function incrementeMetric(cle) {
    setScanMetrics((prev) => ({ ...prev, [cle]: (prev[cle] || 0) + 1 }));
  }

  async function choisirPhoto(depuisCamera) {
    const permission = depuisCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", depuisCamera ? "Accès à la caméra requis." : "Accès aux photos requis.");
      return;
    }

    const action = depuisCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await action({ quality: 0.8, allowsEditing: false });
    if (result.canceled) return;

    setPhoto(result.assets[0]);
    setResultat(null);
    setCorrection("");
    setLastQueueMessage("");
  }

  async function envoyerItem(item, { silent = false } = {}) {
    try {
      const data = await Api.anprDepuisImage({
        uri: item.uri,
        cameraId: item.cameraId || undefined,
        latitude: item.latitude,
        longitude: item.longitude,
        clientUid: item.clientUid,
      });
      await removeLecture(item.localId);
      await rafraichirCompteur();
      if (!silent) {
        setResultat(data);
        setCorrection(data.lecture.plaque_lue);
      }
      return { ok: true, data };
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Erreur réseau";
      await markAttempt(item.localId, message);
      await rafraichirCompteur();
      return { ok: false, error: message };
    }
  }

  async function synchroniserFile(silent = false) {
    setSyncing(true);
    try {
      const queue = await loadQueue();
      if (!queue.length) {
        if (!silent) setLastQueueMessage("Aucune lecture en attente.");
        return;
      }

      let sent = 0;
      let failed = 0;
      let dernierResultat = null;

      for (const item of queue) {
        const res = await envoyerItem(item, { silent: true });
        if (res.ok) {
          sent += 1;
          dernierResultat = res.data;
        } else {
          failed += 1;
        }
      }

      if (dernierResultat) {
        setResultat(dernierResultat);
        setCorrection(dernierResultat.lecture.plaque_lue);
      }

      if (!silent) {
        if (failed === 0) setLastQueueMessage(sent ? `${sent} lecture(s) synchronisée(s).` : "Aucune lecture en attente.");
        else setLastQueueMessage(`${sent} synchronisée(s), ${failed} encore en attente.`);
      }
    } finally {
      await rafraichirCompteur();
      setSyncing(false);
    }
  }

  async function enregistrerPuisEnvoyer(uri, sourceLabel) {
    const pos = await obtenirPositionActuelle();
    setPosition(pos);

    const item = await enqueueLecture({
      uri,
      cameraId: cameraId.trim() || undefined,
      latitude: pos?.latitude,
      longitude: pos?.longitude,
    });
    await rafraichirCompteur();

    const res = await envoyerItem(item);
    if (res.ok) {
      setLastQueueMessage(`${sourceLabel} transmise au poste de commandement.`);
      return { ok: true, data: res.data };
    }

    setLastQueueMessage(`${sourceLabel} enregistrée hors ligne. Synchronisation différée.`);
    incrementeMetric("offline");
    return { ok: false, error: res.error };
  }

  async function envoyer() {
    if (!photo) return;
    setLoading(true);
    try {
      const res = await enregistrerPuisEnvoyer(photo.uri, "Lecture");
      if (!res.ok) {
        Alert.alert(
          "Mode hors ligne",
          "La lecture a été conservée localement. Elle sera renvoyée lors d'une prochaine synchronisation."
        );
      }
    } catch (e) {
      Alert.alert(
        "Lecture impossible",
        e instanceof ApiError ? e.message : "Erreur imprévue pendant l'enregistrement de la lecture."
      );
    } finally {
      setLoading(false);
    }
  }

  function cadenceSuivante({ success = false, alert = false, duplicate = false, offline = false, error = false }) {
    if (alert) return 3600;
    if (duplicate) return 3200;
    if (offline) return 4200;
    if (error) return 2200;
    if (success) return 1100;
    return 1400;
  }

  function purgeRecentPlates(now) {
    const next = {};
    Object.entries(recentPlatesRef.current).forEach(([plaque, ts]) => {
      if (now - ts < 20000) next[plaque] = ts;
    });
    recentPlatesRef.current = next;
  }

  async function capturerEtAnalyserFrame() {
    const now = Date.now();
    if (now < cooldownUntilRef.current) {
      const attente = Math.max(500, cooldownUntilRef.current - now);
      setScanStatus(`Temporisation ${Math.ceil(attente / 1000)}s pour éviter les doublons...`);
      return attente;
    }

    if (!cameraRef.current || scanBusyRef.current) return 1200;
    scanBusyRef.current = true;
    try {
      setScanStatus("Analyse en cours...");
      const capture = await cameraRef.current.takePictureAsync({ quality: 0.4, skipProcessing: true, shutterSound: false });
      const res = await enregistrerPuisEnvoyer(capture.uri, "Capture live");

      if (!res.ok) {
        cooldownUntilRef.current = Date.now() + 3000;
        setScanStatus("Hors ligne : capture gardée localement.");
        return cadenceSuivante({ offline: true });
      }

      const data = res.data;
      const plaque = data?.lecture?.plaque_lue;
      const eventNow = Date.now();
      purgeRecentPlates(eventNow);
      const lastSeen = plaque ? recentPlatesRef.current[plaque] : null;
      const duplicateRecent = Boolean(lastSeen && eventNow - lastSeen < 15000);

      setResultat(data);
      setCorrection(data.lecture.plaque_lue);

      if (plaque) recentPlatesRef.current[plaque] = eventNow;

      if (duplicateRecent) {
        incrementeMetric("duplicates");
        cooldownUntilRef.current = eventNow + 5000;
        setScanStatus(`Plaque déjà captée récemment : ${plaque}`);
        return cadenceSuivante({ duplicate: true });
      }

      incrementeMetric("detections");
      if (data.alerte) incrementeMetric("alerts");

      cooldownUntilRef.current = eventNow + (data.alerte ? 5000 : 2400);
      await playFeedbackBeep(data.alerte);
      Vibration.vibrate(data.alerte ? [0, 200, 120, 260] : 90);

      setScanStatus(data.alerte ? `ALERTE : ${plaque}` : `Plaque captée : ${plaque}`);
      return cadenceSuivante({ success: true, alert: data.alerte });
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Erreur caméra ou réseau";
      cooldownUntilRef.current = Date.now() + 1400;
      setScanStatus(message);
      return cadenceSuivante({ error: true });
    } finally {
      scanBusyRef.current = false;
    }
  }

  async function activerLiveMode() {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert("Permission refusée", "Accès à la caméra requis pour le scanner live.");
        return;
      }
    }
    setLiveMode(true);
    setScanActive(false);
    setScanStatus("Caméra prête. Centre la plaque dans le cadre.");
    setResultat(null);
    setCorrection("");
  }

  function desactiverLiveMode() {
    stopScanLoop();
    setScanActive(false);
    setLiveMode(false);
    setScanStatus("Caméra inactive.");
  }

  function toggleScan() {
    const prochain = !scanActive;
    if (prochain) cooldownUntilRef.current = 0;
    setScanActive(prochain);
    setScanStatus(prochain ? "Scanner live démarré..." : "Scanner live en pause.");
  }

  async function envoyerCorrection() {
    if (!resultat || !correction.trim() || correction.trim() === resultat.lecture.plaque_lue) return;
    setCorrecting(true);
    try {
      const data = await Api.corrigerLectureAnpr(resultat.lecture.id, correction.trim().toUpperCase());
      setResultat({ ...resultat, ...data });
    } catch (e) {
      Alert.alert("Correction impossible", e instanceof ApiError ? e.message : "Erreur réseau.");
    } finally {
      setCorrecting(false);
    }
  }

  function reinitialiser() {
    setPhoto(null);
    setResultat(null);
    setCorrection("");
    setPosition(null);
    setLastQueueMessage("");
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Lecture de plaque</Text>
        <Text style={styles.subtitle}>Scanner live v2 : bip, cadence adaptative et anti-répétition renforcé.</Text>

        <View style={styles.queueBox}>
          <View>
            <Text style={styles.queueTitle}>Synchronisation</Text>
            <Text style={styles.queueText}>{pendingCount} lecture(s) en attente locale</Text>
            {!!lastQueueMessage && <Text style={styles.queueHint}>{lastQueueMessage}</Text>}
          </View>
          <Pressable style={styles.syncBtn} onPress={() => synchroniserFile(false)} disabled={syncing}>
            {syncing ? <ActivityIndicator color={colors.text} /> : <Text style={styles.syncBtnText}>Synchroniser</Text>}
          </Pressable>
        </View>

        <View style={styles.liveHeaderRow}>
          <Text style={styles.sectionTitle}>Scanner caméra live</Text>
          {!liveMode ? (
            <Pressable style={styles.liveToggleBtn} onPress={activerLiveMode}>
              <Text style={styles.liveToggleBtnText}>Activer</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.liveToggleBtn, styles.liveToggleBtnStop]} onPress={desactiverLiveMode}>
              <Text style={styles.liveToggleBtnText}>Fermer</Text>
            </Pressable>
          )}
        </View>

        {liveMode && (
          <View style={styles.liveCard}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={styles.cameraOverlay}>
              <View style={styles.targetBox} />
              <View style={styles.overlayBadgeRow}>
                <Text style={[styles.overlayBadge, scanActive ? styles.overlayBadgeLive : styles.overlayBadgePaused]}>
                  {scanActive ? "SCAN ACTIF" : "SCAN EN PAUSE"}
                </Text>
                <Text style={styles.overlayBadge}>SON {soundEnabled ? "ON" : "OFF"}</Text>
              </View>
              <Text style={styles.overlayGuide}>Cadre la plaque ici</Text>
            </View>

            <Text style={styles.scanStatus}>{scanStatus}</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricChip}><Text style={styles.metricText}>Détections {scanMetrics.detections}</Text></View>
              <View style={styles.metricChip}><Text style={styles.metricText}>Alertes {scanMetrics.alerts}</Text></View>
              <View style={styles.metricChip}><Text style={styles.metricText}>Offline {scanMetrics.offline}</Text></View>
              <View style={styles.metricChip}><Text style={styles.metricText}>Doublons {scanMetrics.duplicates}</Text></View>
            </View>

            <View style={styles.row}>
              <Pressable style={styles.actionBtn} onPress={toggleScan}>
                <Text style={styles.actionBtnText}>{scanActive ? "⏸ Pause scan" : "▶ Démarrer scan"}</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => setSoundEnabled((v) => !v)}>
                <Text style={styles.actionBtnText}>{soundEnabled ? "🔇 Couper son" : "🔊 Activer son"}</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => synchroniserFile(false)}>
                <Text style={styles.actionBtnText}>Envoyer attente</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Capture manuelle</Text>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Aucune photo</Text>
          </View>
        )}

        {!resultat && (
          <>
            <View style={styles.row}>
              <Pressable style={styles.actionBtn} onPress={() => choisirPhoto(true)}>
                <Text style={styles.actionBtnText}>📷 Prendre une photo</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => choisirPhoto(false)}>
                <Text style={styles.actionBtnText}>Galerie</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Secteur / poste (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={cameraId}
              onChangeText={setCameraId}
              placeholder="ex. Secteur A"
              placeholderTextColor={colors.textFaint}
            />

            <Pressable style={[styles.submitBtn, !photo && styles.submitBtnDisabled]} onPress={envoyer} disabled={!photo || loading}>
              {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.submitBtnText}>Analyser la plaque</Text>}
            </Pressable>
          </>
        )}

        {resultat && (
          <View style={styles.resultBox}>
            {resultat.alerte ? (
              <View style={styles.alertBanner}>
                <Text style={styles.alertBannerTitle}>⚠ ALERTE VÉHICULE</Text>
                <Text style={styles.alertBannerText}>{resultat.motif_alerte}</Text>
              </View>
            ) : (
              <View style={styles.okBanner}>
                <Text style={styles.okBannerText}>
                  {resultat.vehicule_reconnu ? "Véhicule reconnu, aucune alerte." : "Aucun véhicule correspondant en base."}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Plaque lue</Text>
            <View style={styles.correctionRow}>
              <TextInput style={[styles.input, styles.correctionInput]} value={correction} onChangeText={setCorrection} autoCapitalize="characters" />
              <Pressable style={styles.correctBtn} onPress={envoyerCorrection} disabled={correcting}>
                {correcting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.correctBtnText}>Corriger</Text>}
              </Pressable>
            </View>
            {resultat.lecture.confiance_ocr != null && (
              <Text style={styles.muted}>Confiance OCR : {Math.round(resultat.lecture.confiance_ocr * 100)}%</Text>
            )}
            <Text style={styles.muted}>{position ? "📍 Position enregistrée" : "📍 Position non disponible"}</Text>
            {resultat.lecture.client_uid && <Text style={styles.muted}>🆔 Référence mobile : {resultat.lecture.client_uid}</Text>}

            {resultat.candidats && resultat.candidats.length > 1 && (
              <>
                <Text style={styles.label}>Autres lectures possibles</Text>
                <View style={styles.candidatsRow}>
                  {resultat.candidats.map((c, i) => (
                    <Pressable key={i} style={styles.candidatChip} onPress={() => setCorrection(c.texte)}>
                      <Text style={styles.candidatChipText}>{c.texte}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Pressable style={styles.resetBtn} onPress={reinitialiser}>
              <Text style={styles.resetBtnText}>Nouvelle lecture</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: "600" },
  subtitle: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 16 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 10 },
  queueBox: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  queueTitle: { color: colors.text, fontWeight: "700", marginBottom: 2 },
  queueText: { color: colors.textDim, fontSize: 13 },
  queueHint: { color: colors.textFaint, fontSize: 12, marginTop: 4, maxWidth: 220 },
  syncBtn: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: "center",
  },
  syncBtnText: { color: colors.text, fontWeight: "600" },
  liveHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  liveToggleBtn: { backgroundColor: colors.seal, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius },
  liveToggleBtnStop: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  liveToggleBtnText: { color: colors.text, fontWeight: "700" },
  liveCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 12,
    marginBottom: 20,
  },
  camera: {
    width: "100%",
    height: 300,
    borderRadius: radius,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  cameraOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    height: 300,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    pointerEvents: "none",
  },
  targetBox: {
    width: "72%",
    height: 92,
    borderColor: "rgba(255,255,255,0.9)",
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginTop: 80,
  },
  overlayBadgeRow: { width: "100%", flexDirection: "row", justifyContent: "space-between" },
  overlayBadge: {
    color: colors.text,
    backgroundColor: "rgba(16,20,26,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "700",
  },
  overlayBadgeLive: { color: "#d7ffdd" },
  overlayBadgePaused: { color: "#ffd9d2" },
  overlayGuide: {
    color: colors.text,
    backgroundColor: "rgba(16,20,26,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "600",
  },
  scanStatus: { color: colors.textDim, fontSize: 13, marginTop: 12, marginBottom: 10 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  metricChip: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  preview: { width: "100%", height: 220, borderRadius: radius, marginBottom: 16, backgroundColor: colors.panel },
  placeholder: {
    width: "100%",
    height: 220,
    borderRadius: radius,
    marginBottom: 16,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: colors.textFaint },
  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, backgroundColor: colors.seal, borderRadius: radius, padding: 14, alignItems: "center" },
  actionBtnSecondary: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  actionBtnText: { color: colors.text, fontWeight: "600" },
  label: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 12,
    color: colors.text,
  },
  submitBtn: { backgroundColor: colors.seal, borderRadius: radius, padding: 16, alignItems: "center", marginTop: 20 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  resultBox: { marginTop: 4 },
  alertBanner: { backgroundColor: "rgba(189,77,63,0.15)", borderWidth: 1, borderColor: colors.danger, borderRadius: radius, padding: 14, marginBottom: 8 },
  alertBannerTitle: { color: colors.danger, fontWeight: "700", fontSize: 15 },
  alertBannerText: { color: colors.text, marginTop: 4 },
  okBanner: { backgroundColor: "rgba(92,146,104,0.12)", borderWidth: 1, borderColor: colors.ok, borderRadius: radius, padding: 14, marginBottom: 8 },
  okBannerText: { color: colors.text },
  correctionRow: { flexDirection: "row", gap: 8 },
  correctionInput: { flex: 1 },
  correctBtn: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingHorizontal: 16, justifyContent: "center" },
  correctBtnText: { color: colors.text, fontWeight: "600" },
  muted: { color: colors.textFaint, fontSize: 12, marginTop: 6 },
  candidatsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  candidatChip: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingHorizontal: 12, paddingVertical: 8 },
  candidatChipText: { color: colors.textDim, fontFamily: "monospace" },
  resetBtn: { alignItems: "center", padding: 14, marginTop: 20 },
  resetBtnText: { color: colors.textFaint },
});
