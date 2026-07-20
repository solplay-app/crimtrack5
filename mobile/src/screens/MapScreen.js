import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { Api } from "../api";
import { colors, radius, graviteColor } from "../theme/tokens";

// Style de carte sombre approximatif, pour que la carte ne jure pas avec le
// reste de l'app (thème "encre" partout ailleurs). Basé sur un thème "night"
// Google Maps standard, simplifié.
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#171d26" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#929aa8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#10141a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3342" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#10141a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a3342" }] },
];

const PARIS_FALLBACK = { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.2, longitudeDelta: 0.2 };

// Objectif : donner à l'enquêteur de terrain la même lecture de la
// concentration d'incidents que le module carte web (cahier des charges
// 3.1), pas une simple liste de points — d'où les cercles de hotspot en
// plus des marqueurs individuels.
export default function MapScreen({ navigation }) {
  const [incidents, setIncidents] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHotspots, setShowHotspots] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incidentsData, hotspotsData] = await Promise.all([
        Api.incidents({ limit: 200 }),
        Api.hotspots(),
      ]);
      const incidentsList = Array.isArray(incidentsData) ? incidentsData : incidentsData.items || [];
      setIncidents(incidentsList.filter((i) => i.latitude != null && i.longitude != null));
      setHotspots(hotspotsData || []);
    } catch (e) {
      setError(e.message || "Impossible de charger la carte");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const initialRegion =
    incidents.length > 0
      ? { latitude: incidents[0].latitude, longitude: incidents[0].longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 }
      : PARIS_FALLBACK;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.seal} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_DEFAULT}
            customMapStyle={darkMapStyle}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {showHotspots &&
              hotspots.map((h, idx) => (
                <Circle
                  key={`hotspot-${idx}`}
                  center={{ latitude: h.latitude, longitude: h.longitude }}
                  radius={h.rayon_metres}
                  strokeColor={colors.seal}
                  strokeWidth={1}
                  fillColor="rgba(194, 112, 61, 0.18)"
                />
              ))}

            {incidents.map((inc) => (
              <Marker
                key={inc.id}
                coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
                pinColor={graviteColor(inc.gravite)}
                title={inc.type_infraction}
                description={inc.adresse || undefined}
                onCalloutPress={() => navigation.navigate("Détail incident", { id: inc.id })}
              />
            ))}
          </MapView>

          <View style={styles.overlayTop}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {incidents.length} incident{incidents.length > 1 ? "s" : ""} · {hotspots.length} hotspot
                {hotspots.length > 1 ? "s" : ""}
              </Text>
            </View>
            <Pressable style={styles.toggle} onPress={() => setShowHotspots((v) => !v)}>
              <Text style={styles.toggleText}>{showHotspots ? "Masquer hotspots" : "Afficher hotspots"}</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { color: colors.textDim, textAlign: "center", marginBottom: 12 },
  retry: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingVertical: 8, paddingHorizontal: 16 },
  retryText: { color: colors.text },
  overlayTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  badge: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingVertical: 6, paddingHorizontal: 10 },
  badgeText: { color: colors.textDim, fontSize: 11 },
  toggle: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingVertical: 6, paddingHorizontal: 10 },
  toggleText: { color: colors.text, fontSize: 11 },
});
