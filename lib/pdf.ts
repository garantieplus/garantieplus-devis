import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import { Devis, GarantieProposee } from '@/types';

// ── Sanitise pour WinAnsi (Helvetica pdf-lib) ─────────────────────────────
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
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n));

const fmtKm = (n: number) => clean(n.toLocaleString('fr-FR') + ' km');

// Retourne "Jusqu'a la VRADE" ou "Jusqu'a 10 000 EUR"
const fmtPlaf = (p: string) =>
  p === 'VRADE' ? "Jusqu'a la VRADE" : `Jusqu'a ${p}`;

// ── Couleurs ──────────────────────────────────────────────────────────────
const VIOLET  = rgb(0.220, 0.094, 0.576);  // #381893
const BLUE    = rgb(0.278, 0.706, 0.882);  // #47b4e1
const ECO     = rgb(0.180, 0.490, 0.310);  // #2E7D4F
const LUXE    = rgb(0.102, 0.102, 0.180);  // #1A1A2E
const LPREM   = rgb(0.051, 0.051, 0.102);  // #0D0D1A
const GOLD    = rgb(0.961, 0.651, 0.137);  // #F5A623
const DARK    = rgb(0.102, 0.102, 0.180);
const GRAY    = rgb(0.431, 0.459, 0.514);
const LGRAY   = rgb(0.580, 0.600, 0.635);
const BORDER  = rgb(0.878, 0.886, 0.910);
const WHITE   = rgb(1, 1, 1);
const BGPAGE  = rgb(0.973, 0.965, 0.988);   // #F8F6FC
const BGCARD  = rgb(1, 1, 1);
const BGVIOL  = rgb(0.937, 0.918, 0.980);   // violet très clair

const accentOf = (gamme: string) => {
  if (gamme === 'eco') return ECO;
  if (gamme === 'luxe') return LUXE;
  if (gamme === 'luxe_premium') return LPREM;
  return VIOLET;
};
const labelOf = (gamme: string) => {
  if (gamme === 'eco') return 'GAMME ECO';
  if (gamme === 'luxe') return 'GAMME LUXE';
  if (gamme === 'luxe_premium') return 'GAMME LUXE PREMIUM';
  return 'GAMME CLASSIQUE';
};

// ══════════════════════════════════════════════════════════════════════════
export async function genererPDFDevis(
  devis: Devis,
  garanties: GarantieProposee[]
): Promise<Buffer> {

  const doc = await PDFDocument.create();
  doc.setTitle(clean(`Devis - ${devis.marque} ${devis.modele}`));
  doc.setAuthor('Garantie Plus');

  const B = await doc.embedFont(StandardFonts.HelveticaBold);
  const R = await doc.embedFont(StandardFonts.Helvetica);

  const PW = PageSizes.A4[0];  // 595
  const PH = PageSizes.A4[1];  // 842
  const MG = 36;               // marge gauche/droite
  const CW = PW - MG * 2;     // 523

  // ── Fabrique de page ──────────────────────────────────────────────────────
  function newPage() {
    const page = doc.addPage(PageSizes.A4);
    page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: BGPAGE });

    function drawText(
      raw: string, x: number, yFromTop: number,
      opts: { font?: typeof B; size?: number; color?: ReturnType<typeof rgb>; maxWidth?: number } = {}
    ) {
      const { font = R, size = 8.5, color = DARK, maxWidth } = opts;
      let t = clean(raw);
      if (maxWidth && font.widthOfTextAtSize(t, size) > maxWidth) {
        while (t.length > 0 && font.widthOfTextAtSize(t + '...', size) > maxWidth) t = t.slice(0, -1);
        t += '...';
      }
      page.drawText(t, { x, y: PH - yFromTop, font, size, color });
    }

    function drawBox(
      x: number, yTop: number, w: number, h: number,
      opts: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; sw?: number } = {}
    ) {
      page.drawRectangle({
        x, y: PH - yTop - h, width: w, height: h,
        ...(opts.fill   ? { color: opts.fill }   : {}),
        ...(opts.stroke ? { borderColor: opts.stroke, borderWidth: opts.sw ?? 0.5 } : {}),
      });
    }

    function drawHLine(y: number, x1 = MG, x2 = MG + CW, col = BORDER) {
      page.drawLine({ start: { x: x1, y: PH - y }, end: { x: x2, y: PH - y }, thickness: 0.5, color: col });
    }

    function drawVLine(x: number, y1: number, y2: number, col = BORDER) {
      page.drawLine({ start: { x, y: PH - y1 }, end: { x, y: PH - y2 }, thickness: 0.5, color: col });
    }

    return { page, drawText, drawBox, drawHLine, drawVLine };
  }

  let cur = newPage();
  let y   = 0;

  // Closures (toujours vers la page courante)
  const T  = (...a: Parameters<ReturnType<typeof newPage>['drawText']>)  => cur.drawText(...a);
  const BX = (...a: Parameters<ReturnType<typeof newPage>['drawBox']>)   => cur.drawBox(...a);
  const HL = (...a: Parameters<ReturnType<typeof newPage>['drawHLine']>) => cur.drawHLine(...a);
  const VL = (...a: Parameters<ReturnType<typeof newPage>['drawVLine']>) => cur.drawVLine(...a);

  // Footer légal
  function drawFooter() {
    const fy = PH - 20;
    cur.page.drawLine({ start: { x: MG, y: fy + 8 }, end: { x: PW - MG, y: fy + 8 }, thickness: 0.5, color: BORDER });
    cur.drawText(
      "Garantie Plus - Societe de courtage d'assurance et de reassurance - SAS au capital de 10.000 EUR" +
      " - RCS Paris 943 193 037 - 130 rue de Courcelles 75017 Paris - ORIAS n\u00b025004236",
      MG, PH - 10, { font: R, size: 5.8, color: LGRAY }
    );
  }

  function ensure(needed: number) {
    if (y + needed > PH - 52) {
      drawFooter();
      cur = newPage();
      y   = 28;
    }
  }

  // Etoiles = rangée de petits carrés or/gris
  function drawStars(count: number, x: number, yTop: number, sz = 6) {
    for (let i = 0; i < 5; i++) {
      BX(x + i * (sz + 2), yTop, sz, sz, { fill: i < count ? GOLD : rgb(0.80, 0.80, 0.84) });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER : logo gauche (blanc) | "DEVIS PERSONNALISÉ" droite (dégradé)
  // ══════════════════════════════════════════════════════════════════════════
  const HDR_H = 68;
  const SPLIT  = Math.round(PW * 0.55);  // ~327px blanc | ~268px dégradé
  const GRAD_W = PW - SPLIT;

  // Zone blanche avec le nom de la société
  BX(0, 0, SPLIT, HDR_H, { fill: BGCARD });
  T('GARANTIE PLUS', MG, 28, { font: B, size: 20, color: VIOLET });
  T('Garanties Panne Mecanique Automobile', MG, 46, { size: 7.5, color: GRAY });
  T('ORIAS n\u00b025004236  |  130 rue de Courcelles, 75017 Paris', MG, 61, { size: 6.5, color: LGRAY });

  // Zone dégradé #381893 → #47b4e1
  const GSTEPS = 60;
  for (let i = 0; i <= GSTEPS; i++) {
    const t = i / GSTEPS;
    const c = rgb(
      0.220 + t * (0.278 - 0.220),
      0.094 + t * (0.706 - 0.094),
      0.576 + t * (0.882 - 0.576),
    );
    BX(SPLIT + i * (GRAD_W / GSTEPS), 0, GRAD_W / GSTEPS + 1, HDR_H, { fill: c });
  }

  // Textes centrés dans la zone dégradé
  const DT  = 'DEVIS PERSONNALISE';
  const DTX = SPLIT + (GRAD_W - B.widthOfTextAtSize(DT, 13)) / 2;
  T(DT, DTX, 26, { font: B, size: 13, color: WHITE });

  const dateStr = clean(`Devis du ${new Date().toLocaleDateString('fr-FR')}`);
  const DATEX   = SPLIT + (GRAD_W - R.widthOfTextAtSize(dateStr, 7.5)) / 2;
  T(dateStr, DATEX, 43, { size: 7.5, color: rgb(0.88, 0.92, 0.97) });

  const vehicleHdr = clean(`${devis.marque} ${devis.modele}`);
  const VHX = SPLIT + (GRAD_W - B.widthOfTextAtSize(vehicleHdr, 9.5)) / 2;
  T(vehicleHdr, VHX, 58, { font: B, size: 9.5, color: WHITE });

  // Liseré or sous le header
  BX(0, HDR_H - 2, PW, 2, { fill: GOLD });
  y = HDR_H + 16;

  // ══════════════════════════════════════════════════════════════════════════
  // INFOS VÉHICULE + GARAGE  (layout identique à l'admin)
  // ══════════════════════════════════════════════════════════════════════════
  ensure(130);

  const HALF = (CW - 10) / 2;
  const RCX  = MG + HALF + 10;  // x colonne droite

  // Titres
  BX(MG,  y, HALF, 20, { fill: VIOLET });
  T('VEHICULE', MG + 10, y + 14, { font: B, size: 7.5, color: WHITE });
  BX(RCX, y, HALF, 20, { fill: VIOLET });
  T('GARAGE / CONTACT', RCX + 10, y + 14, { font: B, size: 7.5, color: WHITE });
  y += 20;

  // ── Véhicule ──────────────────────────────────────────────────────────────
  const vhRows: [string, string][] = [
    ['Marque',        devis.marque],
    ['Modele',        devis.modele],
    ['Mise en circ.', devis.date_mise_en_circulation],
    ['Kilometrage',   fmtKm(devis.kilometrage)],
  ];
  const ROW_H = 22;
  const VBH   = vhRows.length * ROW_H + 8;
  BX(MG, y, HALF, VBH, { fill: BGCARD, stroke: BORDER });
  vhRows.forEach(([lbl, val], i) => {
    const ry = y + 14 + i * ROW_H;
    T(lbl, MG + 10, ry,   { size: 7.5, color: GRAY });
    T(val, MG + 88, ry,   { font: B, size: 7.5, color: DARK, maxWidth: HALF - 96 });
    if (i < vhRows.length - 1) HL(ry + 7, MG + 6, MG + HALF - 6);
  });

  // Tags véhicule
  const tags = [
    devis.is_4x4             && '4x4 / SUV',
    devis.is_plus_2t3        && '+2,3 tonnes',
    devis.is_plus_14cv       && '+14 CV',
    devis.is_hybride_electrique && 'Hybride/Elec.',
    devis.valeur_neuf_55k    && '>55k EUR',
    devis.valeur_neuf_100k   && '>100k EUR',
    devis.valeur_neuf_150k   && '>150k EUR',
  ].filter(Boolean) as string[];

  let extraH = 0;
  if (tags.length > 0) {
    const TH = 18;
    BX(MG, y + VBH, HALF, TH, { fill: BGVIOL, stroke: BORDER });
    let cx = MG + 8;
    tags.forEach(tag => {
      const tw = B.widthOfTextAtSize(tag, 6) + 8;
      if (cx + tw > MG + HALF - 6) return;
      BX(cx, y + VBH + 4, tw, 11, { fill: rgb(0.863, 0.835, 0.961) });
      T(tag, cx + 4, y + VBH + 12, { font: B, size: 6, color: VIOLET });
      cx += tw + 4;
    });
    extraH = TH;
  }

  // ── Garage ────────────────────────────────────────────────────────────────
  const grRows: [string, string][] = [
    ['Garage',  devis.nom_garage],
    ['Contact', devis.nom_contact],
    ['Email',   devis.email],
    ['Tel.',    devis.telephone],
  ];
  const GBH = grRows.length * ROW_H + 8;
  BX(RCX, y, HALF, GBH, { fill: BGCARD, stroke: BORDER });
  grRows.forEach(([lbl, val], i) => {
    const ry = y + 14 + i * ROW_H;
    T(lbl, RCX + 10, ry, { size: 7.5, color: GRAY });
    T(val, RCX + 58, ry, { font: B, size: 7.5, color: DARK, maxWidth: HALF - 66 });
    if (i < grRows.length - 1) HL(ry + 7, RCX + 6, RCX + HALF - 6);
  });

  y += Math.max(VBH + extraH, GBH) + 18;

  // ══════════════════════════════════════════════════════════════════════════
  // GARANTIES PROPOSÉES — triées du meilleur au moins bon
  // ══════════════════════════════════════════════════════════════════════════
  const sorted = [...garanties].sort((a, b) => b.niveau - a.niveau);

  ensure(28);

  // Titre de section
  BX(MG, y, CW, 24, { fill: DARK });
  for (let i = 0; i <= 25; i++) {
    const t = i / 25;
    const c = rgb(0.220 + t * (0.278 - 0.220), 0.094 + t * (0.706 - 0.094), 0.576 + t * (0.882 - 0.576));
    BX(MG + CW - 110 + i * (110 / 25), y, 110 / 25 + 1, 24, { fill: c });
  }
  T('GARANTIES PROPOSEES', MG + 10, y + 17, { font: B, size: 10, color: WHITE });
  if (sorted.length > 0) {
    const nbT = clean(`${sorted.length} garantie${sorted.length > 1 ? 's' : ''} disponible${sorted.length > 1 ? 's' : ''}`);
    T(nbT, PW - MG - 10 - R.widthOfTextAtSize(nbT, 7.5), y + 17, { size: 7.5, color: rgb(0.70, 0.76, 0.90) });
  }
  y += 24 + 10;

  if (sorted.length === 0) {
    ensure(44);
    BX(MG, y, CW, 38, { fill: rgb(1, 0.95, 0.95), stroke: rgb(0.90, 0.70, 0.70) });
    T('Vehicule non eligible', MG + 14, y + 15, { font: B, size: 9, color: rgb(0.75, 0.10, 0.10) });
    T('Age > 15 ans ou kilometrage > 200 000 km - contact@garantieplus.fr', MG + 14, y + 28, { size: 7.5, color: GRAY });
    y += 38 + 14;
  }

  // ── Colonnes du tableau (1 ligne de données par garantie) ─────────────────
  // Colonnes : Plafond | 6 mois | 12 mois | 24 mois
  const CP  = 140;              // Plafond
  const C6  = 90;               // 6 mois
  const C12 = 118;              // 12 mois (légèrement plus large pour le badge)
  const C24 = CW - CP - C6 - C12; // 24 mois = 175

  // Positions X absolues des séparateurs
  const X6  = MG + CP;
  const X12 = MG + CP + C6;
  const X24 = MG + CP + C6 + C12;

  sorted.forEach((g, idx) => {
    const isFirst    = idx === 0;
    const isLuxePrem = g.gamme === 'luxe_premium';
    const accent     = accentOf(g.gamme);
    const gLabel     = labelOf(g.gamme);

    // Le plafond affiché dans le tableau
    // Si plafondParDuree, on affiche celui de 12 mois (le recommandé)
    const plafDisplay = g.plafondParDuree
      ? g.plafondParDuree['12']
      : g.plafondIntervention;

    // Hauteurs de la carte
    const H_HDR   = isFirst ? 50 : 34;  // en-tête coloré
    const H_THDR  = 18;                  // ligne d'en-tête des colonnes
    const H_DATA  = isFirst ? 30 : 24;  // ligne de données
    const CARD_H  = H_HDR + H_THDR + H_DATA + 10;  // +10 note bas

    ensure(CARD_H + 12);

    // Ombre portée sur la première carte
    if (isFirst) {
      BX(MG + 3, y + 3, CW, CARD_H, { fill: rgb(0.76, 0.68, 0.92) });
    }

    // Boite de la carte
    BX(MG, y, CW, CARD_H, {
      fill: BGCARD,
      stroke: isLuxePrem ? GOLD : (isFirst ? accent : BORDER),
      sw: isFirst ? 1.5 : (isLuxePrem ? 2 : 0.5),
    });

    // ── En-tête coloré ─────────────────────────────────────────────────────
    BX(MG, y, CW, H_HDR, { fill: accent });
    BX(MG, y, 4, H_HDR, { fill: rgb(0, 0, 0) });  // barre gauche
    BX(MG, y + H_HDR - 2, CW, 2, { fill: GOLD });  // liseré or

    // Gamme label
    T(gLabel, MG + 10, y + 12, { font: B, size: 7, color: rgb(0.88, 0.92, 0.98) });

    // Nom commercial (safe() supprime les ⭐ émojis)
    const nomW = isFirst ? CW - 195 : CW - 175;
    T(clean(g.nomCommercial), MG + 10, y + (isFirst ? 27 : 24), {
      font: B, size: isFirst ? 12 : 10, color: WHITE, maxWidth: nomW,
    });

    // Etoiles
    if (isFirst) {
      drawStars(g.niveau, MG + 10, y + H_HDR - 19, 8);
    } else {
      drawStars(g.niveau, MG + 10, y + H_HDR - 13, 6);
    }

    // Eligibilité (droite)
    const eligTxt = clean(`< ${g.ageMaxAns} ans  |  < ${g.kmMax.toLocaleString('fr-FR')} km`);
    T(eligTxt, MG + CW - 10 - R.widthOfTextAtSize(eligTxt, 7), y + 12, {
      size: 7, color: rgb(0.88, 0.91, 0.96),
    });

    // Pondération
    if (g.pondereApplique) {
      const pt = 'Tarif pondere x1,5 applique';
      T(pt, MG + CW - 10 - R.widthOfTextAtSize(pt, 6.5), y + 23, {
        size: 6.5, color: rgb(1, 0.95, 0.70),
      });
    }

    // ── Badge MEILLEURE COUVERTURE (première carte) ────────────────────────
    if (isFirst) {
      const BADGE = 'MEILLEURE COUVERTURE';
      const BW    = B.widthOfTextAtSize(BADGE, 6.5) + 14;
      const BH    = 16;
      const bx    = MG + CW - BW - 5;
      const by    = y + H_HDR - BH - 5;
      BX(bx, by, BW, BH, { fill: GOLD });
      T(BADGE, bx + 7, by + 11, { font: B, size: 6.5, color: DARK });
    }

    y += H_HDR;

    // ── En-tête colonnes ───────────────────────────────────────────────────
    // Fond légèrement teinté pour l'en-tête des colonnes
    BX(MG,  y, CW, H_THDR, { fill: rgb(0.950, 0.942, 0.978), stroke: BORDER, sw: 0.3 });
    VL(X6,  y, y + H_THDR);
    VL(X12, y, y + H_THDR);
    VL(X24, y, y + H_THDR);

    T('PLAFOND', MG + 10, y + 13, { font: B, size: 7, color: GRAY });
    T('6 MOIS',  X6  + 8, y + 13, { font: B, size: 7, color: GRAY });
    T('12 MOIS', X12 + 8, y + 13, { font: B, size: 7, color: VIOLET });

    // Badge RECOMMANDÉ dans l'en-tête 12 mois
    const RT = 'RECOMMANDE';
    const RW = B.widthOfTextAtSize(RT, 5.5) + 8;
    const RH = 10;
    const rx = X24 - RW - 4;
    const ry = y + (H_THDR - RH) / 2;
    BX(rx, ry, RW, RH, { fill: VIOLET });
    T(RT, rx + 4, ry + 7.5, { font: B, size: 5.5, color: WHITE });

    T('24 MOIS', X24 + 8, y + 13, { font: B, size: 7, color: GRAY });

    y += H_THDR;

    // ── Ligne de données ───────────────────────────────────────────────────
    // Fond blanc + liseré or à gauche (met en valeur la carte entière)
    BX(MG, y, CW, H_DATA, { fill: BGCARD, stroke: BORDER, sw: 0.3 });
    VL(X6,  y, y + H_DATA);
    VL(X12, y, y + H_DATA);
    VL(X24, y, y + H_DATA);

    const dy = y + Math.ceil(H_DATA * 0.63);  // y baseline du texte

    // Plafond (GRAS)
    T(fmtPlaf(plafDisplay), MG + 10, dy, {
      font: B, size: isFirst ? 9 : 8, color: DARK, maxWidth: CP - 16,
    });
    // Note si plafond varie par durée
    if (g.plafondParDuree) {
      T('(plafond 12 mois)', MG + 10, dy + 9, { size: 5.5, color: LGRAY });
    }

    // Prix 6 mois
    T(fmtPrix(g.prixFinal['6']), X6 + 8, dy, {
      font: B, size: isFirst ? 10 : 9, color: DARK,
    });

    // Prix 12 mois — mis en avant (couleur gamme, plus grand)
    T(fmtPrix(g.prixFinal['12']), X12 + 8, dy, {
      font: B, size: isFirst ? 13 : 11, color: accent,
    });

    // Prix 24 mois
    T(fmtPrix(g.prixFinal['24']), X24 + 8, dy, {
      font: B, size: isFirst ? 10 : 9, color: DARK,
    });

    y += H_DATA;

    // Note TTC (droite)
    const noteTxt = "Tarif TTC - Taxe d'assurance incluse";
    T(noteTxt, MG + CW - R.widthOfTextAtSize(noteTxt, 6) - 6, y + 8, { size: 6, color: LGRAY });

    y += 12 + (isFirst ? 14 : 10);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LES + DE GARANTIE PLUS
  // ══════════════════════════════════════════════════════════════════════════
  const avantages = [
    'Pas de vetuste',        'Cessible gratuitement',  'Pas de franchise',
    'Kilometrage illimite',  "Pas d'avance de frais",  'Pas de carence',
    'Couverture Europeenne', '100% Digital',           'Plafond PAR intervention',
  ];
  const AVG_ROWS  = Math.ceil(avantages.length / 3);
  const AVG_ROW_H = 22;
  const PLUS_H    = 24 + AVG_ROWS * AVG_ROW_H + 12;

  ensure(PLUS_H);

  // Titre section
  BX(MG, y, CW, 24, { fill: DARK });
  for (let i = 0; i <= 25; i++) {
    const t = i / 25;
    const c = rgb(0.220 + t * (0.278 - 0.220), 0.094 + t * (0.706 - 0.094), 0.576 + t * (0.882 - 0.576));
    BX(MG + CW - 110 + i * (110 / 25), y, 110 / 25 + 1, 24, { fill: c });
  }
  T('LES + DE GARANTIE PLUS', MG + 10, y + 17, { font: B, size: 10, color: WHITE });
  y += 24;

  // Grille 3 colonnes
  const gridH = AVG_ROWS * AVG_ROW_H + 12;
  BX(MG, y, CW, gridH, { fill: BGCARD, stroke: BORDER });
  y += 8;

  const BCOL = CW / 3;
  avantages.forEach((a, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx  = MG + col * BCOL + 10;
    const by  = y + row * AVG_ROW_H;
    BX(bx, by + 4, 10, 10, { fill: VIOLET });
    T('+', bx + 2, by + 12, { font: B, size: 7, color: WHITE });
    T(a,   bx + 16, by + 12, { font: B, size: 7.5, color: DARK });
  });

  y += AVG_ROWS * AVG_ROW_H + 10;

  // ══════════════════════════════════════════════════════════════════════════
  // CTA DEVENIR PARTENAIRE
  // ══════════════════════════════════════════════════════════════════════════
  ensure(52);

  BX(MG, y, CW, 44, { fill: BGVIOL, stroke: BORDER });
  BX(MG, y, 3, 44, { fill: VIOLET });
  T('Vous etes garagiste ?', MG + 12, y + 16, { font: B, size: 9.5, color: DARK });
  T('Rejoignez le reseau Garantie Plus et proposez ces garanties a vos clients.', MG + 12, y + 29, {
    size: 7.5, color: GRAY,
  });

  const CTX = 'Devenir Partenaire Garantie Plus';
  const BTW = B.widthOfTextAtSize(CTX, 8) + 22;
  const BTH = 20;
  const btx = MG + CW - BTW - 8;
  const bty = y + (44 - BTH) / 2;
  BX(btx, bty, BTW, BTH, { fill: VIOLET });
  T(CTX, btx + 11, bty + 13, { font: B, size: 8, color: WHITE });

  y += 44 + 16;

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  drawFooter();

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
