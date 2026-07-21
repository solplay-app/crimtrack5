import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, TextInput, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { Api, ApiError } from "../api";
import { obtenirPositionActuelle } from "../location";
import { colors, radius } from "../theme/tokens";

// Flux : photo de plaque -> POST /anpr/lectures/depuis-image (détection +
// OCR + rapprochement véhicules déjà faits côté serveur, app/anpr_engine.py)
// -> alerte visuelle si le véhicule reconnu est signalé/volé. L'agent peut
// corriger la plaque si l'OCR s'est trompé (PATCH /anpr/lectures/{id}).
//
// La position GPS est capturée automatiquement au moment de l'envoi (best
// effort — si l'agent refuse la permission ou si le GPS est indisponible
// à cet instant, la lecture part quand même, juste sans coordonnées).
export default function AnprScreen() {
  const [photo, setPhoto] = useState(null);
  const [cameraId, setCameraId] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [correction, setCorrection] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [position, setPosition] = useState(null);

  async function choisirPhoto(depuisCamera) {
    const permission = depuisCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", depuisCamera ? "Accès à la caméra requis." : "Accès aux photos requis.");
      return;
    }

    const action = depuisCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await action({ quality: 0.8, allowsEditing: true });
    if (result.canceled) return;

    setPhoto(result.assets[0]);
    setResultat(null);
    setCorrection("");
  }

  async function envoyer() {
    if (!photo) return;
    setLoading(true);
    try {
      const pos = await obtenirPositionActuelle();
      setPosition(pos);
      const data = await Api.anprDepuisImage({
        uri: photo.uri,
        cameraId: cameraId.trim() || undefined,
        latitude: pos?.latitude,
        longitude: pos?.longitude,
      });
      setResultat(data);
      setCorrection(data.lecture.plaque_lue);
    } catch (e) {
      Alert.alert(
        "Lecture impossible",
        e instanceof ApiError ? e.message : "Erreur réseau — vérifie ta connexion et réessaie."
      );
    } finally {
      setLoading(false);
    }
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
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Lecture de plaque</Text>
        <Text style={styles.subtitle}>Photographie une plaque pour la vérifier contre la base des véhicules signalés.</Text>

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

            <Pressable
              style={[styles.submitBtn, !photo && styles.submitBtnDisabled]}
              onPress={envoyer}
              disabled={!photo || loading}
            >
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
              <TextInput
                style={[styles.input, styles.correctionInput]}
                value={correction}
                onChangeText={setCorrection}
                autoCapitalize="characters"
              />
              <Pressable style={styles.correctBtn} onPress={envoyerCorrection} disabled={correcting}>
                {correcting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.correctBtnText}>Corriger</Text>}
              </Pressable>
            </View>
            {resultat.lecture.confiance_ocr != null && (
              <Text style={styles.muted}>Confiance OCR : {Math.round(resultat.lecture.confiance_ocr * 100)}%</Text>
            )}
            <Text style={styles.muted}>{position ? "📍 Position enregistrée" : "📍 Position non disponible"}</Text>

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
  subtitle: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 20 },
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
  row: { flexDirection: "row", gap: 10, marginBottom: 16 },
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
