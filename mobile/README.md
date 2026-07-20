# CrimTrack Mobile — scaffold

Application mobile native (Expo / React Native), point d'extension prévu
par le cahier des charges section 2.3 : *« Application mobile native (le
projet cible une interface web responsive dans un premier temps) »*.

**Ceci est un scaffold, pas une app complète.** Il pose la structure,
la navigation, l'authentification et le style pour que l'équipe puisse
enchaîner directement sur les écrans métier, sans redécider l'architecture
de base à chaque fois.

## Ce qui est inclus

- Authentification (login + refresh token) via `expo-secure-store`
  (équivalent mobile du `localStorage` utilisé par le frontend web —
  mais chiffré au repos, adapté à des identifiants d'enquêteur).
- Navigation par pile (`@react-navigation/native-stack`) avec redirection
  automatique vers l'écran de connexion si aucune session valide.
- Client API (`src/api.js`) qui parle aux **mêmes endpoints FastAPI** que
  `frontend/api.js` — aucune divergence de contrat entre web et mobile.
- Jetons de design (`src/theme/tokens.js`) copiés depuis
  `frontend/style.css` pour que l'app ne soit pas un produit visuellement
  différent de la console web.
- Quatre écrans : Connexion, Tableau de bord (incidents récents + accès
  rapides), Liste des incidents, Détail d'un incident.
- Carte interactive (`src/screens/MapScreen.js`, `react-native-maps`) :
  incidents géolocalisés en marqueurs colorés par gravité + cercles de
  hotspot (`GET /incidents/analyse/hotspots`), position de l'enquêteur,
  bascule d'affichage des hotspots. Accessible depuis le tableau de bord
  et une mini-carte (lecture seule) apparaît aussi dans le détail d'un
  incident géolocalisé.

## Ce qui n'est PAS inclus (volontairement, à faire ensuite)

- Capture photo/vidéo pour l'ANPR depuis le terminal (caméra du téléphone
  → `POST /anpr/lectures/depuis-image`). La permission `CAMERA` est déjà
  déclarée dans `app.json`.
- Mode hors-ligne / file d'attente de synchronisation, important pour un
  usage terrain en zone de couverture réseau limitée.
- Notifications push (alertes de correspondance ANPR, rupture de chaîne
  de custody).
- Polices Newsreader/Inter/IBM Plex Mono embarquées via `expo-font` (le
  scaffold utilise la police système en attendant).

## Démarrer

```bash
npm install
cp .env.example .env   # renseigner EXPO_PUBLIC_API_BASE
npx expo start
```

Nécessite l'app **Expo Go** sur le téléphone (ou un simulateur
iOS/Android) pour tester sans build natif complet.

**Carte (Android uniquement) :** iOS utilise Apple Maps nativement, sans
configuration. Android nécessite une clé Google Maps SDK valide dans
`app.json` → `android.config.googleMaps.apiKey` (actuellement un
placeholder) pour que `MapScreen` s'affiche correctement.

## Build Android via GitHub Actions

`.github/workflows/build-android-mobile.yml` construit l'APK/AAB via
[EAS Build](https://docs.expo.dev/build/introduction/) (service cloud
Expo) — évite de maintenir un environnement Android SDK/NDK complet dans
le runner, fragile avec des modules natifs comme `react-native-maps`.

**Configuration à faire une seule fois :**
1. `cd mobile && npx eas login` (compte Expo gratuit), puis `npx eas init`
   pour lier le projet (ajoute un `projectId` dans `app.json`).
2. Créer un token d'accès sur
   `https://expo.dev/accounts/[compte]/settings/access-tokens`.
3. L'ajouter comme secret du dépôt GitHub sous le nom `EXPO_TOKEN`
   (*Settings → Secrets and variables → Actions*).
4. Remplacer le placeholder de clé Google Maps dans `app.json` avant un
   build `preview`/`production` si la carte doit fonctionner.

**Déclenchement :** onglet *Actions* → *Build Android Mobile App* →
*Run workflow*, en choisissant le profil (`development` / `preview` /
`production`, voir `eas.json`) — ou en poussant un tag `mobile-v*`.
L'APK (ou AAB en `production`) est publié comme artefact du run, et
comme asset de Release GitHub si déclenché par un tag.

## Sécurité

- Les jetons sont stockés via `expo-secure-store` (Keychain iOS /
  Keystore Android), jamais en clair.
- Le rôle RBAC reçu du backend (`enqueteur`, `analyste`, `opj`,
  `administrateur`) doit être utilisé pour masquer/désactiver les actions
  non autorisées, comme côté web — pas encore fait dans ce scaffold minimal.
