import * as Location from "expo-location";

// Capture "best effort" : ne bloque jamais l'agent. Si la permission est
// refusée ou si le GPS n'accroche pas (intérieur, coupure, timeout...), on
// renvoie simplement null plutôt que de faire planter l'envoi en cours.
export async function obtenirPositionActuelle() {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}
