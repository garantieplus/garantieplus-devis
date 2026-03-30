import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import { Devis, GarantieProposee } from '@/types';

// Format prix 2 décimales — remplace € par EUR (Helvetica standard ne supporte pas €)
const formatPrix = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
  .format(n)
  .replace(/\u202F/g, ' ')   // narrow no-break space → espace
  .replace(/\u00A0/g, ' ')   // no-break space → espace
  .replace(/€/g, 'EUR');     // € non supporté par Helvetica standard

const formatKm = (n: number) => n.toLocaleString('fr-FR') + ' km';

// ── Descriptions détaillées par gamme+niveau ──────────────────────────────────
const DESCRIPTIONS: Record<string, { criteres: string; couverture: string; plafond: string }> = {
  classique_5: {
    criteres: 'moins de 6 ans et moins de 120 000 km',
    couverture: 'Toutes pieces sauf exclusions listees',
    plafond: "Plafond jusqu'a la VRADE",
  },
  classique_4: {
    criteres: 'moins de 10 ans et moins de 150 000 km',
    couverture: 'Plus de 120 pieces couvertes',
    plafond: "Plafond jusqu'a 10 000 EUR TTC par sinistre",
  },
  classique_3: {
    criteres: 'moins de 15 ans et moins de 200 000 km',
    couverture: 'Plus de 120 pieces couvertes',
    plafond: 'Plafond variable selon duree (1 500 / 2 500 / 3 000 EUR)',
  },
  eco_5: {
    criteres: 'moins de 10 ans et moins de 120 000 km',
    couverture: 'Toutes pieces sauf exclusions listees',
    plafond: "Plafond jusqu'a 10 000 EUR TTC par sinistre",
  },
  eco_4: {
    criteres: 'moins de 10 ans et moins de 120 000 km',
    couverture: 'Toutes pieces sauf exclusions listees',
    plafond: "Plafond jusqu'a 10 000 EUR TTC par sinistre",
  },
  luxe_5: {
    criteres: 'moins de 6 ans et moins de 120 000 km',
    couverture: 'Toutes pieces sauf exclusions listees',
    plafond: "Plafond jusqu'a 15 000 EUR TTC par sinistre",
  },
  luxe_4: {
    criteres: 'moins de 10 ans et moins de 150 000 km',
    couverture: 'Plus de 120 pieces couvertes',
    plafond: "Plafond jusqu'a 10 000 EUR TTC par sinistre",
  },
  luxe_3: {
    criteres: 'moins de 15 ans et moins de 200 000 km',
    couverture: 'Plus de 120 pieces couvertes',
    plafond: "Plafond jusqu'a 7 500 EUR TTC par sinistre",
  },
  luxe_premium_5: {
    criteres: 'moins de 6 ans et moins de 120 000 km',
    couverture: 'Toutes pieces sauf exclusions listees',
    plafond: "Plafond jusqu'a 15 000 EUR TTC par sinistre",
  },
  luxe_premium_4: {
    criteres: 'moins de 10 ans et moins de 150 000 km',
    couverture: 'Plus de 120 pieces couvertes',
    plafond: "Plafond jusqu'a 10 000 EUR TTC par sinistre",
  },
  luxe_premium_3: {
    criteres: 'moins de 15 ans et moins de 200 000 km',
    couverture: 'Plus de 120 pieces couvertes',
    plafond: "Plafond jusqu'a 7 500 EUR TTC par sinistre",
  },
};

// ── Couleurs ──────────────────────────────────────────────────────────────────
const VIOLET = rgb(0.22, 0.094, 0.576);
const BLUE   = rgb(0.278, 0.706, 0.882);
const DARK   = rgb(0.1, 0.1, 0.18);
const GRAY   = rgb(0.42, 0.447, 0.502);
const LIGHT  = rgb(0.973, 0.965, 0.988);
const WHITE  = rgb(1, 1, 1);
const BORDER = rgb(0.898, 0.906, 0.922);
const LIGHT_BLUE = rgb(0.937, 0.953, 0.988);

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
  const MARGIN = 45;
  const COL    = W - MARGIN * 2;

  // ── helpers réutilisables sur une page ──────────────────────────────────────
  const makePage = () => {
    const page = pdfDoc.addPage(PageSizes.A4);

    const safe = (str: string) => str.replace(/[^\x20-\x7E]/g, (c: string) => {
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
      return '';
    });

    const text = (
      str: string,
      x: number,
      yFromTop: number,
      opts: {
        font?: typeof bold;
        size?: number;
        color?: ReturnType<typeof rgb>;
        maxWidth?: number;
      } = {}
    ) => {
      const { font = regular, size = 9, color = DARK, maxWidth } = opts;
      let s = safe(str);
      if (maxWidth && font.widthOfTextAtSize(s, size) > maxWidth) {
        while (s.length > 0 && font.widthOfTextAtSize(s + '...', size) > maxWidth) s = s.slice(0, -1);
        s = s + '...';
      }
      page.drawText(s, { x, y: H - yFromTop, font, size, color });
    };

    const rect = (
      x: number, yFromTop: number, w: number, h: number,
      opts: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; strokeWidth?: number } = {}
    ) => {
      page.drawRectangle({
        x, y: H - yFromTop - h, width: w, height: h,
        ...(opts.fill   ? { color: opts.fill } : {}),
        ...(opts.stroke ? { borderColor: opts.stroke, borderWidth: opts.strokeWidth ?? 0.5 } : {}),
      });
    };

    const line = (x1: number, y1: number, x2: number, y2: number, color = BORDER) => {
      page.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness: 0.5, color });
    };

    return { page, text, rect, line };
  };

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────
  const { text, rect, line } = makePage();

  // ── HEADER dégradé ───────────────────────────────────────────────────────
  const HDR_H = 90;
  rect(0, 0, W, HDR_H, { fill: VIOLET });
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    rect(MARGIN + i * (COL / 40), 0, COL / 40 + 1, HDR_H, {
      fill: rgb(0.22 + t * (0.278 - 0.22), 0.094 + t * (0.706 - 0.094), 0.576 + t * (0.882 - 0.576)),
    });
  }
  rect(0, 0, MARGIN, HDR_H, { fill: VIOLET });
  rect(W - MARGIN, 0, MARGIN, HDR_H, { fill: BLUE });

  text('GARANTIE PLUS', MARGIN, 30, { font: bold, size: 22, color: WHITE });
  text('Courtier en Garanties Panne Mecanique Automobile', MARGIN, 52, { size: 9, color: rgb(0.9, 0.9, 0.9) });
  text('ORIAS n\u00b025004236  |  130, rue de Courcelles - 75017 Paris', MARGIN, 66, { size: 8, color: rgb(0.8, 0.8, 0.8) });
  text(`Devis du ${new Date().toLocaleDateString('fr-FR')}`, W - MARGIN - 80, 66, { size: 8, color: rgb(0.85, 0.85, 0.85) });

  // ── TITRE ────────────────────────────────────────────────────────────────
  let y = HDR_H + 18;
  text('Votre devis de Garantie Panne Mecanique', MARGIN, y, { font: bold, size: 14, color: DARK });
  y += 6;
  line(MARGIN, y, MARGIN + COL, y, VIOLET);
  y += 16;

  // ── BLOC INFO : gauche (véhicule+contact) | droite (garanties éligibles) ──
  const INFO_H = 120;
  const LEFT_W  = COL * 0.52;
  const RIGHT_W = COL * 0.44;
  const GAP     = COL - LEFT_W - RIGHT_W;
  const RIGHT_X = MARGIN + LEFT_W + GAP;

  // Encadré gauche
  rect(MARGIN, y, LEFT_W, INFO_H, { fill: LIGHT, stroke: BORDER });

  // Labels + valeurs gauche
  const LX = MARGIN + 10;
  let ly = y + 14;
  const rowH = 14;

  const infoRows = [
    ['Nom / Prenom', devis.nom_contact],
    ['Garage',       devis.nom_garage],
    ['Email',        devis.email],
    ['Telephone',    devis.telephone],
    ['Marque',       devis.marque],
    ['Modele',       devis.modele],
    ['Mise en circ.',devis.date_mise_en_circulation],
    ['Kilometrage',  formatKm(devis.kilometrage)],
  ];

  infoRows.forEach(([label, val]) => {
    text(label, LX, ly, { font: bold, size: 7.5, color: VIOLET });
    text(val ?? '', LX + 72, ly, { size: 7.5, color: DARK, maxWidth: LEFT_W - 90 });
    ly += rowH;
  });

  // Encadré droite — garanties éligibles résumé
  rect(RIGHT_X, y, RIGHT_W, INFO_H, { fill: VIOLET });
  text('Garanties eligibles', RIGHT_X + 8, y + 13, { font: bold, size: 8, color: WHITE });

  if (garanties.length === 0) {
    text('Aucune garantie eligible', RIGHT_X + 8, y + 30, { size: 8, color: rgb(0.9, 0.9, 0.9) });
  } else {
    let ry = y + 28;
    garanties.forEach((g) => {
      const prix12 = formatPrix(g.prixFinal['12']);
      text(g.nomCommercial, RIGHT_X + 8, ry, { font: bold, size: 7.5, color: WHITE, maxWidth: RIGHT_W - 70 });
      text(prix12 + ' / 12 mois', RIGHT_X + RIGHT_W - 8 - regular.widthOfTextAtSize(prix12 + ' / 12 mois', 7.5), ry, { size: 7.5, color: rgb(0.9, 0.9, 0.9) });
      ry += 13;
    });
  }

  text('Prix TTC toutes taxes incluses', RIGHT_X + 8, y + INFO_H - 6, { size: 6.5, color: rgb(0.7, 0.7, 0.8) });

  y += INFO_H + 18;

  // ── DÉTAIL DES GARANTIES ─────────────────────────────────────────────────
  if (garanties.length > 0) {
    text('Votre vehicule est eligible aux garanties suivantes :', MARGIN, y, { font: bold, size: 10, color: DARK });
    y += 16;

    // Récupère ou crée une nouvelle page si nécessaire
    let currentHelpers = { text, rect, line };

    const ensurePage = (neededH: number) => {
      if (y + neededH > H - 50) {
        // Nouvelle page
        const helpers = makePage();
        // Footer de continuation
        helpers.text('Garantie Plus SAS - ORIAS n\u00b025004236 - 130, rue de Courcelles - 75017 Paris', MARGIN, H - 18, { size: 7, color: GRAY });
        currentHelpers = helpers;
        y = 40;
      }
    };

    garanties.forEach((g) => {
      const key = `${g.gamme}_${g.niveau}`;
      const desc = DESCRIPTIONS[key] ?? { criteres: '', couverture: g.plafondIntervention, plafond: '' };

      const BLOCK_H = 64;
      ensurePage(BLOCK_H + 8);
      const { text: t, rect: r, line: l } = currentHelpers;

      // Fond coloré selon gamme
      const bgFill = g.gamme === 'eco' ? rgb(0.92, 0.98, 0.95)
        : g.gamme.startsWith('luxe') ? rgb(0.94, 0.94, 0.97)
        : LIGHT_BLUE;
      const accentColor = g.gamme === 'eco' ? rgb(0.18, 0.49, 0.31)
        : g.gamme.startsWith('luxe') ? DARK
        : VIOLET;

      r(MARGIN, y, COL, BLOCK_H, { fill: bgFill, stroke: BORDER });
      // Barre colorée gauche
      r(MARGIN, y, 4, BLOCK_H, { fill: accentColor });

      const TX = MARGIN + 12;

      // Nom de la garantie
      t(g.nomCommercial, TX, y + 13, { font: bold, size: 10, color: accentColor });
      if (g.pondereApplique) {
        t('(ponderee x1,5)', TX + bold.widthOfTextAtSize(g.nomCommercial, 10) + 6, y + 13, { size: 8, color: GRAY });
      }

      // Description en 3 lignes
      t(desc.criteres,  TX, y + 26, { size: 8, color: DARK });
      t(desc.couverture, TX, y + 37, { size: 8, color: GRAY });
      t(desc.plafond,   TX, y + 48, { font: bold, size: 8, color: accentColor });

      // Prix à droite
      const PX = MARGIN + COL - 180;
      const prix6  = formatPrix(g.prixFinal['6']);
      const prix12 = formatPrix(g.prixFinal['12']);
      const prix24 = formatPrix(g.prixFinal['24']);

      t(`${prix6} TTC / 6 mois`,  PX, y + 22, { size: 8, color: DARK });
      t(`${prix12} TTC / 12 mois`, PX, y + 35, { font: bold, size: 9, color: accentColor });
      t(`${prix24} TTC / 24 mois`, PX, y + 48, { size: 8, color: DARK });

      y += BLOCK_H + 6;

      void l; // référence pour éviter le warning TS
    });

    y += 6;
    const { text: t2, line: l2 } = currentHelpers;
    l2(MARGIN, y, MARGIN + COL, y);
    y += 8;
    t2('Prix TTC - Taxe d\'assurance incluse', MARGIN, y, { size: 7.5, color: GRAY });
    y += 18;

    // ── AVANTAGES COMMUNS ───────────────────────────────────────────────────
    ensurePage(80);
    const { text: t3, rect: r3 } = currentHelpers;

    r3(MARGIN, y, COL, 72, { fill: LIGHT_BLUE, stroke: rgb(0.22, 0.094, 0.576) });
    t3('Inclus dans toutes nos formules', MARGIN + 12, y + 13, { font: bold, size: 9.5, color: VIOLET });

    const avantages = [
      'Pas de franchise',   'Pas de carence',
      "Pas d'avance de frais", 'Cessible gratuitement',
      'Couverture Europeenne', 'Kilometrage illimite',
      'Pas de vetuste',     '100% Digital',
    ];
    avantages.forEach((a, idx) => {
      const col3 = idx % 2 === 0 ? MARGIN + 12 : MARGIN + COL / 2 + 10;
      const row3 = y + 28 + Math.floor(idx / 2) * 12;
      t3('+', col3, row3, { font: bold, size: 8, color: VIOLET });
      t3(a,   col3 + 10, row3, { size: 8, color: DARK });
    });

    y += 72 + 16;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const { text: tFoot, line: lFoot } = { text, line };
  lFoot(MARGIN, H - 32, W - MARGIN, H - 32);
  tFoot('Garantie Plus SAS - RCS Paris 943 193 037 - ORIAS n\u00b025004236 - 130, rue de Courcelles - 75017 Paris', MARGIN, H - 20, { size: 7, color: GRAY });
  tFoot('contact@garantieplus.fr | rgpd@garantieplus.fr', MARGIN, H - 10, { size: 7, color: GRAY });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
