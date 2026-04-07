import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { Devis, GarantieProposee } from '@/types';

// ── Sanitise pour WinAnsi ─────────────────────────────────────────────────
function clean(str: string): string {
  return (str ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, (c) => {
    const code = c.codePointAt(0) ?? 0;
    if (code === 0x202F || code === 0x00A0) return ' ';
    if (code === 0x20AC) return 'EUR';
    if (code === 0x2018 || code === 0x2019) return "'";
    if (code === 0x201C || code === 0x201D) return '"';
    if (code === 0x2013 || code === 0x2014) return '-';
    return '';
  });
}

const fmtPrix = (n: number) =>
  clean(new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n));

const fmtKm = (n: number) => clean(n.toLocaleString('fr-FR') + ' km');

// ── Couleurs ──────────────────────────────────────────────────────────────
const VIOLET  = rgb(0.220, 0.094, 0.576);  // #381893
const BLUE    = rgb(0.278, 0.706, 0.882);  // #47b4e1
const ECO     = rgb(0.180, 0.490, 0.310);  // #2E7D4F
const LUXE    = rgb(0.102, 0.102, 0.180);  // #1A1A2E
const LPREM   = rgb(0.051, 0.051, 0.102);  // #0D0D1A
const DARK    = rgb(0.102, 0.102, 0.180);
const GRAY    = rgb(0.431, 0.459, 0.514);
const LGRAY   = rgb(0.580, 0.600, 0.635);
const BORDER  = rgb(0.878, 0.886, 0.910);
const WHITE   = rgb(1, 1, 1);
const BGLIGHT = rgb(0.973, 0.973, 0.973);

const gammeAccent = (g: string) => {
  if (g === 'eco') return ECO;
  if (g === 'luxe') return LUXE;
  if (g === 'luxe_premium') return LPREM;
  return VIOLET;
};

// ══════════════════════════════════════════════════════════════════════════
export async function genererPDFDevis(
  devis: Devis,
  garanties: GarantieProposee[]
): Promise<Buffer> {

  const doc = await PDFDocument.create();
  doc.setTitle(clean(`Devis - ${devis.marque} ${devis.modele}`));
  doc.setAuthor('Garantie Plus');

  const Bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const Reg    = await doc.embedFont(StandardFonts.Helvetica);

  const PW = PageSizes.A4[0];   // 595
  const PH = PageSizes.A4[1];   // 842
  const MG = 40;                // marges latérales
  const CW = PW - MG * 2;      // 515

  // ── Tentative d'intégration du logo PNG ───────────────────────────────
  let logoImg: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const lp = path.join(process.cwd(), 'public', 'logo.png');
    logoImg   = await doc.embedPng(fs.readFileSync(lp));
  } catch { logoImg = null; }

  // ── Factory de page (fond blanc) ──────────────────────────────────────
  function newPage() {
    const pg = doc.addPage(PageSizes.A4);
    pg.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: WHITE });

    /** Texte avec troncature optionnelle */
    function T(
      raw: string, x: number, yTop: number,
      o: { f?: typeof Bold; sz?: number; col?: ReturnType<typeof rgb>; maxW?: number } = {}
    ) {
      const { f = Reg, sz = 9, col = DARK, maxW } = o;
      let t = clean(raw);
      if (maxW && f.widthOfTextAtSize(t, sz) > maxW) {
        while (t.length > 0 && f.widthOfTextAtSize(t + '...', sz) > maxW) t = t.slice(0, -1);
        t += '...';
      }
      pg.drawText(t, { x, y: PH - yTop, font: f, size: sz, color: col });
    }

    /** Rectangle (coordonnées depuis le haut) */
    function R(
      x: number, yTop: number, w: number, h: number,
      o: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; sw?: number } = {}
    ) {
      pg.drawRectangle({
        x, y: PH - yTop - h, width: w, height: h,
        ...(o.fill   ? { color: o.fill }   : {}),
        ...(o.stroke ? { borderColor: o.stroke, borderWidth: o.sw ?? 0.5 } : {}),
      });
    }

    /** Ligne horizontale */
    function HL(y: number, x1 = MG, x2 = MG + CW, col = BORDER) {
      pg.drawLine({ start: { x: x1, y: PH - y }, end: { x: x2, y: PH - y }, thickness: 0.5, color: col });
    }

    /** Ligne verticale */
    function VL(x: number, y1: number, y2: number, col = BORDER) {
      pg.drawLine({ start: { x, y: PH - y1 }, end: { x, y: PH - y2 }, thickness: 0.5, color: col });
    }

    return { pg, T, R, HL, VL };
  }

  let cur = newPage();
  let y   = 0;

  // Closures pointant toujours vers la page courante
  const T  = (...a: Parameters<ReturnType<typeof newPage>['T']>)  => cur.T(...a);
  const R  = (...a: Parameters<ReturnType<typeof newPage>['R']>)  => cur.R(...a);
  const HL = (...a: Parameters<ReturnType<typeof newPage>['HL']>) => cur.HL(...a);
  const VL = (...a: Parameters<ReturnType<typeof newPage>['VL']>) => cur.VL(...a);

  function drawFooter() {
    const fy = PH - 22;
    cur.pg.drawLine({
      start: { x: MG, y: fy + 8 }, end: { x: PW - MG, y: fy + 8 },
      thickness: 0.5, color: BORDER,
    });
    cur.T(
      "Garantie Plus - Societe de courtage d'assurance et de reassurance - SAS au capital de 10.000 EUR" +
      " - RCS Paris 943 193 037 - 130 rue de Courcelles 75017 Paris - ORIAS n\u00b025004236",
      MG, PH - 11, { sz: 5.8, col: LGRAY }
    );
  }

  function ensure(needed: number) {
    if (y + needed > PH - 50) {
      drawFooter();
      cur = newPage();
      y   = 28;
    }
  }

  /** Rangée de carrés colorés pour les étoiles */
  function drawStars(count: number, x: number, yTop: number, accent: ReturnType<typeof rgb>, sz = 8) {
    for (let i = 0; i < 5; i++) {
      R(x + i * (sz + 2), yTop, sz, sz, { fill: i < count ? accent : BORDER });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // HEADER : logo gauche | pill dégradé droite  (image 2)
  // ══════════════════════════════════════════════════════════════════════
  const HDR_H = 84;

  // Zone blanche totale
  R(0, 0, PW, HDR_H, { fill: WHITE });

  // ── Logo ──────────────────────────────────────────────────────────────
  if (logoImg) {
    const LW = 185;
    const LH = LW * (749 / 1920);  // ratio naturel ≈ 72px
    const LY = (HDR_H - LH) / 2;  // centré verticalement
    cur.pg.drawImage(logoImg, { x: MG, y: PH - LY - LH, width: LW, height: LH });
  } else {
    // Fallback texte si logo non disponible
    T('GARANTIE', MG, 32, { f: Reg, sz: 18, col: GRAY });
    T('PLUS', MG + Reg.widthOfTextAtSize('GARANTIE ', 18), 32, { f: Bold, sz: 18, col: DARK });
  }

  // ── Pill dégradé "DEVIS PERSONNALISE" ────────────────────────────────
  // Forme : rectangle central + demi-cercles aux extrémités (stadium)
  const PILL_W = 228;
  const PILL_H = 50;
  const PILL_X = PW - MG - PILL_W;
  const PILL_Y_TOP = (HDR_H - PILL_H) / 2;   // y depuis le haut
  const PILL_R = PILL_H / 2;                  // rayon des extrémités

  // Demi-cercle gauche (VIOLET)
  cur.pg.drawEllipse({
    x: PILL_X + PILL_R,
    y: PH - PILL_Y_TOP - PILL_R,
    xScale: PILL_R,
    yScale: PILL_R,
    color: VIOLET,
  });

  // Demi-cercle droit (BLUE)
  cur.pg.drawEllipse({
    x: PILL_X + PILL_W - PILL_R,
    y: PH - PILL_Y_TOP - PILL_R,
    xScale: PILL_R,
    yScale: PILL_R,
    color: BLUE,
  });

  // Rectangle central avec dégradé simulé
  const INNER_W = PILL_W - 2 * PILL_R;
  const STEPS   = 50;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const c = rgb(
      0.220 + t * (0.278 - 0.220),
      0.094 + t * (0.706 - 0.094),
      0.576 + t * (0.882 - 0.576),
    );
    R(PILL_X + PILL_R + i * INNER_W / STEPS, PILL_Y_TOP, INNER_W / STEPS + 1, PILL_H, { fill: c });
  }

  // Texte centré dans la pill
  const PT  = 'DEVIS PERSONNALISE';
  const PTW = Bold.widthOfTextAtSize(PT, 11);
  T(PT, PILL_X + (PILL_W - PTW) / 2, PILL_Y_TOP + PILL_H / 2 + 4, { f: Bold, sz: 11, col: WHITE });

  // Ligne séparatrice sous le header
  HL(HDR_H, 0, PW, BORDER);
  y = HDR_H + 20;

  // ══════════════════════════════════════════════════════════════════════
  // TITRE  (image 1 : "Dacia sandrro" + date)
  // ══════════════════════════════════════════════════════════════════════
  T(`${devis.marque} ${devis.modele}`, MG, y, { f: Bold, sz: 20, col: DARK });
  y += 20;

  const dateObj  = new Date(devis.created_at);
  const dateFmt  = clean(dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
  const timeFmt  = clean(dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  T(`Devis du ${dateFmt} a ${timeFmt}`, MG, y + 12, { sz: 9, col: GRAY });
  y += 30;

  // ══════════════════════════════════════════════════════════════════════
  // CARDS VÉHICULE + GARAGE  (image 1)
  // ══════════════════════════════════════════════════════════════════════
  ensure(140);

  const HALF = (CW - 14) / 2;
  const RCX  = MG + HALF + 14;   // x colonne garage

  // Helper : carte avec titre et lignes label|valeur
  function drawInfoCard(
    xCard: number,
    yCard: number,
    title: string,
    rows: [string, string][],
    extraRows: string[]  // tags
  ) {
    const RH     = 22;           // hauteur par ligne
    const cardH  = rows.length * RH + 14 + (extraRows.length > 0 ? 32 : 0) + 6;

    R(xCard, yCard, HALF, cardH, { fill: WHITE, stroke: BORDER, sw: 0.8 });

    // Titre de la carte
    T(title, xCard + 10, yCard + 16, { f: Bold, sz: 10, col: DARK });
    HL(yCard + 22, xCard + 6, xCard + HALF - 6, BORDER);

    // Lignes label|valeur
    rows.forEach(([lbl, val], i) => {
      const ry = yCard + 22 + 14 + i * RH;
      T(lbl, xCard + 10, ry, { sz: 8, col: GRAY });

      // Valeur right-aligned
      const safeVal = clean(val);
      const vW      = Math.min(Bold.widthOfTextAtSize(safeVal, 8.5), HALF * 0.6);
      const vX      = xCard + HALF - 10 - vW;
      T(safeVal, vX, ry, { f: Bold, sz: 8.5, col: DARK, maxW: HALF * 0.6 });

      if (i < rows.length - 1) HL(ry + 8, xCard + 8, xCard + HALF - 8, rgb(0.94, 0.94, 0.97));
    });

    // Tags caractéristiques
    if (extraRows.length > 0) {
      const tagY = yCard + 22 + rows.length * RH + 14;
      T('Caracteristiques', xCard + 10, tagY + 2, { sz: 7.5, col: GRAY });
      let cx = xCard + 10;
      extraRows.forEach(tag => {
        const tw = Bold.widthOfTextAtSize(tag, 6.5) + 10;
        if (cx + tw > xCard + HALF - 8) return;
        R(cx, tagY + 8, tw, 14, { fill: rgb(0.929, 0.910, 0.976) });
        T(tag, cx + 5, tagY + 19, { f: Bold, sz: 6.5, col: VIOLET });
        cx += tw + 4;
      });
    }

    return cardH;
  }

  const tags = [
    devis.is_4x4             && '4x4 / SUV',
    devis.is_plus_2t3        && '+2,3 tonnes',
    devis.is_plus_14cv       && '+14 CV fiscaux',
    devis.is_hybride_electrique && 'Hybride / Electrique',
    devis.valeur_neuf_55k    && 'Valeur >55k EUR',
    devis.valeur_neuf_100k   && 'Valeur >100k EUR',
    devis.valeur_neuf_150k   && 'Valeur >150k EUR',
  ].filter(Boolean) as string[];

  const vhCardH = drawInfoCard(MG, y, 'Vehicule', [
    ['Marque',          devis.marque],
    ['Modele',          devis.modele],
    ['Mise en circulation', devis.date_mise_en_circulation],
    ['Kilometrage',     fmtKm(devis.kilometrage)],
  ], tags);

  const grCardH = drawInfoCard(RCX, y, 'Garage', [
    ['Garage',    devis.nom_garage],
    ['Contact',   devis.nom_contact],
    ['Email',     devis.email],
    ['Telephone', devis.telephone],
  ], []);

  y += Math.max(vhCardH, grCardH) + 20;

  // ══════════════════════════════════════════════════════════════════════
  // GARANTIES TABLE  (image 1)
  // ══════════════════════════════════════════════════════════════════════
  const sorted = [...garanties].sort((a, b) => b.niveau - a.niveau);
  ensure(50 + sorted.length * 34);

  // Titre
  T('Garanties proposees', MG, y + 14, { f: Bold, sz: 11, col: DARK });
  y += 22;

  // Card wrapper
  const ROW_H  = 32;
  const tableH = 36 + sorted.length * ROW_H + 10;
  R(MG, y, CW, tableH, { fill: WHITE, stroke: BORDER, sw: 0.8 });

  y += 6;

  // Colonnes (mêmes proportions que l'admin)
  const CG  = CW * 0.30;   // Garantie (étoiles)
  const CP  = CW * 0.165;  // Plafond
  const C6  = CW * 0.135;  // 6 mois
  const C12 = CW * 0.165;  // 12 mois
  const C24 = CW - CG - CP - C6 - C12;  // 24 mois

  const XP  = MG + CG;
  const X6  = XP + CP;
  const X12 = X6 + C6;
  const X24 = X12 + C12;

  // En-têtes colonnes
  const thY = y + 14;
  T('Garantie', MG + 10,  thY, { f: Bold, sz: 8,   col: GRAY });
  T('Plafond',  XP + 8,   thY, { f: Bold, sz: 8,   col: GRAY });
  T('6 mois',   X6 + 8,   thY, { f: Bold, sz: 8,   col: GRAY });
  T('12 mois',  X12 + 8,  thY, { f: Bold, sz: 8,   col: GRAY });
  T('24 mois',  X24 + 8,  thY, { f: Bold, sz: 8,   col: GRAY });
  y += 22;
  HL(y, MG + 6, MG + CW - 6, BORDER);
  y += 4;

  // Lignes garanties
  sorted.forEach((g, i) => {
    const accent = gammeAccent(g.gamme);
    const ry     = y + ROW_H / 2 + 4;

    // Étoiles colorées (gamme color)
    drawStars(g.niveau, MG + 10, ry - 10, accent, 8);

    // Plafond (affichage direct comme dans l'admin)
    T(clean(g.plafondIntervention), XP + 8, ry, { sz: 8.5, col: DARK });

    // Prix 6 mois
    T(fmtPrix(g.prixFinal['6']), X6 + 8, ry, { sz: 8.5, col: DARK });

    // Prix 12 mois — violet bold (comme dans l'admin)
    T(fmtPrix(g.prixFinal['12']), X12 + 8, ry, { f: Bold, sz: 8.5, col: VIOLET });

    // Prix 24 mois
    T(fmtPrix(g.prixFinal['24']), X24 + 8, ry, { sz: 8.5, col: DARK });

    y += ROW_H;
    if (i < sorted.length - 1) HL(y, MG + 6, MG + CW - 6, rgb(0.94, 0.94, 0.97));
  });

  y += 14;

  // ══════════════════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════════════════
  drawFooter();

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
