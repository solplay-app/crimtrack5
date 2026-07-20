// CrimTrack Desktop — processus principal Electron.
//
// Mode "toujours en ligne" : contrairement à la version précédente, cette
// app ne lance plus de backend local (plus de PyInstaller embarqué, plus
// de base SQLite locale) — c'est une fenêtre qui charge directement
// l'interface servie par le backend hébergé sur Railway. Desktop et
// mobile voient donc exactement les mêmes données, en temps réel.
//
// Contrepartie assumée : l'app ne fonctionne plus hors-ligne. Si ce
// besoin revient un jour, la version précédente (avec backend local
// embarqué) est dans l'historique Git.

const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");

// URL du backend CrimTrack hébergé (Railway). À changer ici si l'adresse
// du service change un jour (nouveau domaine, migration vers un autre
// hébergeur...) — c'est le seul endroit où elle est en dur.
const REMOTE_URL = "https://crimtrack5-production.up.railway.app";

let mainWindow = null;

// La carte (Leaflet, tuiles + zoom/pan) et le graphe de relations (D3,
// simulation de forces animée en continu) sont des vues graphiquement
// lourdes. Sur Windows, certains pilotes GPU font planter le processus de
// rendu Chromium sur ce type de contenu composé/animé — symptôme classique :
// écran noir figé, spécifiquement sur ces écrans-là, rien dans les logs
// applicatifs. On désactive l'accélération matérielle pour l'éviter ; le
// coût en fluidité est negligeable pour une app de gestion de données.
app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#10141a", // cf. frontend/style.css --ink, évite un flash blanc au chargement
    // En build packagé, l'icône de la fenêtre/barre des tâches vient déjà
    // de l'exe (resources/icon.ico, cf. package.json > build.win.icon). En
    // mode dev (npm start), il n'y a pas d'exe packagé, donc on la fixe
    // explicitement pour avoir l'icône aussi pendant le développement.
    icon: app.isPackaged ? undefined : path.join(__dirname, "..", "resources", "icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(REMOTE_URL);

  // Sans backend local à attendre, la principale cause d'échec au
  // chargement devient l'absence de connexion internet (ou le serveur
  // Railway injoignable) — à distinguer clairement d'un simple bug, pour
  // que l'utilisateur sache qu'il faut vérifier sa connexion et pas
  // réinstaller l'app.
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    dialog
      .showMessageBox(mainWindow, {
        type: "error",
        buttons: ["Réessayer", "Fermer"],
        defaultId: 0,
        title: "CrimTrack — connexion impossible",
        message:
          "Impossible de joindre le serveur CrimTrack. Vérifiez votre connexion internet, " +
          `puis réessayez.\n\nDétail technique : ${errorDescription} (${errorCode})`,
      })
      .then(({ response }) => {
        if (response === 0) mainWindow.loadURL(REMOTE_URL);
        else app.quit();
      });
  });

  // Filet de sécurité : si la page se fige (JS bloqué) ou si le processus
  // de rendu plante (ex. bug natif Chromium sur certaines config
  // graphiques Windows), on propose de recharger plutôt que de laisser
  // l'utilisateur face à un écran noir sans recours.
  mainWindow.webContents.on("unresponsive", () => {
    dialog
      .showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["Recharger", "Attendre"],
        defaultId: 0,
        title: "CrimTrack — application non réactive",
        message: "L'application ne répond plus. La recharger ?",
      })
      .then(({ response }) => {
        if (response === 0) mainWindow.reload();
      });
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    dialog.showErrorBox(
      "CrimTrack — fenêtre interrompue",
      `L'affichage s'est interrompu (${details.reason}). L'application va se recharger.`
    );
    mainWindow.reload();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
