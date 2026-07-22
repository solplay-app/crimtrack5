--
-- PostgreSQL database dump
--

\restrict CaWpwc6zgfTlX1DhEmg60SLgZI1LoopfOOj95dLLW2h8esIvbZ4pFA9ULjV6qh6

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.4

SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incidents (id, type_infraction, date_heure, latitude, longitude, adresse, statut, gravite, unite_en_charge) FROM stdin;
8efefffe-23f4-4e78-805b-420b0eda4fb2	vol	2026-07-20 17:32:14.184327	48.8366	2.3322	Secteur A	ouvert	faible	Unité Centre
42fdb425-c833-4cd9-9d0c-eac35c6f108d	cambriolage	2026-07-18 17:32:14.185494	48.8466	2.3422	Secteur B	en_cours	moyenne	Unité Nord
3508bbc7-d883-4146-82a6-16a2f9f356fe	trafic	2026-07-16 17:32:14.185863	48.8566	2.3522	Secteur C	ouvert	haute	Unité Centre
e13d0dc4-501a-47a4-931f-c94bbf8fde3f	vandalisme	2026-07-14 17:32:14.186172	48.8666	2.3621999999999996	Secteur D	clos	faible	Unité Nord
7767fb81-92f5-4719-940c-06c238aa70ed	agression	2026-07-12 17:32:14.186497	48.8766	2.3722	Secteur E	en_cours	critique	Unité Centre
6ae3ddc7-f17b-4618-996c-dd046ba65175	vol	2026-07-10 17:32:14.186797	48.9066	2.4021999999999997	Secteur F	ouvert	faible	Unité Nord
ee2596c7-0450-49d4-8d5a-df32d5411055	vol	2026-07-08 17:32:14.187085	48.9069	2.4025	Secteur G	ouvert	moyenne	Unité Centre
\.


--
-- Data for Name: preuves; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.preuves (id, incident_id, type, description, hash_integrite, localisation_stockage) FROM stdin;
6dc34710-ef7c-455f-84a8-42c46b94cab5	42fdb425-c833-4cd9-9d0c-eac35c6f108d	objet	Outil d'effraction retrouvé sur les lieux	552cbe3b4c651183fd63b2e29b9e02b6240fa243f615cfab9708de0c7a324f0d	Scellé n°2026-014, armoire B3
\.


--
-- Data for Name: utilisateurs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.utilisateurs (id, email, hashed_password, nom, prenom, role, actif, date_creation) FROM stdin;
09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	$2b$12$/BcNzDXkwjkPzgZ7/1nPs.Q1LqK22vT24TNoQoKNcWF4XL5ntKzLK	Admin	CrimTrack	administrateur	t	2026-07-20 17:32:13.243327
9a8e54ed-3cb2-449d-8801-0723866ea93a	opj@crimtrack.local	$2b$12$8AcFc.YQ6XoEGxbAt3F04e7cPKUvJjxv.HpMIBsk9dDSuJ4x4v/Wi	Diallo	Fatou	opj	t	2026-07-20 17:32:13.243356
28a85090-2507-43cc-888c-9b392957c995	enqueteur@crimtrack.local	$2b$12$yUci6QKxmI/OX5IZjJ6UoOS7tcdUqFyFFw/hFqZSmhF5FVqpA6eUe	Bernard	Léo	enqueteur	t	2026-07-20 17:32:13.243373
c226cab3-7363-433c-961f-40683282a038	analyste@crimtrack.local	$2b$12$ec419K5K.ZtbEoCxUxECQe4RDwM5zONEJxIs19A/iUjXERBZRIJP2	Costa	Inès	analyste	t	2026-07-20 17:32:13.243389
80313bca-1bb3-4eae-971f-324603fa7372	stephanegue6@gmail.com	$2b$12$8aryxbXpNe31v5bdPcgvJOQyvWzwG4lCFWG/D1pztze5poZBV.IJW	gueu	stephane	opj	t	2026-07-20 18:04:02.005855
6ffbc54b-960b-4a97-b485-faeb1de3a21d	stephanegue@gmail.com	$2b$12$CcZPCPj/6e60/k1ozgYUd.gtDfk6bIlB4PVR.u5zleNSxzw5ieE36	gueu	stephane	enqueteur	t	2026-07-20 18:25:37.402666
\.


--
-- Data for Name: chaine_custody; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chaine_custody (id, preuve_id, utilisateur_id, date_heure, action, horodatage_hash) FROM stdin;
ee40b4de-66b4-48d8-b563-a4cbc7b309f0	6dc34710-ef7c-455f-84a8-42c46b94cab5	9a8e54ed-3cb2-449d-8801-0723866ea93a	2026-07-20 17:32:15.119805	collecte	552cbe3b4c651183fd63b2e29b9e02b6240fa243f615cfab9708de0c7a324f0d
\.


--
-- Data for Name: evenements_chronologie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evenements_chronologie (id, incident_id, date_heure, titre, description, origine, ressource_type, ressource_id, auteur_id, date_creation) FROM stdin;
\.


--
-- Data for Name: personnes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personnes (id, nom, prenom, date_naissance, role, signalement, photo_ref, statut) FROM stdin;
0fb98554-d20d-45f7-9f4e-c8b75e80bcf3	Marchal	Damien	\N	suspect	\N	\N	actif
a038e64b-932f-41be-9251-c48176e1f260	Ilhem	Karim	\N	suspect	\N	\N	actif
954e2a39-b62a-438a-88ab-02dba141ba86	Voss	Romane	\N	témoin	\N	\N	actif
4fbae201-1d83-443b-afb0-04efbcc15588	Nadeau	Sacha	\N	suspect	\N	\N	actif
43ad19b8-d4f4-4164-9949-d0cdd56eec23	Okoye	Tobi	\N	victime	\N	\N	actif
18709a17-be32-4ab2-8d0f-61a5a8aae5a0	Lefort	Manon	\N	suspect	\N	\N	actif
bfe95db8-e3c6-4a1d-a0c3-aa37f8131417	Benali	Amine	\N	témoin	\N	\N	actif
25c9e66a-9455-4668-a60f-ed68bb6aae12	Petit	Julie	\N	suspect	\N	\N	actif
\.


--
-- Data for Name: incident_personnes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incident_personnes (incident_id, personne_id, role_dans_incident) FROM stdin;
\.


--
-- Data for Name: vehicules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicules (id, plaque_immatriculation, marque, modele, couleur, proprietaire_id, statut) FROM stdin;
96de57a1-d9bc-4f25-abf9-9c20996b9879	AB-123-CD	\N	\N	\N	0fb98554-d20d-45f7-9f4e-c8b75e80bcf3	normal
77d5afa5-6e7f-42dc-9d72-982594967f68	EF-456-GH	\N	\N	\N	4fbae201-1d83-443b-afb0-04efbcc15588	normal
5c9decfd-2ef8-4a12-a350-5ac01a1654e4	IJ-789-KL	\N	\N	\N	25c9e66a-9455-4668-a60f-ed68bb6aae12	volé
\.


--
-- Data for Name: incident_vehicules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incident_vehicules (incident_id, vehicule_id) FROM stdin;
\.


--
-- Data for Name: journal_audit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.journal_audit (id, utilisateur_id, utilisateur_email, action, ressource_type, ressource_id, date_heure, details, adresse_ip) FROM stdin;
d1f419db-33e1-4588-9525-0bb5af05592d	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 14:56:56.087128	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.7
998391e7-0f20-4634-a7fd-6e3963ff6ed0	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 14:57:01.348327	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.8
20d26664-b5b0-4b6b-aa9c-810fe4962d6d	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 14:57:39.481503	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.9
2209e004-f00e-4fd8-a81a-e4e065994aa3	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 14:58:19.486235	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.4
76560f5b-c483-421c-94c0-e44bfcfc3d0b	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:00:13.514701	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.10
8d5028d9-b12f-4453-9218-14c0d5dc9cf3	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:02:27.867376	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.15
335e580a-762d-438f-9f25-e8d9c77b5b41	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:02:39.690908	Tentative avec l'identifiant 'enqueteur@ctimtrack.local'	100.64.0.7
284024b3-722a-46ea-8fa4-d4a1c6b61db4	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:02:40.891616	Tentative avec l'identifiant 'enqueteur@ctimtrack.local'	100.64.0.14
19e1fb52-f550-4d84-917b-a7970afcb426	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:04:00.135471	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.18
4e7f653f-cacf-4c1d-9f5e-cd4a65de6fbe	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:14:40.4946	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.18
4c0f48e4-c8e3-436d-a77e-0ec93380c751	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:16:26.935963	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.20
5f556ae9-dcbc-45e7-abb2-4aa6e95a6908	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:43:07.560435	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.9
2b88ee0d-5214-4538-8285-95fea924aac9	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:43:19.903366	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.5
98ed8dbd-70fc-4035-925b-2e3bd70a6809	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:44:17.522095	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.10
2976440f-b0bd-43f1-8c8f-bf41a250a2b7	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:45:36.246409	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.9
d6747e4b-bb6e-4625-8211-ffd841f5d9ea	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 15:45:43.610976	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.11
8f0ae4f8-2f5c-4f1a-b3de-11a397cfec2a	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 17:37:16.578493	\N	100.64.0.17
c1d59a91-d571-44d7-bfd3-c493dfe19bf1	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 17:39:29.390917	\N	100.64.0.17
83838687-fff1-41fc-a450-b1d2197cc651	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	export	incident	\N	2026-07-20 17:40:15.449266	Export PDF de 7 incident(s)	100.64.0.4
5681bd06-99cd-4eaa-a7b4-cf3061e43ada	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 17:53:48.611677	\N	100.64.0.12
6ae0015e-480d-4539-b42e-e2c80f8621cb	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 17:55:22.630469	\N	100.64.0.21
90c8c12a-d2c4-4845-8877-7dd2b03714d5	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	creation	lecture_anpr	e3b8fafb-e9ba-413d-8aaf-1902ff7af415	2026-07-20 17:57:27.53276	Plaque AA-059-AA	100.64.0.7
6ed66cbb-c9bd-4f4c-ae39-27f016fe35ee	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	consultation	lecture_anpr	e3b8fafb-e9ba-413d-8aaf-1902ff7af415	2026-07-20 17:59:07.878167	Consultation de l'image source	100.64.0.23
8c7f51bf-37c9-4451-8768-8993e73bedeb	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 18:02:48.742564	\N	100.64.0.3
f5670d25-cbd0-4bf8-9552-25011c9b38fb	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	creation	utilisateur	80313bca-1bb3-4eae-971f-324603fa7372	2026-07-20 18:04:02.013879	Compte créé pour stephanegue6@gmail.com (rôle opj)	100.64.0.11
7f08b9b8-4203-47dc-a151-109169f8312e	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 18:04:55.081957	\N	100.64.0.7
08095867-74d3-4c1d-adc0-c71d2cb45646	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 18:13:10.442075	\N	100.64.0.3
aaba8d0f-c003-429a-9cc7-323b9b7aa374	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 18:19:21.828756	\N	100.64.0.12
f029c7fd-955f-4c55-ba9b-155851de14a3	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 18:22:48.38643	\N	100.64.0.3
ebb73304-0a49-4d81-8974-5933f7cc26c0	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	creation	utilisateur	6ffbc54b-960b-4a97-b485-faeb1de3a21d	2026-07-20 18:25:37.408693	Compte créé pour stephanegue@gmail.com (rôle enqueteur)	100.64.0.12
a0eb1dba-b8a9-481b-8556-2c4c52043445	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 19:23:49.965686	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.6
d8f824df-7cf5-4482-b132-9b359c2a15d3	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 19:24:50.723637	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.7
58f7a0dc-c2f8-4644-a6e7-edabc6898eda	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 19:26:07.156572	\N	100.64.0.8
ad8502bd-0415-4e2c-9a5c-929499ec08f9	\N	\N	echec_connexion	utilisateur	\N	2026-07-20 20:24:39.98117	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.3
4cd9685d-aa91-4fd5-8c26-3ae737267d53	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 20:25:30.844739	\N	100.64.0.13
5e184eda-fe93-4c3b-8bea-be173d623529	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-20 20:42:00.105004	\N	100.64.0.6
c27ca01d-92bc-4719-9eb6-01db5e218521	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-21 00:16:23.342325	\N	100.64.0.2
7c330e91-a1d8-40e3-a393-2438f9832bfa	\N	\N	echec_connexion	utilisateur	\N	2026-07-21 00:18:09.920125	Tentative avec l'identifiant 'enqueteur@ctimtrack.local'	100.64.0.9
9119a716-ef31-4865-8332-16e9730fcf3c	\N	\N	echec_connexion	utilisateur	\N	2026-07-21 00:18:34.05419	Tentative avec l'identifiant 'enqueteur@ctimtrack.local'	100.64.0.8
3289d6e5-e320-4cd9-a329-d878d9c0d0e7	\N	\N	echec_connexion	utilisateur	\N	2026-07-21 00:18:37.937181	Tentative avec l'identifiant 'enqueteur@ctimtrack.local'	100.64.0.10
4fccba2a-1e12-4564-8975-e25d43796425	\N	\N	echec_connexion	utilisateur	\N	2026-07-21 00:18:39.562304	Tentative avec l'identifiant 'enqueteur@ctimtrack.local'	100.64.0.2
acb492e4-9b11-4e86-a6cc-f64ceeac8ffc	9a8e54ed-3cb2-449d-8801-0723866ea93a	opj@crimtrack.local	connexion	utilisateur	9a8e54ed-3cb2-449d-8801-0723866ea93a	2026-07-21 00:19:41.32849	\N	100.64.0.5
6a453837-747a-4bcd-8bea-94416d8806ea	\N	\N	echec_connexion	utilisateur	\N	2026-07-21 10:54:56.149036	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.7
29d0255b-b75a-4965-ade1-49411950ada0	\N	\N	echec_connexion	utilisateur	\N	2026-07-21 10:55:07.41141	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.8
2ab341d6-2521-4f8e-80f6-8a4074b0a3fe	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-21 10:55:26.902292	\N	100.64.0.9
2602643d-10b3-46d9-9818-b49a1eaba6a2	\N	\N	echec_connexion	utilisateur	\N	2026-07-21 10:56:46.305511	Tentative avec l'identifiant 'admin@crimtrack.local'	100.64.0.14
3f00bf1f-9188-4331-81b6-df39a72d99d4	09c5d823-4458-4848-bdff-64b9d4df198a	admin@crimtrack.local	connexion	utilisateur	09c5d823-4458-4848-bdff-64b9d4df198a	2026-07-21 10:58:10.948093	\N	100.64.0.15
\.


--
-- Data for Name: lectures_anpr; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lectures_anpr (id, plaque_lue, date_heure, latitude, longitude, camera_id, confiance_ocr, vehicule_id, source, image_chemin, image_hash_sha256, video_chemin, video_timestamp_s) FROM stdin;
22dca0b4-4dc8-47e6-8fd6-c4216321a477	IJ-789-KL	2026-07-20 15:32:15.125677	48.8586	2.3541999999999996	CAM-A12	0.94	5c9decfd-2ef8-4a12-a350-5ac01a1654e4	manuel	\N	\N	\N	\N
957cdb94-bcb3-4c44-940b-a224d6be9014	AB-123-CD	2026-07-20 12:32:15.129731	48.8556	2.3562	CAM-B03	0.88	96de57a1-d9bc-4f25-abf9-9c20996b9879	manuel	\N	\N	\N	\N
e3b8fafb-e9ba-413d-8aaf-1902ff7af415	AA-059-AA	2026-07-20 17:57:27.522357	\N	\N	\N	0.12	\N	image	c4ff2525-53c1-4169-a31a-989acd61a7b0.bin	49308b61cca87630969865865b95a98e05eeeab9fffc8708bfa012ba3d084d69	\N	\N
\.


--
-- Data for Name: pieces_jointes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pieces_jointes (id, preuve_id, nom_fichier, chemin_stockage, type_mime, taille_octets, hash_sha256, ajoute_par_id, date_ajout) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, utilisateur_id, token_hash, date_creation, date_expiration, revoked) FROM stdin;
703497f5-3d82-4246-a1cb-47c5fb52d9c1	09c5d823-4458-4848-bdff-64b9d4df198a	cde0c1b9fac99d2b757d2f709ffdb8f6e71753c095e1d78a7a000ec2cbe6bd52	2026-07-20 17:37:16.569078	2026-08-03 17:37:16.567855	f
93a8842a-b2f9-4b1c-8708-5d8e36a20748	09c5d823-4458-4848-bdff-64b9d4df198a	fd6c5a15601382d7694b8b99d190b05c2efb5fc5a743f31f640b58621d9eb6b1	2026-07-20 17:39:29.386011	2026-08-03 17:39:29.3856	f
425cb505-2177-466e-a549-808a39565e6b	09c5d823-4458-4848-bdff-64b9d4df198a	af2cad1bb37022d867cc43c79deb6eb45f4569e6cd54e980a75d345f41d853bc	2026-07-20 17:53:48.604952	2026-08-03 17:53:48.604564	f
caa56f41-4e43-4c5d-bef2-1ddbdb93b099	09c5d823-4458-4848-bdff-64b9d4df198a	4020c8233ee95f55862724e341c7c0ce0ff3fb4357dfb824033ce6d1a0b70505	2026-07-20 17:55:22.625061	2026-08-03 17:55:22.624638	f
320a5de6-c60c-46d3-a278-15e6d16f6478	09c5d823-4458-4848-bdff-64b9d4df198a	b8f6c096f0a603f0d2be79af7704795f35fbe8fb988d6b36ab5f65ef833cd23d	2026-07-20 18:02:48.73655	2026-08-03 18:02:48.736106	f
7860bc28-de64-41de-b45c-08544043cca0	09c5d823-4458-4848-bdff-64b9d4df198a	f3d794c1e55a4478b4df990f0ec69d1a18daabd65f8f37950aceaf0280edca5f	2026-07-20 18:04:55.075117	2026-08-03 18:04:55.074744	f
6ea50866-98bd-4acf-821e-682465485e6f	09c5d823-4458-4848-bdff-64b9d4df198a	35a5289584715bf4464c6449943ecfcc6b0c36bd5aeee18feba4426743e0f02a	2026-07-20 18:13:10.433563	2026-08-03 18:13:10.433119	f
2d18dc80-6237-430c-ba1f-de39c51c3fd9	09c5d823-4458-4848-bdff-64b9d4df198a	9613399ff7f5a9444699cbb3766b670909b7c9ec7115b3ab5d162791048502eb	2026-07-20 18:19:21.822821	2026-08-03 18:19:21.822433	f
a280cb85-fc2d-4bf2-ab34-c46f7bbbfd50	09c5d823-4458-4848-bdff-64b9d4df198a	823646a7de467f12531668bf135549fe916ff92741c54fd6648ba8a705e690c6	2026-07-20 18:22:48.378455	2026-08-03 18:22:48.378079	f
3b6f3da0-9b11-45fe-841a-9d82b9610a49	09c5d823-4458-4848-bdff-64b9d4df198a	910751ad5587333490139d66d5ae5d08505e3f76c2b5fc74602827c3c98baefb	2026-07-20 19:26:07.137743	2026-08-03 19:26:07.136136	f
e8679705-6695-4ab9-a217-87a0c24fd1fb	09c5d823-4458-4848-bdff-64b9d4df198a	fc6791e100e7c9d94289309acf47431f053e343fab746d2a4717d880b96c7dfd	2026-07-20 20:25:30.819968	2026-08-03 20:25:30.81948	f
43efae74-b055-4eb8-9ed6-0b291226ba66	09c5d823-4458-4848-bdff-64b9d4df198a	1681e2092de4db4bc654f80411442733b92fd7fb2310c6eccfbc1df768c667e1	2026-07-20 20:42:00.084377	2026-08-03 20:42:00.083854	f
7e7c9773-4a1d-4e89-b960-6897d3f10066	09c5d823-4458-4848-bdff-64b9d4df198a	992508969b8d20ce1254f327da3209b3f331f05c075dedbeda59891f979a93e7	2026-07-21 00:16:23.324275	2026-08-04 00:16:23.322459	f
8620ad22-ae53-44b9-b246-230d7e2ddccf	9a8e54ed-3cb2-449d-8801-0723866ea93a	3fc1d799a30d92bddf96626778271946e34ffc4ff24bb78b460ec3bc8e42e3fa	2026-07-21 00:19:40.332915	2026-08-04 00:19:40.332549	f
0d8cfbf1-59c4-4b6f-9f82-d739a79060cb	09c5d823-4458-4848-bdff-64b9d4df198a	948a9a150f7e1bce2c135790af8a1aee7736a403cf12337c41515d2c224c49aa	2026-07-21 10:55:26.880674	2026-08-04 10:55:26.879652	f
61a02bc5-0e58-4722-b601-36b102d41c58	09c5d823-4458-4848-bdff-64b9d4df198a	de569f25e655653b31bf5a1a76c3e8b21f50ae41120f764ce53d096e4b34c072	2026-07-21 10:58:10.934899	2026-08-04 10:58:10.934601	f
\.


--
-- Data for Name: relations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.relations (id, personne_a_id, personne_b_id, type_relation, source_incident_id, poids) FROM stdin;
c55fecdd-fe35-48dd-b7cb-e4e1c6d7c265	0fb98554-d20d-45f7-9f4e-c8b75e80bcf3	a038e64b-932f-41be-9251-c48176e1f260	complice	8efefffe-23f4-4e78-805b-420b0eda4fb2	8
5da4b08a-3296-472a-ad71-ad0ecdd46a03	0fb98554-d20d-45f7-9f4e-c8b75e80bcf3	954e2a39-b62a-438a-88ab-02dba141ba86	connaissance	42fdb425-c833-4cd9-9d0c-eac35c6f108d	3
7c363eb8-f792-49e3-9c73-e3ae9f9e903b	a038e64b-932f-41be-9251-c48176e1f260	4fbae201-1d83-443b-afb0-04efbcc15588	famille	3508bbc7-d883-4146-82a6-16a2f9f356fe	9
afe5a36c-44da-4c09-bee0-d86f0bcddd66	4fbae201-1d83-443b-afb0-04efbcc15588	43ad19b8-d4f4-4164-9949-d0cdd56eec23	affaire_commune	e13d0dc4-501a-47a4-931f-c94bbf8fde3f	5
e44cc38e-373e-4936-813f-c510ba463737	a038e64b-932f-41be-9251-c48176e1f260	18709a17-be32-4ab2-8d0f-61a5a8aae5a0	vu_avec	7767fb81-92f5-4719-940c-06c238aa70ed	4
7af8096b-b44d-454a-961d-3486bcab8199	18709a17-be32-4ab2-8d0f-61a5a8aae5a0	bfe95db8-e3c6-4a1d-a0c3-aa37f8131417	connaissance	6ae3ddc7-f17b-4618-996c-dd046ba65175	2
cc862967-aae9-4b3b-a38d-edec0d2cdcf2	18709a17-be32-4ab2-8d0f-61a5a8aae5a0	25c9e66a-9455-4668-a60f-ed68bb6aae12	complice	ee2596c7-0450-49d4-8d5a-df32d5411055	7
3c03b9d1-822c-4dc7-9308-1e4adedcc069	25c9e66a-9455-4668-a60f-ed68bb6aae12	954e2a39-b62a-438a-88ab-02dba141ba86	affaire_commune	8efefffe-23f4-4e78-805b-420b0eda4fb2	3
\.


--
-- Data for Name: revoked_access_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revoked_access_tokens (jti, date_expiration) FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

\unrestrict CaWpwc6zgfTlX1DhEmg60SLgZI1LoopfOOj95dLLW2h8esIvbZ4pFA9ULjV6qh6

