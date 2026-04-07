import { PDFDocument, StandardFonts, rgb, PageSizes, PDFName, PDFArray, PDFString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { Devis, GarantieProposee } from '@/types';

// ── Sanitise pour WinAnsi (fallback Helvetica) ────────────────────────
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

// ── Couleurs ──────────────────────────────────────────────────────────
const VIOLET  = rgb(0.220, 0.094, 0.576);  // #381893
const BLUE    = rgb(0.278, 0.706, 0.882);  // #47b4e1
const DARK    = rgb(0.102, 0.102, 0.180);
const GRAY    = rgb(0.431, 0.459, 0.514);
const LGRAY   = rgb(0.580, 0.600, 0.635);
const BORDER  = rgb(0.878, 0.886, 0.910);
const WHITE   = rgb(1, 1, 1);
const VLIGHT  = rgb(0.961, 0.953, 0.988);  // violet très clair

const gammeAccent = (g: string) => {
  if (g === 'eco')          return rgb(0.180, 0.490, 0.310);
  if (g === 'luxe')         return rgb(0.102, 0.102, 0.180);
  if (g === 'luxe_premium') return rgb(0.051, 0.051, 0.102);
  return VIOLET;
};

// ══════════════════════════════════════════════════════════════════════
export async function genererPDFDevis(
  devis: Devis,
  garanties: GarantieProposee[]
): Promise<Buffer> {

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(clean(`Devis - ${devis.marque} ${devis.modele}`));
  doc.setAuthor('Garantie Plus');

  // ── Polices : Inter (typo du site) avec fallback Helvetica ───────────
  let Bold: Awaited<ReturnType<typeof doc.embedFont>>;
  let Reg:  Awaited<ReturnType<typeof doc.embedFont>>;
  try {
    const rp = path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf');
    const bp = path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf');
    Reg  = await doc.embedFont(fs.readFileSync(rp));
    Bold = await doc.embedFont(fs.readFileSync(bp));
  } catch {
    Reg  = await doc.embedFont(StandardFonts.Helvetica);
    Bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  const PW = PageSizes.A4[0];   // 595
  const PH = PageSizes.A4[1];   // 842
  const MG = 40;
  const CW = PW - MG * 2;      // 515

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis.garantieplus.fr';

  // ── Logo ──────────────────────────────────────────────────────────────
  let logoImg: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    logoImg = await doc.embedPng(fs.readFileSync(path.join(process.cwd(), 'public', 'logo.png')));
  } catch { logoImg = null; }

  // ══════════════════════════════════════════════════════════════════════
  // Factory de page
  // ══════════════════════════════════════════════════════════════════════
  function newPage() {
    const pg = doc.addPage(PageSizes.A4);
    pg.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: WHITE });

    // Texte avec troncature
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

    // Rectangle (yTop = depuis le haut)
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

    // Rectangle arrondi — fill + stroke simulés
    function RR(
      x: number, yTop: number, w: number, h: number, r: number,
      o: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; sw?: number } = {}
    ) {
      const yb = PH - yTop - h;
      if (o.fill) {
        const f = o.fill;
        pg.drawRectangle({ x: x + r,     y: yb,       width: w - 2 * r, height: h,       color: f });
        pg.drawRectangle({ x,             y: yb + r,   width: w,         height: h - 2*r, color: f });
        pg.drawEllipse({ x: x + r,       y: yb + r,   xScale: r, yScale: r, color: f });
        pg.drawEllipse({ x: x + w - r,   y: yb + r,   xScale: r, yScale: r, color: f });
        pg.drawEllipse({ x: x + r,       y: yb+h - r, xScale: r, yScale: r, color: f });
        pg.drawEllipse({ x: x + w - r,   y: yb+h - r, xScale: r, yScale: r, color: f });
      }
      if (o.stroke) {
        const s = o.stroke, sw = o.sw ?? 0.5;
        pg.drawLine({ start: {x: x+r,   y: yb+h},   end: {x: x+w-r, y: yb+h},   thickness: sw, color: s });
        pg.drawLine({ start: {x: x+r,   y: yb},     end: {x: x+w-r, y: yb},     thickness: sw, color: s });
        pg.drawLine({ start: {x,         y: yb+r},   end: {x,         y: yb+h-r}, thickness: sw, color: s });
        pg.drawLine({ start: {x: x+w,   y: yb+r},   end: {x: x+w,   y: yb+h-r}, thickness: sw, color: s });
      }
    }

    // Ligne horizontale
    function HL(y: number, x1 = MG, x2 = MG + CW, col = BORDER) {
      pg.drawLine({ start: { x: x1, y: PH - y }, end: { x: x2, y: PH - y }, thickness: 0.5, color: col });
    }

    // Ligne verticale
    function VL(x: number, y1: number, y2: number, col = BORDER) {
      pg.drawLine({ start: { x, y: PH - y1 }, end: { x, y: PH - y2 }, thickness: 0.5, color: col });
    }

    // Pill / badge arrondi — retourne la largeur
    function Pill(
      label: string, x: number, yTop: number, h: number,
      bg: ReturnType<typeof rgb>, textCol: ReturnType<typeof rgb>, sz = 6.5
    ): number {
      const tw = Bold.widthOfTextAtSize(clean(label), sz);
      const pw = tw + 14;
      const r  = h / 2;
      const yb = PH - yTop - h;
      pg.drawEllipse({ x: x + r,      y: yb + r, xScale: r, yScale: r, color: bg });
      pg.drawEllipse({ x: x + pw - r, y: yb + r, xScale: r, yScale: r, color: bg });
      pg.drawRectangle({ x: x + r, y: yb, width: pw - 2 * r, height: h, color: bg });
      pg.drawText(clean(label), { x: x + (pw - tw) / 2, y: yb + (h - sz) / 2 + 0.5, font: Bold, size: sz, color: textCol });
      return pw;
    }

    return { pg, T, R, RR, HL, VL, Pill };
  }

  let cur = newPage();
  let y   = 0;

  // Closures qui lisent toujours `cur` au moment de l'appel
  const T    = (...a: Parameters<ReturnType<typeof newPage>['T']>)    => cur.T(...a);
  const R    = (...a: Parameters<ReturnType<typeof newPage>['R']>)    => cur.R(...a);
  const RR   = (...a: Parameters<ReturnType<typeof newPage>['RR']>)   => cur.RR(...a);
  const HL   = (...a: Parameters<ReturnType<typeof newPage>['HL']>)   => cur.HL(...a);
  const VL   = (...a: Parameters<ReturnType<typeof newPage>['VL']>)   => cur.VL(...a);
  const Pill = (...a: Parameters<ReturnType<typeof newPage>['Pill']>) => cur.Pill(...a);

  // Annotation lien PDF
  function addLink(yTop: number, lx: number, lw: number, lh: number, url: string) {
    const yb = PH - yTop - lh;
    const annot = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [lx, yb, lx + lw, yb + lh],
      Border: [0, 0, 0],
      A: doc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(url) }),
    });
    const ref = doc.context.register(annot);
    const existing = cur.pg.node.get(PDFName.of('Annots'));
    if (existing instanceof PDFArray) {
      existing.push(ref);
    } else {
      cur.pg.node.set(PDFName.of('Annots'), doc.context.obj([ref]));
    }
  }

  // Footer bas de page
  function drawFooter() {
    const fy = 22;  // y depuis le bas de la page (PDF coords)
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

  // ══════════════════════════════════════════════════════════════════════
  // HEADER : logo gauche | pill dégradé droite
  // ══════════════════════════════════════════════════════════════════════
  const HDR_H = 84;

  if (logoImg) {
    const LW = 185;
    const LH = LW * (749 / 1920);
    const LY = (HDR_H - LH) / 2;
    cur.pg.drawImage(logoImg, { x: MG, y: PH - LY - LH, width: LW, height: LH });
  } else {
    T('GARANTIE PLUS', MG, 36, { f: Bold, sz: 18, col: DARK });
  }

  // Pill dégradé "DEVIS PERSONNALISE"
  const PILL_W = 228, PILL_H = 50;
  const PILL_X = PW - MG - PILL_W;
  const PILL_Y = (HDR_H - PILL_H) / 2;
  const PILL_R = PILL_H / 2;

  cur.pg.drawEllipse({ x: PILL_X + PILL_R,         y: PH - PILL_Y - PILL_R, xScale: PILL_R, yScale: PILL_R, color: VIOLET });
  cur.pg.drawEllipse({ x: PILL_X + PILL_W - PILL_R, y: PH - PILL_Y - PILL_R, xScale: PILL_R, yScale: PILL_R, color: BLUE });

  const IW = PILL_W - 2 * PILL_R;
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    R(PILL_X + PILL_R + i * IW / 50, PILL_Y, IW / 50 + 1, PILL_H, {
      fill: rgb(0.220 + t*(0.278-0.220), 0.094 + t*(0.706-0.094), 0.576 + t*(0.882-0.576)),
    });
  }
  const PT  = 'DEVIS PERSONNALISE';
  const PTW = Bold.widthOfTextAtSize(PT, 11);
  T(PT, PILL_X + (PILL_W - PTW) / 2, PILL_Y + PILL_H / 2 + 4, { f: Bold, sz: 11, col: WHITE });

  // Pas de ligne séparatrice — espace direct
  y = HDR_H + 38;

  // ══════════════════════════════════════════════════════════════════════
  // TITRE
  // ══════════════════════════════════════════════════════════════════════
  T(`${devis.marque} ${devis.modele}`, MG, y, { f: Bold, sz: 20, col: DARK });
  y += 23;

  const dateObj = new Date(devis.created_at);
  const dateFmt = clean(dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
  const timeFmt = clean(dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  T(`Devis du ${dateFmt} a ${timeFmt}`, MG, y + 12, { sz: 9, col: GRAY });
  y += 32;

  // ══════════════════════════════════════════════════════════════════════
  // CARDS VEHICULE + GARAGE
  // ══════════════════════════════════════════════════════════════════════
  ensure(160);

  const HALF = (CW - 14) / 2;
  const RCX  = MG + HALF + 14;

  function drawInfoCard(
    xCard: number, yCard: number,
    title: string, rows: [string, string][],
    extraRows: string[]
  ) {
    const RH    = 22;
    const cardH = rows.length * RH + 18 + (extraRows.length > 0 ? 34 : 0) + 8;

    RR(xCard, yCard, HALF, cardH, 6, { fill: WHITE, stroke: BORDER, sw: 0.8 });
    T(title, xCard + 12, yCard + 16, { f: Bold, sz: 10, col: DARK });
    HL(yCard + 23, xCard + 8, xCard + HALF - 8, BORDER);

    rows.forEach(([lbl, val], i) => {
      const ry = yCard + 23 + 16 + i * RH;
      T(lbl, xCard + 12, ry, { sz: 8, col: GRAY });
      const safeVal = clean(val);
      const maxVW   = HALF * 0.55;
      const vW      = Math.min(Bold.widthOfTextAtSize(safeVal, 8.5), maxVW);
      T(safeVal, xCard + HALF - 12 - vW, ry, { f: Bold, sz: 8.5, col: DARK, maxW: maxVW });
      if (i < rows.length - 1) HL(ry + 8, xCard + 10, xCard + HALF - 10, rgb(0.94, 0.94, 0.97));
    });

    if (extraRows.length > 0) {
      const tagY = yCard + 23 + rows.length * RH + 16;
      T('Caracteristiques', xCard + 12, tagY + 2, { sz: 7.5, col: GRAY });
      let cx = xCard + 12;
      extraRows.forEach(tag => {
        const tw = Bold.widthOfTextAtSize(clean(tag), 6.5) + 14;
        if (cx + tw > xCard + HALF - 10) return;
        Pill(tag, cx, tagY + 8, 16, VLIGHT, VIOLET, 6.5);
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
    ['Marque',               devis.marque],
    ['Modele',               devis.modele],
    ['Mise en circulation',  devis.date_mise_en_circulation],
    ['Kilometrage',          fmtKm(devis.kilometrage)],
  ], tags);

  const grCardH = drawInfoCard(RCX, y, 'Garage', [
    ['Garage',    devis.nom_garage],
    ['Contact',   devis.nom_contact],
    ['Email',     devis.email],
    ['Telephone', devis.telephone],
  ], []);

  y += Math.max(vhCardH, grCardH) + 22;

  // ══════════════════════════════════════════════════════════════════════
  // TABLE GARANTIES
  // ══════════════════════════════════════════════════════════════════════
  const sorted = [...garanties].sort((a, b) => b.niveau - a.niveau);

  const ROW_H_REC = 48;   // hauteur ligne recommandée (nom + badge)
  const ROW_H_STD = 34;   // hauteur lignes standard

  const firstH   = sorted.length > 0 ? ROW_H_REC : 0;
  const othersH  = sorted.length > 1 ? (sorted.length - 1) * ROW_H_STD : 0;
  const tableH   = 6 + 22 + 4 + firstH + othersH + 14;

  ensure(56 + tableH);

  T('Garanties proposees', MG, y + 14, { f: Bold, sz: 11, col: DARK });
  y += 24;

  // Colonnes
  const CG  = CW * 0.38;
  const CP  = CW * 0.145;
  const C6  = CW * 0.12;
  const C12 = CW * 0.155;
  const C24 = CW - CG - CP - C6 - C12;

  const XP  = MG + CG;
  const X6  = XP + CP;
  const X12 = X6 + C6;
  const X24 = X12 + C12;

  RR(MG, y, CW, tableH, 6, { fill: WHITE, stroke: BORDER, sw: 0.8 });
  y += 6;

  // En-têtes
  const thY = y + 14;
  T('Garantie', MG + 14, thY, { f: Bold, sz: 7.5, col: GRAY });
  T('Plafond',  XP + 8,  thY, { f: Bold, sz: 7.5, col: GRAY });
  T('6 mois',   X6 + 8,  thY, { f: Bold, sz: 7.5, col: GRAY });
  T('12 mois',  X12 + 8, thY, { f: Bold, sz: 7.5, col: GRAY });
  T('24 mois',  X24 + 8, thY, { f: Bold, sz: 7.5, col: GRAY });
  y += 22;
  HL(y, MG + 6, MG + CW - 6, BORDER);
  y += 4;

  sorted.forEach((g, i) => {
    const isRec  = i === 0;
    const rowH   = isRec ? ROW_H_REC : ROW_H_STD;
    const accent = gammeAccent(g.gamme);
    const midY   = y + rowH / 2 + 2;

    // Fond violet clair pour la ligne recommandée
    if (isRec) {
      R(MG + 1, y, CW - 2, rowH, { fill: VLIGHT });
    }

    // Barre d'accent gauche
    R(MG + 1, y + 1, 3, rowH - 2, { fill: accent });

    // Nom de la garantie
    const nameY = isRec ? y + 13 : midY;
    T(clean(g.nomCommercial), MG + 14, nameY, { f: Bold, sz: 8.5, col: DARK, maxW: CG - 22 });

    // Badge "RECOMMANDE" sous le nom pour la première
    if (isRec) {
      Pill('RECOMMANDE', MG + 14, y + 13 + 13, 14, VIOLET, WHITE, 6.5);
    }

    // Prix (centrés verticalement dans la rangée)
    T(clean(g.plafondIntervention), XP + 8,  midY, { sz: 8.5, col: DARK });
    T(fmtPrix(g.prixFinal['6']),   X6 + 8,  midY, { sz: 8.5, col: DARK });
    T(fmtPrix(g.prixFinal['12']),  X12 + 8, midY, { f: Bold, sz: 8.5, col: VIOLET });
    T(fmtPrix(g.prixFinal['24']),  X24 + 8, midY, { sz: 8.5, col: DARK });

    y += rowH;
    if (i < sorted.length - 1) HL(y, MG + 6, MG + CW - 6, rgb(0.94, 0.94, 0.97));
  });

  y += 14;

  // ══════════════════════════════════════════════════════════════════════
  // LIENS CONDITIONS GÉNÉRALES
  // ══════════════════════════════════════════════════════════════════════
  const cgItems = sorted.filter(g => g.fichierCG);
  if (cgItems.length > 0) {
    ensure(22 + cgItems.length * 20 + 10);
    y += 6;

    T('Telechargez les conditions generales :', MG, y + 11, { f: Bold, sz: 8.5, col: DARK });
    y += 20;

    cgItems.forEach(g => {
      const label    = clean(g.nomCommercial);
      const trackUrl = `${BASE_URL}/api/track-cg?d=${encodeURIComponent(devis.id)}&cg=${encodeURIComponent(g.fichierCG)}&nom=${encodeURIComponent(g.nomCommercial)}`;
      const lsz      = 8;
      const lw       = Reg.widthOfTextAtSize(label, lsz);

      // Arrow + label in violet
      T('↓  ' + label, MG, y + 11, { sz: lsz, col: VIOLET });

      // Soulignement
      cur.pg.drawLine({
        start: { x: MG, y: PH - y - 11 - 1 },
        end:   { x: MG + lw + Reg.widthOfTextAtSize('↓  ', lsz), y: PH - y - 11 - 1 },
        thickness: 0.4, color: VIOLET,
      });

      // Annotation lien cliquable
      addLink(y + 3, MG, lw + 30, 14, trackUrl);

      y += 18;
    });

    y += 6;
  }

  // ══════════════════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════════════════
  drawFooter();

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
