import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import { Devis, GarantieProposee } from '@/types';

// Sanitise any string for WinAnsi encoding (pdf-lib standard fonts)
const s = (str: string) =>
  str
    .replace(/\u202F/g, ' ')   // narrow no-break space
    .replace(/\u00A0/g, ' ')   // no-break space
    .replace(/€/g, 'EUR')
    .replace(/[^\x00-\xFF]/g, '?'); // replace any remaining non-latin chars

const formatPrix = (n: number) =>
  s(new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n));

const formatKm = (n: number) => s(n.toLocaleString('fr-FR') + ' km');

// ── Couleurs ──────────────────────────────────────────────────────────────────
const VIOLET      = rgb(0.220, 0.094, 0.576);  // #381893
const BLUE        = rgb(0.278, 0.706, 0.882);  // #47b4e1
const ECO_GREEN   = rgb(0.180, 0.490, 0.310);  // #2E7D4F
const LUXE_DARK   = rgb(0.100, 0.100, 0.180);  // #1A1A2E
const DARK        = rgb(0.100, 0.100, 0.180);
const GRAY        = rgb(0.420, 0.447, 0.502);
const LIGHT_GRAY  = rgb(0.600, 0.620, 0.650);
const BORDER_COL  = rgb(0.898, 0.906, 0.922);
const WHITE       = rgb(1, 1, 1);
const BG_LIGHT    = rgb(0.976, 0.980, 0.984);  // #F9FAFB
const BG_ROW_ALT  = rgb(0.988, 0.992, 1.000);

const getGammeColor = (gamme: string) => {
  switch (gamme) {
    case 'eco':          return ECO_GREEN;
    case 'luxe':         return LUXE_DARK;
    case 'luxe_premium': return rgb(0.050, 0.050, 0.100);
    default:             return VIOLET;
  }
};

const getGammeLabel = (gamme: string) => {
  switch (gamme) {
    case 'eco':          return 'GAMME ECO';
    case 'luxe':         return 'GAMME LUXE';
    case 'luxe_premium': return 'GAMME LUXE PREMIUM';
    default:             return 'GAMME CLASSIQUE';
  }
};

export async function genererPDFDevis(
  devis: Devis,
  garanties: GarantieProposee[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Devis Garantie Plus - ${devis.marque} ${devis.modele}`);
  pdfDoc.setAuthor('Garantie Plus');
  pdfDoc.setSubject('Devis de Garantie Panne Mecanique Automobile');

  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const W = PageSizes.A4[0]; // 595
  const H = PageSizes.A4[1]; // 842
  const M = 36; // margin
  const CW = W - M * 2; // content width = 523

  // ── safe string (strip non-latin1 chars) ──────────────────────────────────
  const safe = (str: string) => (str ?? '').replace(/[^\x20-\x7E]/g, (c) => {
    const code = c.codePointAt(0) ?? 0;
    if (code === 0xE9 || code === 0xE8 || code === 0xEA || code === 0xEB) return 'e';
    if (code === 0xE0 || code === 0xE2) return 'a';
    if (code === 0xF9 || code === 0xFB) return 'u';
    if (code === 0xEE || code === 0xEF) return 'i';
    if (code === 0xF4) return 'o';
    if (code === 0xE7) return 'c';
    if (code === 0xC9 || code === 0xC8 || code === 0xCA) return 'E';
    if (code === 0xC0) return 'A';
    if (code === 0x2018 || code === 0x2019) return "'";
    if (code === 0x201C || code === 0x201D) return '"';
    if (code === 0x2013 || code === 0x2014) return '-';
    if (code === 0x20AC) return 'EUR';
    if (code === 0x202F || code === 0x00A0) return ' ';
    if (code === 0xD7) return 'x';
    return '';
  });

  // ── Page factory ──────────────────────────────────────────────────────────
  const pages: ReturnType<typeof makePage>[] = [];

  function makePage() {
    const page = pdfDoc.addPage(PageSizes.A4);

    const txt = (
      str: string,
      x: number,
      yFromTop: number,
      opts: { font?: typeof bold; size?: number; color?: ReturnType<typeof rgb>; maxWidth?: number } = {}
    ) => {
      const { font = regular, size = 9, color = DARK, maxWidth } = opts;
      let s = safe(str);
      if (maxWidth && font.widthOfTextAtSize(s, size) > maxWidth) {
        while (s.length > 0 && font.widthOfTextAtSize(s + '...', size) > maxWidth) s = s.slice(0, -1);
        s += '...';
      }
      page.drawText(s, { x, y: H - yFromTop, font, size, color });
    };

    const rect = (
      x: number, yTop: number, w: number, h: number,
      opts: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; sw?: number } = {}
    ) => {
      page.drawRectangle({
        x, y: H - yTop - h, width: w, height: h,
        ...(opts.fill   ? { color: opts.fill } : {}),
        ...(opts.stroke ? { borderColor: opts.stroke, borderWidth: opts.sw ?? 0.5 } : {}),
      });
    };

    const hline = (y: number, x1 = M, x2 = M + CW, color = BORDER_COL) => {
      page.drawLine({ start: { x: x1, y: H - y }, end: { x: x2, y: H - y }, thickness: 0.5, color });
    };

    return { page, txt, rect, hline };
  }

  // ── State: current page helpers + y cursor ────────────────────────────────
  let p = makePage();
  pages.push(p);
  let y = 0;

  const ensure = (needed: number) => {
    if (y + needed > H - 48) {
      // Footer on current page
      drawFooter();
      p = makePage();
      pages.push(p);
      y = 36;
    }
  };

  const drawFooter = () => {
    p.hline(H - 28);
    p.txt('Garantie Plus SAS - RCS Paris 943 193 037 - ORIAS n\u00b025004236 - 130, rue de Courcelles - 75017 Paris', M, H - 16, { size: 7, color: LIGHT_GRAY });
  };

  // Helpers delegating to current page
  const txt  = (...a: Parameters<ReturnType<typeof makePage>['txt']>)  => p.txt(...a);
  const rect = (...a: Parameters<ReturnType<typeof makePage>['rect']>) => p.rect(...a);
  const hline = (...a: Parameters<ReturnType<typeof makePage>['hline']>) => p.hline(...a);

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER (gradient simulé)
  // ══════════════════════════════════════════════════════════════════════════
  const HDR = 72;
  // Gradient violet → blue
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const c = rgb(
      0.220 + t * (0.278 - 0.220),
      0.094 + t * (0.706 - 0.094),
      0.576 + t * (0.882 - 0.576),
    );
    rect(M + i * (CW / 60), 0, CW / 60 + 1, HDR, { fill: c });
  }
  rect(0, 0, M, HDR, { fill: VIOLET });
  rect(W - M, 0, M, HDR, { fill: BLUE });

  // Logo text
  txt('GARANTIE PLUS', M + 10, 26, { font: bold, size: 20, color: WHITE });
  txt('Courtier en Garanties Panne Mecanique Automobile', M + 10, 44, { size: 8, color: rgb(0.9, 0.9, 0.9) });
  txt('ORIAS n\u00b025004236  |  130, rue de Courcelles - 75017 Paris', M + 10, 57, { size: 7.5, color: rgb(0.8, 0.8, 0.85) });
  // Date right
  const dateStr = safe(`Devis du ${new Date().toLocaleDateString('fr-FR')}`);
  txt(dateStr, W - M - 10 - bold.widthOfTextAtSize(dateStr, 8), 57, { size: 8, color: rgb(0.85, 0.85, 0.9) });

  y = HDR;

  // Bandeau titre
  rect(0, y, W, 32, { fill: rgb(0.10, 0.10, 0.18) });
  txt('Votre devis de Garantie Panne Mecanique', M + 10, y + 12, { font: bold, size: 11, color: WHITE });
  txt(`${devis.marque} ${devis.modele}  -  ${devis.nom_garage}`, M + 10, y + 25, { size: 8.5, color: rgb(0.7, 0.75, 0.85) });
  y += 32 + 14;

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCS VÉHICULE + GARAGE (2 colonnes)
  // ══════════════════════════════════════════════════════════════════════════
  ensure(120);

  const colW = (CW - 8) / 2;
  const colR = M + colW + 8;

  // Titres colonnes
  rect(M, y, colW, 18, { fill: VIOLET });
  txt('Vehicule', M + 8, y + 13, { font: bold, size: 8, color: WHITE });

  rect(colR, y, colW, 18, { fill: VIOLET });
  txt('Garage', colR + 8, y + 13, { font: bold, size: 8, color: WHITE });

  y += 18;

  // Fond des blocs
  const infoH = 96;
  rect(M,    y, colW, infoH, { fill: BG_LIGHT, stroke: BORDER_COL });
  rect(colR, y, colW, infoH, { fill: BG_LIGHT, stroke: BORDER_COL });

  // Données véhicule
  const vRows: [string, string][] = [
    ['Marque',       devis.marque],
    ['Modele',       devis.modele],
    ['Mise en circ.',devis.date_mise_en_circulation],
    ['Kilometrage',  formatKm(devis.kilometrage)],
  ];
  vRows.forEach(([label, val], i) => {
    const ry = y + 10 + i * 22;
    txt(label, M + 8, ry,    { font: bold, size: 7.5, color: LIGHT_GRAY });
    txt(val,   M + 80, ry,   { size: 7.5, color: DARK, maxWidth: colW - 88 });
    if (i < vRows.length - 1) hline(ry + 8, M + 4, M + colW - 4, BORDER_COL);
  });

  // Données garage
  const gRows: [string, string][] = [
    ['Garage',    devis.nom_garage],
    ['Contact',   devis.nom_contact],
    ['Email',     devis.email],
    ['Telephone', devis.telephone],
  ];
  gRows.forEach(([label, val], i) => {
    const ry = y + 10 + i * 22;
    txt(label,  colR + 8,  ry, { font: bold, size: 7.5, color: LIGHT_GRAY });
    txt(val,    colR + 70, ry, { size: 7.5, color: DARK, maxWidth: colW - 78 });
    if (i < gRows.length - 1) hline(ry + 8, colR + 4, colR + colW - 4, BORDER_COL);
  });

  // Caractéristiques véhicule
  const caractVehicule = [
    devis.is_4x4            && '4x4 / SUV',
    devis.is_plus_2t3       && '+2,3 tonnes',
    devis.is_plus_14cv      && '+14 CV fiscaux',
    devis.is_hybride_electrique && 'Hybride / Electrique',
    devis.valeur_neuf_55k   && 'Valeur > 55k EUR',
    devis.valeur_neuf_100k  && 'Valeur > 100k EUR',
    devis.valeur_neuf_150k  && 'Valeur > 150k EUR',
  ].filter(Boolean) as string[];

  if (caractVehicule.length > 0) {
    let cx = M + 8;
    const tagY = y + infoH - 16;
    caractVehicule.forEach(c => {
      const tw = bold.widthOfTextAtSize(c, 6.5) + 8;
      if (cx + tw > M + colW - 4) return;
      rect(cx, tagY, tw, 11, { fill: rgb(0.93, 0.91, 0.98) });
      txt(c, cx + 4, tagY + 9, { font: bold, size: 6.5, color: VIOLET });
      cx += tw + 3;
    });
  }

  y += infoH + 14;

  // ══════════════════════════════════════════════════════════════════════════
  // GARANTIES PROPOSÉES
  // ══════════════════════════════════════════════════════════════════════════
  if (garanties.length === 0) {
    ensure(50);
    rect(M, y, CW, 40, { fill: rgb(1, 0.95, 0.95), stroke: rgb(0.9, 0.7, 0.7) });
    txt('Vehicule non eligible', M + 10, y + 14, { font: bold, size: 9, color: rgb(0.8, 0.1, 0.1) });
    txt('Age > 15 ans ou kilometrage > 200 000 km  -  contact@garantieplus.fr', M + 10, y + 28, { size: 8, color: GRAY });
    y += 40 + 14;
  } else {
    ensure(18);
    // Section title
    rect(M, y, CW, 18, { fill: DARK });
    txt('GARANTIES PROPOSEES', M + 10, y + 13, { font: bold, size: 9, color: WHITE });
    y += 18 + 8;

    garanties.forEach((g) => {
      const accentColor = getGammeColor(g.gamme);
      const gammeLabel  = getGammeLabel(g.gamme);

      const plafond6  = g.plafondParDuree ? g.plafondParDuree['6']  : g.plafondIntervention;
      const plafond12 = g.plafondParDuree ? g.plafondParDuree['12'] : g.plafondIntervention;
      const plafond24 = g.plafondParDuree ? g.plafondParDuree['24'] : g.plafondIntervention;

      const formatPlafond = (p: string) =>
        p === 'VRADE' ? "Jusqu'a la VRADE" : `Jusqu'a ${p}`;

      const couverture = g.niveau === 5
        ? 'Garantie TOUT SAUF - toutes pieces sauf exclusions aux CG'
        : g.nombrePiecesCouvertes + ' couvertes';

      // Card height: header(32) + info-row(54) + price-table(58) + padding(10)
      const CARD_H = 154 + (g.pondereApplique ? 14 : 0);
      ensure(CARD_H + 8);

      // ── Card header ──
      rect(M, y, CW, 30, { fill: accentColor });
      // Barre gauche plus foncée
      rect(M, y, 4, 30, { fill: rgb(0, 0, 0) });
      txt(gammeLabel, M + 10, y + 12, { font: bold, size: 7, color: rgb(1, 1, 1, ) });
      txt(safe(g.nomCommercial), M + 10, y + 24, { font: bold, size: 10, color: WHITE });
      // Eligibilité droite
      const eligStr = safe(`< ${g.ageMaxAns} ans  et  < ${g.kmMax.toLocaleString('fr-FR')} km`);
      txt(eligStr, M + CW - 10 - regular.widthOfTextAtSize(eligStr, 7.5), y + 12, { size: 7.5, color: rgb(0.85, 0.9, 0.95) });
      // Pondération
      if (g.pondereApplique) {
        txt('Tarif pondere x1,5 applique', M + CW - 10 - regular.widthOfTextAtSize('Tarif pondere x1,5 applique', 7), y + 23, { size: 7, color: rgb(1, 0.95, 0.7) });
      }
      y += 30;

      // ── Couverture + Plafond (2 cols) ──
      const halfW = (CW - 6) / 2;

      // Fond blanc avec bordure
      rect(M,             y, halfW, 44, { fill: WHITE, stroke: BORDER_COL });
      rect(M + halfW + 6, y, halfW, 44, { fill: WHITE, stroke: BORDER_COL });

      txt('COUVERTURE',     M + 8,           y + 11, { font: bold, size: 6.5, color: LIGHT_GRAY });
      txt(couverture,       M + 8,           y + 23, { font: bold, size: 7.5, color: accentColor, maxWidth: halfW - 14 });

      txt('PLAFOND / INTERVENTION', M + halfW + 14, y + 11, { font: bold, size: 6.5, color: LIGHT_GRAY });
      if (g.plafondParDuree) {
        txt(`6 mois : ${formatPlafond(plafond6)}`,   M + halfW + 14, y + 23, { font: bold, size: 7, color: accentColor });
        txt(`12 mois : ${formatPlafond(plafond12)}`, M + halfW + 14, y + 32, { font: bold, size: 7, color: accentColor });
        txt(`24 mois : ${formatPlafond(plafond24)}`, M + halfW + 14, y + 41, { font: bold, size: 7, color: accentColor });
      } else {
        txt(formatPlafond(g.plafondIntervention), M + halfW + 14, y + 24, { font: bold, size: 8.5, color: accentColor, maxWidth: halfW - 20 });
      }

      y += 44 + 2;

      // ── Tableau des prix ──
      // En-tête
      rect(M, y, CW, 16, { fill: accentColor });
      const col1W = 90; const col2W = 110; const col3W = CW - col1W - col2W;
      txt('Duree',    M + 8,               y + 11, { font: bold, size: 7.5, color: rgb(0.85, 0.9, 0.95) });
      txt('Prix TTC', M + col1W + 8,       y + 11, { font: bold, size: 7.5, color: WHITE });
      txt('Plafond inclus', M + col1W + col2W + 8, y + 11, { font: bold, size: 7.5, color: rgb(0.85, 0.9, 0.95) });
      y += 16;

      const priceRows: [string, number, string, boolean][] = [
        ['6 mois',  g.prixFinal['6'],  plafond6,  false],
        ['12 mois', g.prixFinal['12'], plafond12, true],
        ['24 mois', g.prixFinal['24'], plafond24, false],
      ];

      priceRows.forEach(([duree, prix, plaf, isMain]) => {
        const rowH = isMain ? 18 : 14;
        rect(M, y, CW, rowH, { fill: isMain ? BG_ROW_ALT : WHITE, stroke: BORDER_COL, sw: 0.3 });
        // Ligne de séparation verticale
        hline(y, M + col1W, M + col1W, BORDER_COL);
        hline(y, M + col1W + col2W, M + col1W + col2W, BORDER_COL);

        const font = isMain ? bold : regular;
        txt(isMain ? duree + ' (recommande)' : duree, M + 8, y + (isMain ? 13 : 10), { font, size: isMain ? 8 : 7.5, color: isMain ? DARK : GRAY });
        txt(formatPrix(prix), M + col1W + 8, y + (isMain ? 13 : 10), { font: bold, size: isMain ? 10 : 8, color: isMain ? accentColor : DARK });
        txt(formatPlafond(plaf), M + col1W + col2W + 8, y + (isMain ? 13 : 10), { font: bold, size: isMain ? 8 : 7.5, color: accentColor, maxWidth: col3W - 14 });
        y += rowH;
      });

      // Note TTC
      txt('Prix TTC - Taxe d\'assurance incluse', M + CW - 10 - regular.widthOfTextAtSize('Prix TTC - Taxe d\'assurance incluse', 7), y + 8, { size: 7, color: LIGHT_GRAY });
      y += 14 + 8;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LES + DE GARANTIE PLUS
  // ══════════════════════════════════════════════════════════════════════════
  const avantages = [
    "Pas de vetuste appliquee",     "Cessible gratuitement",
    "Pas de franchise",             "Kilometrage illimite",
    "Pas de carence",               "Pas d'avance de frais",
    "Couverture Europeenne",        "100% Digital",
    "Plafond PAR intervention",
  ];

  ensure(14 + 16 + Math.ceil(avantages.length / 3) * 14 + 10);

  rect(M, y, CW, 16, { fill: VIOLET });
  // Gradient simulé
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const c = rgb(0.220 + t * 0.058, 0.094 + t * 0.612, 0.576 + t * 0.306);
    rect(M + i * (CW / 40), y, CW / 40 + 1, 16, { fill: c });
  }
  txt('LES + DE GARANTIE PLUS', M + CW / 2 - bold.widthOfTextAtSize('LES + DE GARANTIE PLUS', 9) / 2, y + 12, { font: bold, size: 9, color: WHITE });
  y += 16 + 6;

  // 3 colonnes de badges
  rect(M, y, CW, Math.ceil(avantages.length / 3) * 14 + 6, { fill: BG_LIGHT, stroke: BORDER_COL });
  y += 6;

  const badgeColW = CW / 3;
  avantages.forEach((a, i) => {
    const col  = i % 3;
    const row  = Math.floor(i / 3);
    const bx   = M + col * badgeColW + 6;
    const by   = y + row * 14;
    txt('+', bx, by + 9, { font: bold, size: 8, color: VIOLET });
    txt(a,   bx + 10, by + 9, { size: 7.5, color: DARK });
  });

  y += Math.ceil(avantages.length / 3) * 14 + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  drawFooter();

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
