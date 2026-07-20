// Adresse de l'API backend CrimTrack.
//
// Cette copie (backend/frontend/config.js) est celle EMBARQUÉE dans
// l'image Docker et servie directement par le backend (voir Dockerfile,
// CRIMTRACK_FRONTEND_DIR) — frontend et API sont alors sur la même
// origine (ex. https://crimtrack5-production.up.railway.app), d'où
// window.location.origin plutôt qu'une adresse en dur : ça marche
// pareil que ce soit sur Railway, en local via run_desktop.py, ou sur
// n'importe quel autre domaine, sans avoir à modifier ce fichier.
//
// (Le frontend/config.js à la racine du dépôt, lui, reste en dur sur
// 127.0.0.1:8000 : c'est celui du workflow de dev avec deux serveurs
// séparés décrit dans frontend/README.md — ne pas synchroniser les deux.)
window.CRIMTRACK_API_BASE = window.location.origin;
