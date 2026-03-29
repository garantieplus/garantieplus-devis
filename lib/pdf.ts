import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import { Devis, GarantieProposee } from '@/types';

const formatPrix = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const formatKm = (n: number) => n.toLocaleString('fr-FR') + ' km';

// Couleurs rgb normalisées (0-1)
const VIOLET = rgb(0.22, 0.094, 0.576);  // #381893
const BLUE   = rgb(0.278, 0.706, 0.882); // #47b4e1
const DARK   = rgb(0.1, 0.1, 0.18);      // #1A1A2E
const GRAY   = rgb(0.42, 0.447, 0.502);  // #6B7280
const LIGHT  = rgb(0.973, 0.965, 0.988); // #F8F6FC
const WHITE  = rgb(1, 1, 1);
const GREEN  = rgb(0.133, 0.773, 0.369); // #22C55E
const BORDER = rgb(0.898, 0.906, 0.922); // #E5E7EB

export async function genererPDFDevis(
  devis: Devis,
  garanties: GarantieProposee[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Devis Garantie Plus — ${devis.marque} ${devis.modele}`);
  pdfDoc.setAuthor('Garantie Plus');
  pdfDoc.setSubject('Devis de garantie mécanique automobile');

  const page = pdfDoc.addPage(PageSizes.A4);
  const { width: W, height: H } = page.getSize();
  const MARGIN = 50;
  const COL = W - MARGIN * 2;

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Helper — dessine du texte (y depuis le bas dans pdf-lib)
  const text = (
    str: string,
    x: number,
    yFromTop: number,
    { font = regular, size = 9, color = DARK, maxWidth }: {
      font?: typeof bold;
      size?: number;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    } = {}
  ) => {
    const safeStr = str.replace(/[^\x20-\x7E]/g, (c: string) => {
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
      return '?';
    });
    const displayStr = maxWidth
      ? truncateStr(safeStr, font, size, maxWidth)
      : safeStr;
    page.drawText(displayStr, { x, y: H - yFromTop, font, size, color });
  };

  const truncateStr = (
    str: string,
    font: typeof bold,
    size: number,
    maxWidth: number
  ): string => {
    if (font.widthOfTextAtSize(str, size) <= maxWidth) return str;
    let result = str;
    while (result.length > 0 && font.widthOfTextAtSize(result + '...', size) > maxWidth) {
      result = result.slice(0, -1);
    }
    return result + '...';
  };

  const rect = (
    x: number, yFromTop: number, w: number, h: number,
    { fill, stroke, strokeWidth = 0.5 }: {
      fill?: ReturnType<typeof rgb>;
      stroke?: ReturnType<typeof rgb>;
      strokeWidth?: number;
    } = {}
  ) => {
    page.drawRectangle({
      x, y: H - yFromTop - h, width: w, height: h,
      ...(fill ? { color: fill } : {}),
      ...(stroke ? { borderColor: stroke, borderWidth: strokeWidth } : {}),
    });
  };

  const line = (x1: number, y1: number, x2: number, y2: number, color = BORDER) => {
    page.drawLine({
      start: { x: x1, y: H - y1 },
      end:   { x: x2, y: H - y2 },
      thickness: 0.5,
      color,
    });
  };

  // ── HEADER ──────────────────────────────────────────────────────────────
  rect(0, 0, W, 108, { fill: VIOLET });
  // Dégradé simulé côté droit (bleu)
  rect(W * 0.65, 0, W * 0.35, 108, { fill: BLUE });
  // Vignette semi-transparente sur le dégradé
  rect(W * 0.62, 0, W * 0.38, 108, { fill: rgb(0.22, 0.094, 0.576) });
  // On refait le dégradé proprement avec des bandes
  for (let i = 0; i < 30; i++) {
    const t = i / 30;
    const r = 0.22 + t * (0.278 - 0.22);
    const g2 = 0.094 + t * (0.706 - 0.094);
    const b2 = 0.576 + t * (0.882 - 0.576);
    rect(MARGIN + i * (COL / 30), 0, COL / 30 + 1, 108, { fill: rgb(r, g2, b2) });
  }
  // Couvrir les bandes avec une couleur unie sur les bords
  rect(0, 0, MARGIN, 108, { fill: VIOLET });
  rect(W - MARGIN, 0, MARGIN, 108, { fill: BLUE });

  text('GARANTIE PLUS', MARGIN, 35, { font: bold, size: 24, color: WHITE });
  text('Courtier en garanties mecaniques automobiles', MARGIN, 63, { size: 10, color: rgb(1,1,1) });
  text('ORIAS n\u00b025004236  |  130, rue de Courcelles - 75017 Paris', MARGIN, 80, { size: 8, color: rgb(0.9,0.9,0.9) });
  text(`Devis du ${new Date().toLocaleDateString('fr-FR')}`, W - MARGIN - 90, 80, { size: 8, color: rgb(0.85,0.85,0.85) });

  // ── TITRE ───────────────────────────────────────────────────────────────
  let y = 125;
  text('Votre devis de garantie mecanique', MARGIN, y, { font: bold, size: 16, color: DARK });
  y += 24;

  // ── INFO VEHICULE + GARAGE ───────────────────────────────────────────────
  rect(MARGIN, y, COL, 78, { fill: LIGHT, stroke: BORDER });

  const colW = (COL - 20) / 2;

  text('VEHICULE', MARGIN + 12, y + 12, { font: bold, size: 8, color: VIOLET });
  text(`${devis.marque} ${devis.modele}`, MARGIN + 12, y + 24, { font: bold, size: 11, color: DARK });
  text(`Mise en circulation : ${devis.date_mise_en_circulation}`, MARGIN + 12, y + 40, { size: 8.5, color: GRAY });
  text(`Kilometrage : ${formatKm(devis.kilometrage)}`, MARGIN + 12, y + 53, { size: 8.5, color: GRAY });

  const col2x = MARGIN + colW + 20;
  text('GARAGE', col2x, y + 12, { font: bold, size: 8, color: VIOLET });
  text(devis.nom_garage, col2x, y + 24, { font: bold, size: 11, color: DARK, maxWidth: colW - 12 });
  text(devis.nom_contact, col2x, y + 40, { size: 8.5, color: GRAY, maxWidth: colW - 12 });
  text(devis.email, col2x, y + 53, { size: 8.5, color: GRAY, maxWidth: colW - 12 });

  y += 92;

  // ── TABLEAU DES GARANTIES ─────────────────────────────────────────────────
  text('Garanties proposees', MARGIN, y, { font: bold, size: 12, color: DARK });
  y += 16;

  if (garanties.length === 0) {
    text('Aucune garantie eligible pour ce vehicule.', MARGIN, y, { size: 10, color: GRAY });
    y += 20;
  } else {
    const COL_W = [185, 80, 62, 68, 68];
    const ROW_H = 22;

    // En-tête
    rect(MARGIN, y, COL, ROW_H, { fill: VIOLET });
    const headers = ['Formule', 'Plafond', '6 mois', '12 mois', '24 mois'];
    let cx = MARGIN + 8;
    headers.forEach((h, ci) => {
      text(h, cx, y + 7, { font: bold, size: 8.5, color: WHITE });
      cx += COL_W[ci];
    });
    y += ROW_H;

    garanties.forEach((g, idx) => {
      const rowFill = idx % 2 === 0 ? WHITE : LIGHT;
      rect(MARGIN, y, COL, ROW_H, { fill: rowFill, stroke: BORDER });

      cx = MARGIN + 8;
      text(g.nomCommercial, cx, y + 8, { size: 8.5, color: DARK, maxWidth: COL_W[0] - 8 });
      cx += COL_W[0];
      text(g.plafondIntervention, cx, y + 8, { size: 8, color: GRAY });
      cx += COL_W[1];

      [g.prixFinal['6'], g.prixFinal['12'], g.prixFinal['24']].forEach((p, pi) => {
        const isBest = pi === 1;
        const priceStr = formatPrix(p).replace(/\u202F/g, ' ');
        const tw = (isBest ? bold : regular).widthOfTextAtSize(priceStr, isBest ? 9 : 8.5);
        const px = cx + (COL_W[2 + pi] - tw) / 2;
        text(priceStr, px, y + 8, { font: isBest ? bold : regular, size: isBest ? 9 : 8.5, color: isBest ? VIOLET : DARK });
        cx += COL_W[2 + pi];
      });

      y += ROW_H;
    });

    // Trait bas tableau
    line(MARGIN, y, MARGIN + COL, y);
    y += 6;
    text("Prix TTC - Taxe d'assurance incluse", MARGIN, y, { size: 7.5, color: GRAY });
    y += 20;
  }

  // ── ARGUMENTS DIFFÉRENCIANTS ──────────────────────────────────────────────
  const boxH = 100;
  rect(MARGIN, y, COL, boxH, { fill: rgb(0.937, 0.965, 1), stroke: VIOLET });

  text('Nos avantages exclusifs vs la concurrence', MARGIN + 12, y + 13, { font: bold, size: 10, color: VIOLET });

  text("Plafond PAR intervention - pas d'enveloppe globale", MARGIN + 12, y + 30, { font: bold, size: 9, color: DARK });
  text(
    "Le plafond se reinitialise a chaque sinistre. Plusieurs pannes = plusieurs couvertures completes.",
    MARGIN + 12, y + 42, { size: 8, color: GRAY }
  );

  text("Plafond fixe sans degressivite - garanti jusqu'au bout", MARGIN + 12, y + 60, { font: bold, size: 9, color: DARK });
  text(
    "Meme apres 7 ou 10 ans au compteur. Contrairement a la concurrence, notre plafond ne diminue jamais.",
    MARGIN + 12, y + 72, { size: 8, color: GRAY }
  );

  y += boxH + 16;

  // ── AVANTAGES COMMUNS ────────────────────────────────────────────────────
  text('Inclus dans toutes nos formules', MARGIN, y, { font: bold, size: 10.5, color: DARK });
  y += 14;

  const avantages = [
    'Pas de franchise', 'Pas de carence', "Pas d'avance de frais",
    'Cessible gratuitement', 'Couverture Europeenne', 'Kilometrage illimite',
  ];

  avantages.forEach((a, idx) => {
    const col = idx % 2 === 0 ? MARGIN : MARGIN + COL / 2 + 10;
    const row = y + Math.floor(idx / 2) * 15;
    text('✓', col, row, { font: bold, size: 8.5, color: GREEN });
    text(a, col + 12, row, { size: 8.5, color: DARK });
  });

  y += Math.ceil(avantages.length / 2) * 15 + 10;

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = H - 38;
  line(MARGIN, H - footerY + 8, W - MARGIN, H - footerY + 8);

  page.drawText(
    'Garantie Plus SAS - RCS Paris 943 193 037 - ORIAS n\u00b025004236 - 130, rue de Courcelles - 75017 Paris',
    { x: MARGIN, y: 22, font: regular, size: 7.5, color: GRAY }
  );
  page.drawText(
    'contact@garantieplus.fr | rgpd@garantieplus.fr',
    { x: MARGIN, y: 12, font: regular, size: 7.5, color: GRAY }
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
