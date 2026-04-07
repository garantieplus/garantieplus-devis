import { PDFDocument, StandardFonts, rgb, PageSizes, PDFName, PDFArray, PDFString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { Devis, GarantieProposee } from '@/types';

// ── Sanitize WinAnsi ──────────────────────────────────────────────────
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
  clean(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n));

const fmtKm = (n: number) => clean(n.toLocaleString('fr-FR') + ' km');

// ── Couleurs ──────────────────────────────────────────────────────────
const PR = { r: 0.220, g: 0.094, b: 0.576 };   // #381893
const BL = { r: 0.278, g: 0.706, b: 0.882 };   // #47b4e1

const PRIMARY  = rgb(PR.r, PR.g, PR.b);
const BLUE     = rgb(BL.r, BL.g, BL.b);
const DARK     = rgb(0.102, 0.102, 0.180);   // #1A1A2E
const GRAY     = rgb(0.533, 0.533, 0.533);   // #888
const PURPLE   = rgb(0.482, 0.369, 0.655);   // #7B5EA7
const BG_CARD  = rgb(0.973, 0.965, 0.988);   // #F8F6FC
const BORDER   = rgb(0.910, 0.886, 0.973);   // #E8E2F8
const BG_12    = rgb(0.941, 0.925, 0.976);   // #F0ECF9
const BADGE_BG = rgb(0.929, 0.910, 0.973);   // #EDE8F8
const BADGE_BD = rgb(0.773, 0.722, 0.929);   // #C5B8ED
const GOLD     = rgb(0.961, 0.651, 0.137);   // #F5A623
const GOLD_L   = rgb(1.000, 0.878, 0.510);   // #FFE082
const DARK_BL  = rgb(0.102, 0.227, 0.420);   // #1A3A6B
const BG_BLUE  = rgb(0.941, 0.973, 0.996);   // #F0F8FE
const GREEN    = rgb(0.133, 0.773, 0.369);   // #22C55E
const WHITE    = rgb(1, 1, 1);

const gammeAccent = (g: string) => {
  if (g === 'eco')          return rgb(0.180, 0.490, 0.310);
  if (g === 'luxe')         return rgb(0.200, 0.200, 0.400);
  if (g === 'luxe_premium') return rgb(0.100, 0.100, 0.250);
  return PRIMARY;
};

// ── Découpage de texte en lignes ──────────────────────────────────────
function wrapText(
  text: string,
  font: { widthOfTextAtSize(t: string, s: number): number },
  sz: number, maxW: number
): string[] {
  const words = clean(text).split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, sz) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ══════════════════════════════════════════════════════════════════════
export async function genererPDFDevis(devis: Devis, garanties: GarantieProposee[]): Promise<Buffer> {

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(clean(`Devis - ${devis.marque} ${devis.modele}`));
  doc.setAuthor('Garantie Plus');

  // ── Polices : Inter avec fallback Helvetica ────────────────────────
  let Bold: Awaited<ReturnType<typeof doc.embedFont>>;
  let Reg:  Awaited<ReturnType<typeof doc.embedFont>>;
  try {
    Reg  = await doc.embedFont(fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf')));
    Bold = await doc.embedFont(fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf')));
  } catch {
    Reg  = await doc.embedFont(StandardFonts.Helvetica);
    Bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  const PW  = PageSizes.A4[0];   // 595
  const PH  = PageSizes.A4[1];   // 842
  const MG  = 40;
  const CW  = PW - 2 * MG;      // 515
  const HDR = 88;
  const FTR = 58;
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis.garantieplus.fr';

  let logoImg: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    logoImg = await doc.embedPng(fs.readFileSync(path.join(process.cwd(), 'public', 'logo.png')));
  } catch { logoImg = null; }

  // ── Factory de page ───────────────────────────────────────────────
  function newPage() {
    const pg = doc.addPage(PageSizes.A4);
    pg.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: WHITE });

    // T : texte (yTop = depuis le haut de la page)
    function T(raw: string, x: number, yTop: number,
      o: { f?: typeof Bold; sz?: number; col?: ReturnType<typeof rgb>; maxW?: number; raw?: boolean } = {}
    ) {
      const { f = Reg, sz = 9, col = DARK, maxW, raw: noClean } = o;
      let t = noClean ? (raw ?? '') : clean(raw);
      if (maxW && f.widthOfTextAtSize(t, sz) > maxW) {
        while (t.length > 0 && f.widthOfTextAtSize(t + '...', sz) > maxW) t = t.slice(0, -1);
        t += '...';
      }
      pg.drawText(t, { x, y: PH - yTop, font: f, size: sz, color: col });
    }

    // R : rectangle plein ou bordé
    function R(x: number, yTop: number, w: number, h: number,
      o: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; sw?: number; opacity?: number } = {}
    ) {
      pg.drawRectangle({
        x, y: PH - yTop - h, width: w, height: h,
        ...(o.fill   ? { color: o.fill, ...(o.opacity != null ? { opacity: o.opacity } : {}) } : {}),
        ...(o.stroke ? { borderColor: o.stroke, borderWidth: o.sw ?? 0.5 } : {}),
      });
    }

    // RR : rectangle à coins arrondis
    function RR(x: number, yTop: number, w: number, h: number, r: number,
      o: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; sw?: number } = {}
    ) {
      const yb = PH - yTop - h;
      if (o.fill) {
        const f = o.fill;
        pg.drawRectangle({ x: x + r, y: yb,     width: w - 2*r, height: h,     color: f });
        pg.drawRectangle({ x,         y: yb + r, width: w,       height: h - 2*r, color: f });
        pg.drawEllipse({ x: x + r,   y: yb + r,   xScale: r, yScale: r, color: f });
        pg.drawEllipse({ x: x+w - r, y: yb + r,   xScale: r, yScale: r, color: f });
        pg.drawEllipse({ x: x + r,   y: yb+h - r, xScale: r, yScale: r, color: f });
        pg.drawEllipse({ x: x+w - r, y: yb+h - r, xScale: r, yScale: r, color: f });
      }
      if (o.stroke) {
        const s = o.stroke, sw = o.sw ?? 0.5;
        pg.drawLine({ start: {x: x+r,   y: yb+h},   end: {x: x+w-r, y: yb+h},   thickness: sw, color: s });
        pg.drawLine({ start: {x: x+r,   y: yb},     end: {x: x+w-r, y: yb},     thickness: sw, color: s });
        pg.drawLine({ start: {x,         y: yb+r},   end: {x,         y: yb+h-r}, thickness: sw, color: s });
        pg.drawLine({ start: {x: x+w,   y: yb+r},   end: {x: x+w,   y: yb+h-r}, thickness: sw, color: s });
      }
    }

    // HL : ligne horizontale
    function HL(yTop: number, x1 = MG, x2 = MG + CW, col = BORDER) {
      pg.drawLine({ start: {x: x1, y: PH - yTop}, end: {x: x2, y: PH - yTop}, thickness: 0.5, color: col });
    }

    // GRD : dégradé horizontal
    function GRD(x: number, yTop: number, w: number, h: number,
      from = PR, to = BL, steps = 60
    ) {
      const yb = PH - yTop - h;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pg.drawRectangle({
          x: x + i*(w/steps), y: yb, width: w/steps + 1, height: h,
          color: rgb(from.r + t*(to.r-from.r), from.g + t*(to.g-from.g), from.b + t*(to.b-from.b)),
        });
      }
    }

    // LNK : annotation lien
    function LNK(yTop: number, lx: number, lw: number, lh: number, url: string) {
      const yb = PH - yTop - lh;
      const ref = doc.context.register(doc.context.obj({
        Type: 'Annot', Subtype: 'Link',
        Rect: [lx, yb, lx + lw, yb + lh],
        Border: [0, 0, 0],
        A: doc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(url) }),
      }));
      const ex = pg.node.get(PDFName.of('Annots'));
      if (ex instanceof PDFArray) ex.push(ref);
      else pg.node.set(PDFName.of('Annots'), doc.context.obj([ref]));
    }

    return { pg, T, R, RR, HL, GRD, LNK };
  }

  let cur = newPage();
  let y   = 0;

  const T   = (...a: Parameters<ReturnType<typeof newPage>['T']>)   => cur.T(...a);
  const R   = (...a: Parameters<ReturnType<typeof newPage>['R']>)   => cur.R(...a);
  const RR  = (...a: Parameters<ReturnType<typeof newPage>['RR']>)  => cur.RR(...a);
  const HL  = (...a: Parameters<ReturnType<typeof newPage>['HL']>)  => cur.HL(...a);
  const GRD = (...a: Parameters<ReturnType<typeof newPage>['GRD']>) => cur.GRD(...a);
  const LNK = (...a: Parameters<ReturnType<typeof newPage>['LNK']>) => cur.LNK(...a);

  // ── Titre de section ───────────────────────────────────────────────
  function sectionTitle(label: string, yPos: number): number {
    T(label, MG, yPos, { f: Bold, sz: 9, col: PRIMARY });
    const tw = Bold.widthOfTextAtSize(label, 9);
    cur.pg.drawLine({ start: {x: MG, y: PH - yPos - 14}, end: {x: MG + CW, y: PH - yPos - 14}, thickness: 0.5, color: BORDER });
    cur.pg.drawLine({ start: {x: MG, y: PH - yPos - 14}, end: {x: MG + tw, y: PH - yPos - 14}, thickness: 2, color: PRIMARY });
    return yPos + 22;
  }

  // ── Footer (fond sombre fixe en bas) ──────────────────────────────
  function drawFooter() {
    R(0, PH - FTR, PW, FTR, { fill: DARK });
    cur.T("Garantie Plus SAS — Capital 10 000 EUR — RCS Paris 943 193 037",
      MG, PH - FTR + 18, { sz: 8, col: rgb(1,1,1) });
    cur.T("130 rue de Courcelles, 75017 Paris — ORIAS n\u00b025004236",
      MG, PH - FTR + 32, { sz: 8, col: rgb(1,1,1) });
    const e1 = 'contact@garantieplus.fr';
    const e2 = 'sinistre@garantieplus.fr';
    cur.T(e1, PW - MG - Reg.widthOfTextAtSize(e1, 9), PH - FTR + 18, { sz: 9, col: rgb(1,1,1) });
    cur.T(e2, PW - MG - Reg.widthOfTextAtSize(e2, 9), PH - FTR + 32, { sz: 9, col: rgb(1,1,1) });
  }

  const LIMIT = PH - FTR - 20;

  function ensure(needed: number) {
    if (y + needed > LIMIT) {
      drawFooter();
      cur = newPage();
      drawHeader();
      y = HDR + 24;
    }
  }

  // ── Header gradient + logo + texte ────────────────────────────────
  function drawHeader() {
    GRD(0, 0, PW, HDR);
    if (logoImg) {
      const LH = 46, LW = LH * (1920 / 749);
      cur.pg.drawImage(logoImg, { x: MG, y: PH - (HDR - LH)/2 - LH, width: LW, height: LH });
    } else {
      cur.T('GARANTIE PLUS', MG, HDR / 2 + 7, { f: Bold, sz: 18, col: WHITE });
    }
    const label = 'DEVIS PERSONNALISE';
    cur.T(label, PW - MG - Bold.widthOfTextAtSize(label, 9.5), 28, { sz: 9.5, col: rgb(1,1,1) });
    const dateObj = new Date(devis.created_at);
    const dateFmt = clean(dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
    cur.T(dateFmt, PW - MG - Bold.widthOfTextAtSize(dateFmt, 13), 50, { f: Bold, sz: 13, col: WHITE });
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  drawHeader();
  y = HDR + 28;

  // 1. TITRE VÉHICULE ────────────────────────────────────────────────
  T(`${devis.marque} ${devis.modele}`, MG, y, { f: Bold, sz: 22, col: PRIMARY });
  y += 30;
  T(`Devis etabli pour ${clean(devis.nom_garage)} - ${clean(devis.nom_contact)}`, MG, y, { sz: 11, col: GRAY });
  y += 20;

  // 2. BLOC INFOS ────────────────────────────────────────────────────
  ensure(130);
  const HALF = (CW - 12) / 2;
  const COL2 = MG + HALF + 12;
  const ROW_H = 19;

  function drawInfoCard(x: number, yStart: number, title: string, rows: [string, string][]) {
    const cardH = 14 + 13 + 6 + rows.length * ROW_H + 10;
    RR(x, yStart, HALF, cardH, 8, { fill: BG_CARD, stroke: BORDER, sw: 0.8 });
    T(title, x + 14, yStart + 14, { f: Bold, sz: 8.5, col: PURPLE });
    HL(yStart + 33, x + 8, x + HALF - 8);
    rows.forEach(([lbl, val], i) => {
      const ry = yStart + 33 + 6 + i * ROW_H + 13;
      T(lbl, x + 14, ry, { sz: 10, col: GRAY });
      const vW = Math.min(Bold.widthOfTextAtSize(clean(val), 10.5), HALF * 0.52);
      T(clean(val), x + HALF - 12 - vW, ry, { f: Bold, sz: 10.5, col: DARK, maxW: HALF * 0.52 });
      if (i < rows.length - 1) HL(ry + 6, x + 10, x + HALF - 10);
    });
    return cardH;
  }

  const vh = drawInfoCard(MG, y, 'VEHICULE', [
    ['Marque',              devis.marque],
    ['Modele',              devis.modele],
    ['Mise en circulation', devis.date_mise_en_circulation],
    ['Kilometrage',         fmtKm(devis.kilometrage)],
  ]);
  const gr = drawInfoCard(COL2, y, 'GARAGE', [
    ['Etablissement', devis.nom_garage],
    ['Contact',       devis.nom_contact],
    ['Email',         devis.email],
    ['Telephone',     devis.telephone],
  ]);
  y += Math.max(vh, gr) + 22;

  // 3. GARANTIES ─────────────────────────────────────────────────────
  const sorted = [...garanties].sort((a, b) => b.niveau - a.niveau);
  ensure(40);
  y = sectionTitle('GARANTIES PROPOSEES', y);

  const CARD_HDR = 42;
  const GRID_H   = 60;
  const CARD_H   = CARD_HDR + GRID_H;

  sorted.forEach((g, idx) => {
    const isRec = idx === 0;
    ensure(CARD_H + 14);

    // Ombre recommandée : double bordure
    if (isRec) RR(MG - 2, y - 2, CW + 4, CARD_H + 4, 11, { stroke: PRIMARY, sw: 1.5 });

    // Fond blanc de la carte
    RR(MG, y, CW, CARD_H, 10, { fill: WHITE, stroke: isRec ? PRIMARY : BORDER, sw: 0.8 });

    // ── Header de la carte ──────────────────────────────────────────
    if (isRec) {
      // Dégradé pleine carte-header avec coins arrondis en haut seulement
      GRD(MG, y, CW, CARD_HDR);
      // Recouvrir les coins inférieurs du dégradé pour préserver fond blanc
      const rb = PH - y - CARD_HDR;
      cur.pg.drawRectangle({ x: MG, y: rb, width: CW, height: 10, color: WHITE });
    } else {
      // Fond clair, coins arrondis en haut seulement
      const r = 10;
      const yb = PH - y - CARD_HDR;
      cur.pg.drawRectangle({ x: MG + r, y: yb, width: CW - 2*r, height: CARD_HDR, color: BG_CARD });
      cur.pg.drawRectangle({ x: MG, y: yb + r, width: CW, height: CARD_HDR - r, color: BG_CARD });
      cur.pg.drawEllipse({ x: MG + r, y: yb + CARD_HDR - r, xScale: r, yScale: r, color: BG_CARD });
      cur.pg.drawEllipse({ x: MG + CW - r, y: yb + CARD_HDR - r, xScale: r, yScale: r, color: BG_CARD });
    }

    // Nom de la garantie
    const nameCol = isRec ? WHITE : DARK;
    T(clean(g.nomCommercial), MG + 14, y + 15, { f: Bold, sz: 13, col: nameCol, maxW: CW * 0.55 });

    // Étoiles
    const starCol = isRec ? GOLD_L : GOLD;
    const starSz  = 9.5;
    const starFont = Reg;
    for (let i = 0; i < 5; i++) {
      const sc = i < g.niveau ? starCol : rgb(0.75, 0.75, 0.75);
      cur.pg.drawText('★', { x: MG + 14 + i * 11.5, y: PH - y - 31, font: starFont, size: starSz, color: sc });
    }

    // Badge "RECOMMANDE"
    if (isRec) {
      const bLabel = 'RECOMMANDE';
      const bw = Bold.widthOfTextAtSize(bLabel, 7) + 10;
      const bh = 14, bx = MG + 14 + 5 * 11.5 + 10, byTop = y + 23;
      const byb = PH - byTop - bh;
      cur.pg.drawRectangle({ x: bx, y: byb, width: bw, height: bh,
        color: WHITE, opacity: 0.22,
        borderColor: WHITE, borderWidth: 0.8, borderOpacity: 0.5 });
      cur.pg.drawText(bLabel, { x: bx + 5, y: byb + (bh - 7)/2, font: Bold, size: 7, color: WHITE });
    }

    // Badge plafond (droite)
    const plaf  = clean(g.plafondIntervention);
    const pw    = Bold.widthOfTextAtSize(plaf, 9) + 16;
    const ph    = 18, px = MG + CW - 14 - pw, py = y + (CARD_HDR - ph) / 2;
    if (isRec) {
      // Blanc semi-transparent
      const pyb = PH - py - ph;
      cur.pg.drawRectangle({ x: px, y: pyb, width: pw, height: ph,
        color: WHITE, opacity: 0.2,
        borderColor: WHITE, borderWidth: 0.7, borderOpacity: 0.4 });
      cur.pg.drawText(plaf, { x: px + 8, y: pyb + (ph - 9)/2, font: Bold, size: 9, color: WHITE });
    } else {
      RR(px, py, pw, ph, ph/2, { fill: BADGE_BG });
      T(plaf, px + 8, py + ph/2 + 3.5, { f: Bold, sz: 9, col: PRIMARY });
    }

    // ── Grille des prix ────────────────────────────────────────────
    const gY  = y + CARD_HDR;
    const cW3 = CW / 3;
    // Fonds colonnes
    R(MG,            gY, cW3, GRID_H, { fill: WHITE });
    R(MG + cW3,      gY, cW3, GRID_H, { fill: BG_12 });
    R(MG + 2 * cW3,  gY, cW3, GRID_H, { fill: WHITE });
    // Séparateurs verticaux
    cur.pg.drawLine({ start: {x: MG + cW3,     y: PH - gY}, end: {x: MG + cW3,     y: PH - gY - GRID_H}, thickness: 0.5, color: BORDER });
    cur.pg.drawLine({ start: {x: MG + 2 * cW3, y: PH - gY}, end: {x: MG + 2 * cW3, y: PH - gY - GRID_H}, thickness: 0.5, color: BORDER });

    const periods: Array<[string, '6' | '12' | '24']> = [['6 MOIS', '6'], ['12 MOIS', '12'], ['24 MOIS', '24']];
    periods.forEach(([dur, key], ci) => {
      const cx   = MG + ci * cW3;
      const mid  = cx + cW3 / 2;
      const is12 = key === '12';
      const df   = is12 ? Bold : Reg;
      const dSz  = 9;
      const dCol = is12 ? PRIMARY : GRAY;
      const pStr = fmtPrix(g.prixFinal[key]);
      const pSz  = is12 ? 15 : 13;
      const pCol = is12 ? PRIMARY : DARK;
      const pf   = is12 ? Bold : Reg;
      T(dur, mid - df.widthOfTextAtSize(dur, dSz)/2, gY + 14, { f: df, sz: dSz, col: dCol });
      T(pStr, mid - pf.widthOfTextAtSize(pStr, pSz)/2, gY + 32, { f: pf, sz: pSz, col: pCol });
      if (is12) {
        const rl = 'RECOMMANDE';
        T(rl, mid - Bold.widthOfTextAtSize(rl, 7.5)/2, gY + 50, { f: Bold, sz: 7.5, col: PRIMARY });
      }
    });

    y += CARD_H + 12;
  });

  // 4. ENCADRÉS ──────────────────────────────────────────────────────
  ensure(80);
  y += 4;
  const encW = (CW - 10) / 2;

  [
    { title: 'Plafond par intervention',
      text: 'Le plafond se renouvelle a chaque sinistre — pas d\'enveloppe globale qui s\'epuise.' },
    { title: 'Plafond sans degressivite',
      text: 'Votre plafond reste identique meme apres 7 ou 10 ans, quelle que soit l\'anciennete du vehicule.' },
  ].forEach((enc, i) => {
    const ex = MG + i * (encW + 10);
    const lines = wrapText(enc.text, Reg, 9, encW - 24);
    const encH = 14 + 13 + 6 + lines.length * 12 + 10;
    const eyb = PH - y - encH;

    // Fond + coins arrondis
    RR(ex, y, encW, encH, 8, { fill: BG_BLUE });
    // Barre gauche bleue
    cur.pg.drawRectangle({ x: ex, y: eyb + 8, width: 3, height: encH - 16, color: BLUE });
    cur.pg.drawEllipse({ x: ex + 3, y: eyb + 8 + 4, xScale: 4, yScale: 4, color: BLUE });
    cur.pg.drawEllipse({ x: ex + 3, y: eyb + encH - 8 - 4, xScale: 4, yScale: 4, color: BLUE });
    cur.pg.drawRectangle({ x: ex, y: eyb + 8 + 4, width: 3, height: encH - 16 - 8, color: BLUE });

    T(clean(enc.title), ex + 14, y + 14, { f: Bold, sz: 10, col: DARK_BL });
    lines.forEach((line, li) => {
      T(line, ex + 14, y + 29 + li * 12, { sz: 9, col: GRAY });
    });
  });

  const encMaxH = (() => {
    const lines1 = wrapText([
      'Le plafond se renouvelle a chaque sinistre — pas d\'enveloppe globale qui s\'epuise.',
      'Votre plafond reste identique meme apres 7 ou 10 ans, quelle que soit l\'anciennete du vehicule.',
    ].reduce((a, b) => (a.length > b.length ? a : b)), Reg, 9, encW - 24);
    return 14 + 13 + 6 + lines1.length * 12 + 10;
  })();
  y += encMaxH + 16;

  // 5. AVANTAGES COMMUNS ─────────────────────────────────────────────
  ensure(120);
  y = sectionTitle('AVANTAGES COMMUNS', y);

  const avs = [
    "Main d'oeuvre incluse",
    'Reseau national agree',
    'Assistance 24h/24 — 7j/7',
    'Pas de franchise kilometrique',
    'Activation immediate',
    'Gestion sinistre directe',
  ];
  const ROWS_AV = Math.ceil(avs.length / 2);
  const avCardH = 14 + ROWS_AV * 24 + 10;
  RR(MG, y, CW, avCardH, 8, { fill: BG_CARD, stroke: BORDER, sw: 0.8 });

  avs.forEach((av, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const ax = MG + col * (CW / 2) + 14;
    const ay = y + 14 + row * 24;
    // Cercle vert
    cur.pg.drawEllipse({ x: ax + 7, y: PH - ay - 7, xScale: 7, yScale: 7, color: GREEN });
    cur.pg.drawText('✓', { x: ax + 3, y: PH - ay - 10, font: Bold, size: 8, color: WHITE });
    T(clean(av), ax + 17, ay + 7, { sz: 10.5, col: DARK });
  });
  y += avCardH + 16;

  // 6. TÉLÉCHARGER LES CONDITIONS GÉNÉRALES ─────────────────────────
  const cgItems = sorted.filter(g => g.fichierCG);
  if (cgItems.length > 0) {
    ensure(30 + cgItems.length * 38);
    y = sectionTitle('TELECHARGER LES CONDITIONS GENERALES', y);

    cgItems.forEach(g => {
      const label    = clean(`CG ${g.nomCommercial}`);
      const trackUrl = `${BASE_URL}/api/track-cg?d=${encodeURIComponent(devis.id)}&cg=${encodeURIComponent(g.fichierCG)}&nom=${encodeURIComponent(g.nomCommercial)}`;
      const btnH = 30, btnW = CW;
      const btnYb = PH - y - btnH;

      // Fond du bouton
      RR(MG, y, btnW, btnH, 8, { fill: BADGE_BG, stroke: BADGE_BD, sw: 0.8 });

      // Icône ↓ dans carré violet
      const iconSz = 16, iconX = MG + 10, iconY = y + (btnH - iconSz) / 2;
      RR(iconX, iconY, iconSz, iconSz, 4, { fill: PRIMARY });
      const arrW = Bold.widthOfTextAtSize('↓', 9);
      cur.pg.drawText('↓', { x: iconX + (iconSz - arrW)/2, y: PH - iconY - iconSz/2 - 4, font: Bold, size: 9, color: WHITE });

      // Texte du lien
      T(label, MG + 10 + iconSz + 8, y + btnH/2 + 3.5, { f: Bold, sz: 11, col: PRIMARY, maxW: btnW - 60 });

      // Annotation lien
      LNK(y, MG, btnW, btnH, trackUrl);
      y += btnH + 8;
    });
  }

  drawFooter();

  return Buffer.from(await doc.save());
}
