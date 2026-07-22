"""Export CSV / PDF réutilisable par les différents modules.

Améliorations apportées :
- en-tête/pied de page homogènes sur tous les PDF ;
- branding explicite du projet (CrimTrack) sur chaque page ;
- mise en page plus robuste des tableaux (retour à la ligne, largeurs de
  colonnes calculées, pagination stable) ;
- mode paysage automatique pour les exports tabulaires larges afin d'éviter
  les informations qui se chevauchent ou sortent de la page.
"""

from __future__ import annotations

import csv
import io
import os
from datetime import datetime
from pathlib import Path
from typing import Iterable, Sequence

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Flowable,
    Image,
    LongTable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Mêmes couleurs que la carte Leaflet du frontend (GRAVITE_COLORS dans
# app.js), pour que le rapport imprimé et l'écran restent cohérents.
GRAVITE_COLORS_PDF = {
    "faible": colors.HexColor("#5b8c5a"),
    "moyenne": colors.HexColor("#c2703d"),
    "eleve": colors.HexColor("#bd4d3f"),
    "élevé": colors.HexColor("#bd4d3f"),
    "critique": colors.HexColor("#8a1f1f"),
}
_DEFAULT_POINT_COLOR = colors.HexColor("#5578c9")

PROJECT_NAME = os.getenv("CRIMTRACK_PROJECT_NAME", "CrimTrack")
PROJECT_SUBTITLE = os.getenv("CRIMTRACK_PROJECT_SUBTITLE", "Plateforme d'analyse et de gestion criminalistique")
HEADER_BG = colors.HexColor("#171d26")
HEADER_LINE = colors.HexColor("#c2703d")
PAPER_BG = colors.HexColor("#f8f5ee")
BORDER = colors.HexColor("#d7d1c5")
TEXT_DIM = colors.HexColor("#5e6776")


def rows_to_csv(headers: Sequence[str], rows: Iterable[Sequence]) -> io.BytesIO:
    """Construit un CSV en mémoire (UTF-8 avec BOM pour un Excel FR sans souci d'accents)."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(headers)
    for row in rows:
        writer.writerow(["" if v is None else v for v in row])
    encoded = io.BytesIO()
    encoded.write(b"\xef\xbb\xbf")  # BOM UTF-8
    encoded.write(buffer.getvalue().encode("utf-8"))
    encoded.seek(0)
    return encoded


def _safe_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value).replace("\r\n", "\n").replace("\r", "\n")


def _styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CtMeta",
            parent=styles["Normal"],
            fontSize=9.2,
            leading=11,
            textColor=TEXT_DIM,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CtCell",
            parent=styles["Normal"],
            fontSize=8.2,
            leading=10,
            spaceAfter=0,
            spaceBefore=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CtCellMono",
            parent=styles["Code"],
            fontSize=7.8,
            leading=9.2,
            spaceAfter=0,
            spaceBefore=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CtRight",
            parent=styles["CtMeta"],
            alignment=TA_RIGHT,
        )
    )
    return styles


def _candidate_logo_paths() -> list[Path]:
    paths = []
    env_logo = os.getenv("CRIMTRACK_LOGO_PATH")
    if env_logo:
        paths.append(Path(env_logo))
    here = Path(__file__).resolve().parent
    paths.extend(
        [
            here.parent / "frontend" / "logo.png",
            here.parent / "frontend" / "icon.png",
            here.parent.parent / "desktop" / "resources" / "icon.png",
        ]
    )
    return paths


def _resolve_logo_path() -> Path | None:
    for path in _candidate_logo_paths():
        try:
            if path.is_file():
                return path
        except OSError:
            continue
    return None


def _draw_page_chrome(canvas, doc):
    canvas.saveState()
    page_w, page_h = doc.pagesize

    # Bandeau supérieur.
    canvas.setFillColor(HEADER_BG)
    canvas.rect(0, page_h - 1.45 * cm, page_w, 1.45 * cm, stroke=0, fill=1)
    canvas.setFillColor(HEADER_LINE)
    canvas.rect(0, page_h - 1.55 * cm, page_w, 0.1 * cm, stroke=0, fill=1)

    logo = _resolve_logo_path()
    x = doc.leftMargin
    if logo:
        try:
            logo_h = 0.82 * cm
            logo_w = 1.52 * cm
            logo_y = page_h - 1.08 * cm
            img = Image(str(logo), width=logo_w, height=logo_h)
            img.drawOn(canvas, x, logo_y)
            x += 1.82 * cm
        except Exception:
            pass
    else:
        # Monogramme de secours si aucun fichier logo n'est fourni.
        canvas.setFillColor(HEADER_LINE)
        canvas.roundRect(x, page_h - 1.12 * cm, 0.95 * cm, 0.72 * cm, 0.09 * cm, stroke=0, fill=1)
        canvas.setFillColor(colors.black)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawCentredString(x + 0.475 * cm, page_h - 0.84 * cm, "CT")
        x += 1.25 * cm

    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(x, page_h - 0.73 * cm, PROJECT_NAME)
    canvas.setFont("Helvetica", 8.3)
    canvas.drawString(x, page_h - 1.03 * cm, PROJECT_SUBTITLE)

    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(page_w - doc.rightMargin, page_h - 0.78 * cm, f"Page {canvas.getPageNumber()}")

    # Pied de page.
    canvas.setStrokeColor(BORDER)
    canvas.line(doc.leftMargin, 1.2 * cm, page_w - doc.rightMargin, 1.2 * cm)
    canvas.setFillColor(TEXT_DIM)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(doc.leftMargin, 0.78 * cm, f"{PROJECT_NAME} — document généré automatiquement")
    canvas.drawRightString(
        page_w - doc.rightMargin,
        0.78 * cm,
        datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC"),
    )
    canvas.restoreState()


def _page_size_for_table(headers: Sequence[str]):
    return landscape(A4) if len(headers) >= 7 else A4


def _is_mono_column(header: str) -> bool:
    h = (header or "").lower()
    keywords = ("id", "hash", "sha", "plaque")
    return any(k in h for k in keywords)


def _column_width_weights(headers: Sequence[str], rows: list[list[str]]) -> list[float]:
    weights: list[float] = []
    for idx, header in enumerate(headers):
        h = header.lower()
        sample_lens = [len(str(header))]
        for row in rows[:40]:
            if idx < len(row):
                sample_lens.append(min(len(row[idx]), 80))
        base = max(sample_lens) or 1
        if any(k in h for k in ("description", "adresse", "details", "détail", "localisation")):
            base = max(base, 28)
        elif any(k in h for k in ("date", "heure")):
            base = max(base, 16)
        elif any(k in h for k in ("id", "hash", "sha")):
            base = max(base, 20)
        elif any(k in h for k in ("type", "statut", "gravité", "gravite", "rôle", "role", "action")):
            base = max(base, 12)
        weights.append(float(base))
    return weights


def _compute_col_widths(headers: Sequence[str], rows: list[list[str]], usable_width: float) -> list[float]:
    weights = _column_width_weights(headers, rows)
    total = sum(weights) or 1.0
    widths = [(w / total) * usable_width for w in weights]

    min_widths = []
    for header in headers:
        h = header.lower()
        if any(k in h for k in ("date", "heure")):
            min_widths.append(2.2 * cm)
        elif any(k in h for k in ("id", "hash", "sha")):
            min_widths.append(2.8 * cm)
        elif any(k in h for k in ("description", "adresse", "details", "détail", "localisation")):
            min_widths.append(3.2 * cm)
        else:
            min_widths.append(1.8 * cm)

    widths = [max(w, min_w) for w, min_w in zip(widths, min_widths)]
    overflow = sum(widths) - usable_width
    if overflow > 0:
        shrinkable = [i for i, header in enumerate(headers) if not any(k in header.lower() for k in ("description", "adresse", "details", "détail", "localisation"))]
        if not shrinkable:
            shrinkable = list(range(len(widths)))
        shrink_per_col = overflow / max(len(shrinkable), 1)
        for i in shrinkable:
            widths[i] = max(widths[i] - shrink_per_col, min_widths[i])
    return widths


def _table_data(headers: Sequence[str], rows: list[list[str]], styles) -> list[list[Paragraph]]:
    header_style = ParagraphStyle(
        "CtHeaderCell",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.1,
        leading=9.5,
        textColor=colors.white,
    )
    data = [[Paragraph(_safe_text(h), header_style) for h in headers]]
    for row in rows:
        rendered_row = []
        for idx, value in enumerate(row):
            style = styles["CtCellMono"] if _is_mono_column(headers[idx]) else styles["CtCell"]
            rendered_row.append(Paragraph(_safe_text(value).replace("\n", "<br/>"), style))
        data.append(rendered_row)
    return data


def _build_table(headers: Sequence[str], rows: list[list[str]], doc, styles):
    usable_width = doc.width
    widths = _compute_col_widths(headers, rows, usable_width)
    data = _table_data(headers, rows, styles)
    table = LongTable(data, colWidths=widths, repeatRows=1, splitByRow=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B1D21")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#bfb8ab")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER_BG]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, 0), 0.6, HEADER_LINE),
            ]
        )
    )
    return table


def _build_intro_block(*, titre: str, sous_titre: str, genere_par: str, notes: str, styles):
    elements = [Paragraph(titre, styles["Title"])]
    if sous_titre:
        elements.append(Spacer(1, 0.1 * cm))
        elements.append(Paragraph(sous_titre, styles["CtMeta"]))

    meta = f"Généré le {datetime.utcnow().strftime('%d/%m/%Y %H:%M UTC')}"
    if genere_par:
        meta += f" par {genere_par}"
    elements.append(Spacer(1, 0.18 * cm))
    elements.append(Paragraph(meta, styles["CtMeta"]))
    if notes:
        elements.append(Spacer(1, 0.18 * cm))
        elements.append(Paragraph(notes, styles["CtMeta"]))
    elements.append(Spacer(1, 0.45 * cm))
    return elements


def build_pdf_report(
    *,
    titre: str,
    sous_titre: str = "",
    headers: Sequence[str],
    rows: Iterable[Sequence],
    genere_par: str = "",
    notes: str = "",
) -> io.BytesIO:
    """Génère un PDF tabulaire de meilleure qualité visuelle.

    Utilisé aussi bien pour un export d'incidents (Module 1) que pour un
    historique de chaîne de custody (Module 2).
    """
    page_size = _page_size_for_table(headers)
    styles = _styles()
    row_values = [[_safe_text(v) for v in row] for row in rows]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        topMargin=2.25 * cm,
        bottomMargin=1.8 * cm,
        leftMargin=1.4 * cm,
        rightMargin=1.4 * cm,
        title=titre,
        author=genere_par or PROJECT_NAME,
        subject=PROJECT_SUBTITLE,
    )

    elements = _build_intro_block(
        titre=titre,
        sous_titre=sous_titre,
        genere_par=genere_par,
        notes=notes,
        styles=styles,
    )
    elements.append(_build_table(headers, row_values, doc, styles))

    doc.build(elements, onFirstPage=_draw_page_chrome, onLaterPages=_draw_page_chrome)
    buffer.seek(0)
    return buffer


class MapPlot(Flowable):
    """Rendu schématique d'une carte (projection équirectangulaire simple,
    suffisante à l'échelle d'un briefing d'unité — pas de fond de plan
    OpenStreetMap embarqué dans un PDF généré côté serveur sans navigateur).

    Dessine les incidents en points colorés par gravité et les hotspots en
    cercles semi-transparents, avec une grille de repère et un cadre.
    """

    def __init__(self, incidents, hotspots, width=24 * cm, height=12.5 * cm):
        super().__init__()
        self.incidents = incidents
        self.hotspots = hotspots or []
        self.width = width
        self.height = height

    def wrap(self, availWidth, availHeight):
        self.width = min(self.width, availWidth)
        return self.width, self.height

    def _bounds(self):
        lats = [i.latitude for i in self.incidents if i.latitude is not None]
        lons = [i.longitude for i in self.incidents if i.longitude is not None]
        for h in self.hotspots:
            lats.append(h.latitude)
            lons.append(h.longitude)
        if not lats:
            return (48.80, 48.92, 2.25, 2.45)  # repli : région parisienne
        pad_lat = max((max(lats) - min(lats)) * 0.12, 0.01)
        pad_lon = max((max(lons) - min(lons)) * 0.12, 0.01)
        return (min(lats) - pad_lat, max(lats) + pad_lat, min(lons) - pad_lon, max(lons) + pad_lon)

    def draw(self):
        c = self.canv
        lat_min, lat_max, lon_min, lon_max = self._bounds()
        lat_span = max(lat_max - lat_min, 1e-6)
        lon_span = max(lon_max - lon_min, 1e-6)

        def project(lat, lon):
            x = (lon - lon_min) / lon_span * self.width
            y = (lat - lat_min) / lat_span * self.height
            return x, y

        c.setStrokeColor(colors.HexColor("#c9c9c9"))
        c.setFillColor(colors.HexColor("#fbfbfb"))
        c.rect(0, 0, self.width, self.height, stroke=1, fill=1)
        for i in range(1, 4):
            c.line(0, self.height * i / 4, self.width, self.height * i / 4)
            c.line(self.width * i / 4, 0, self.width * i / 4, self.height)

        c.setFillColor(colors.HexColor("#c2703d"))
        for h in self.hotspots:
            x, y = project(h.latitude, h.longitude)
            r = 4 + min(h.nombre_incidents, 20)
            c.saveState()
            c.setFillAlpha(0.18)
            c.setStrokeColor(colors.HexColor("#c2703d"))
            c.circle(x, y, r, stroke=1, fill=1)
            c.restoreState()

        for inc in self.incidents:
            if inc.latitude is None or inc.longitude is None:
                continue
            x, y = project(inc.latitude, inc.longitude)
            c.setFillColor(GRAVITE_COLORS_PDF.get(inc.gravite, _DEFAULT_POINT_COLOR))
            c.circle(x, y, 2.6, stroke=0, fill=1)

        c.setStrokeColor(colors.HexColor("#888888"))
        c.rect(0, 0, self.width, self.height, stroke=1, fill=0)


def build_map_pdf_report(
    *,
    titre: str,
    sous_titre: str,
    incidents,
    hotspots,
    genere_par: str = "",
) -> io.BytesIO:
    """Rapport cartographique imprimable (Module 1)."""
    styles = _styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        topMargin=2.25 * cm,
        bottomMargin=1.8 * cm,
        leftMargin=1.4 * cm,
        rightMargin=1.4 * cm,
        title=titre,
        author=genere_par or PROJECT_NAME,
        subject=PROJECT_SUBTITLE,
    )

    elements = _build_intro_block(
        titre=titre,
        sous_titre=sous_titre,
        genere_par=genere_par,
        notes="Les points sont colorés par gravité ; les cercles orange représentent les hotspots détectés.",
        styles=styles,
    )

    elements.append(MapPlot(incidents, hotspots, width=doc.width, height=12.4 * cm))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(
        Paragraph(
            f"Synthèse : {len(incidents)} incident(s) retenu(s), {len(hotspots)} hotspot(s) détecté(s).",
            styles["CtMeta"],
        )
    )
    elements.append(Spacer(1, 0.45 * cm))

    headers = ["Type", "Date/heure", "Statut", "Gravité", "Adresse", "Unité"]
    rows = [
        [
            _safe_text(i.type_infraction),
            i.date_heure.strftime("%d/%m/%Y %H:%M") if i.date_heure else "",
            _safe_text(i.statut),
            _safe_text(i.gravite),
            _safe_text(i.adresse),
            _safe_text(i.unite_en_charge),
        ]
        for i in incidents
    ]
    elements.append(_build_table(headers, rows, doc, styles))

    doc.build(elements, onFirstPage=_draw_page_chrome, onLaterPages=_draw_page_chrome)
    buffer.seek(0)
    return buffer
