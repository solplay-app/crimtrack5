import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, TextInput, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { Api, ApiError } from "../api";
import { obtenirPositionActuelle } from "../location";
import { colors, radius } from "../theme/tokens";

// Flux (3 appels, dans l'ordre — cf. backend/app/routers/incidents.py et
// preuves.py, il n'existe pas de "tout en un" côté serveur) :
// 1. POST /incidents                          -> crée le signalement
// 2. POST /incidents/{id}/chronologie          -> la description part ici
//    (le modèle Incident n'a pas de champ description ; le texte libre vit
//    dans la chronologie de l'incident, comme sur la console web)
// 3. POST /preuves puis /preuves/{id}/pieces-jointes -> la photo, si prise
//    (rattachée comme une preuve avec chaîne de custody, même mécanisme
//    que les pièces jointes ajoutées depuis la console)
//
// Si l'étape 1 réussit mais 2 ou 3 échoue, l'incident existe déjà : on le
// signale clairement à l'agent plutôt que de tout annuler silencieusement.
const GRAVITES = ["faible", "moyenne", "eleve"];

export default function NewIncidentScreen({ navigation }) {
  const [typeInfraction, setTypeInfraction] = useState("");
  const [adresse, setAdresse] = useState("");
  const [gravite, setGravite] = useState("faible");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  async function choisirPhoto(depuisCamera) {
    const permission = depuisCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", depuisCamera ? "Accès à la caméra requis." : "Accès aux photos requis.");
      return;
    }
    const action = depuisCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await action({ quality: 0.7, allowsEditing: true });
    if (result.canceled) return;
    setPhoto(result.assets[0]);
  }

  async function enregistrer() {
    if (!typeInfraction.trim()) {
      Alert.alert("Type manquant", "Indique au moins le type d'infraction.");
      return;
    }
    setSaving(true);
    let incident;
    try {
      const pos = await obtenirPositionActuelle();
      incident = await Api.creerIncident({
        type_infraction: typeInfraction.trim(),
        date_heure: new Date().toISOString(),
        adresse: adresse.trim() || undefined,
        gravite,
        latitude: pos?.latitude,
        longitude: pos?.longitude,
      });
    } catch (e) {
      setSaving(false);
      Alert.alert("Échec de l'enregistrement", e instanceof ApiError ? e.message : "Erreur réseau — réessaie.");
      return;
    }

    // L'incident existe déjà à partir d'ici : on continue du mieux possible
    // et on prévient l'agent au lieu de faire comme si rien n'avait été créé.
    const echecs = [];
    const detailsEchecs = [];

    if (description.trim()) {
      try {
        await Api.ajouterEvenementChronologie(incident.id, {
          date_heure: new Date().toISOString(),
          titre: "Rapport initial (terrain)",
          description: description.trim(),
        });
      } catch (e) {
        echecs.push("la description");
        detailsEchecs.push(`Description : ${e instanceof ApiError ? e.message : "erreur inconnue"}`);
      }
    }

    if (photo) {
      try {
        const preuve = await Api.creerPreuve({
          incident_id: incident.id,
          type: "photo",
          description: "Photo prise sur le terrain",
        });
        await Api.ajouterPieceJointe(preuve.id, photo.uri);
      } catch (e) {
        echecs.push("la photo");
        detailsEchecs.push(`Photo : ${e instanceof ApiError ? e.message : "erreur inconnue"}`);
      }
    }

    setSaving(false);

    if (echecs.length > 0) {
      Alert.alert(
        "Incident créé, mais...",
        `L'incident a bien été enregistré, mais l'envoi de ${echecs.join(" et de ")} a échoué.\n\n${detailsEchecs.join("\n")}\n\nTu peux les ajouter depuis la fiche de l'incident.`,
        [{ text: "Voir l'incident", onPress: () => navigation.replace("Détail incident", { id: incident.id }) }]
      );
      return;
    }

    navigation.replace("Détail incident", { id: incident.id });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Type d'infraction *</Text>
        <TextInput
          style={styles.input}
          value={typeInfraction}
          onChangeText={setTypeInfraction}
          placeholder="ex. vol, cambriolage, vandalisme…"
          placeholderTextColor={colors.textFaint}
        />

        <Text style={styles.label}>Lieu</Text>
        <TextInput
          style={styles.input}
          value={adresse}
          onChangeText={setAdresse}
          placeholder="Adresse ou repère"
          placeholderTextColor={colors.textFaint}
        />
        <Text style={styles.hint}>La position GPS est ajoutée automatiquement à l'enregistrement.</Text>

        <Text style={styles.label}>Gravité</Text>
        <View style={styles.graviteRow}>
          {GRAVITES.map((g) => (
            <Pressable
              key={g}
              style={[styles.graviteChip, gravite === g && styles.graviteChipActive]}
              onPress={() => setGravite(g)}
            >
              <Text style={[styles.graviteChipText, gravite === g && styles.graviteChipTextActive]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Ce qui s'est passé, ce qui a été constaté…"
          placeholderTextColor={colors.textFaint}
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Photo</Text>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.hint}>Aucune photo</Text>
          </View>
        )}
        <View style={styles.row}>
          <Pressable style={styles.photoBtn} onPress={() => choisirPhoto(true)}>
            <Text style={styles.photoBtnText}>📷 Prendre une photo</Text>
          </Pressable>
          <Pressable style={[styles.photoBtn, styles.photoBtnSecondary]} onPress={() => choisirPhoto(false)}>
            <Text style={styles.photoBtnText}>Galerie</Text>
          </Pressable>
        </View>

        <Pressable style={styles.submitBtn} onPress={enregistrer} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.submitBtnText}>Enregistrer l'incident</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { padding: 20, paddingBottom: 40 },
  label: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  hint: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 12,
    color: colors.text,
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  graviteRow: { flexDirection: "row", gap: 8 },
  graviteChip: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingVertical: 10,
    alignItems: "center",
  },
  graviteChipActive: { backgroundColor: colors.sealDim, borderColor: colors.seal },
  graviteChipText: { color: colors.textDim, fontSize: 12 },
  graviteChipTextActive: { color: colors.text, fontWeight: "600" },
  preview: { width: "100%", height: 180, borderRadius: radius, backgroundColor: colors.panel },
  placeholder: {
    width: "100%",
    height: 100,
    borderRadius: radius,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  photoBtn: { flex: 1, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: 12, alignItems: "center" },
  photoBtnSecondary: {},
  photoBtnText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  submitBtn: { backgroundColor: colors.seal, borderRadius: radius, padding: 16, alignItems: "center", marginTop: 28 },
  submitBtnText: { color: colors.text, fontWeight: "700", fontSize: 15 },
});
