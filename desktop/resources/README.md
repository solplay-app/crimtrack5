Ce dossier ne contient plus que l'icône de l'app (icon.ico / icon.png).

En mode "toujours en ligne" (desktop/electron/main.js charge directement
l'URL Railway), il n'y a plus de backend ni de frontend à embarquer ici —
contrairement à l'ancienne version de ce dossier, qui était remplie
automatiquement par le workflow GitHub Actions avec un exécutable backend
compilé (PyInstaller) et les fichiers du frontend statique.
