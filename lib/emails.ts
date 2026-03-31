import { Resend } from 'resend';
import { GarantieProposee, Devis } from '@/types';
import { genererPDFDevis } from '@/lib/pdf';

const resend = new Resend(process.env.RESEND_API_KEY);

const formatPrix = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const getGammeColor = (gamme: string) => {
  switch (gamme) {
    case 'eco': return '#2E7D4F';
    case 'luxe': return '#1A1A2E';
    case 'luxe_premium': return '#0D0D1A';
    default: return '#381893';
  }
};

const getGammeLabel = (gamme: string) => {
  switch (gamme) {
    case 'eco': return 'ECO';
    case 'luxe': return 'LUXE';
    case 'luxe_premium': return 'LUXE PREMIUM';
    default: return 'CLASSIQUE';
  }
};

const buildGarantieCard = (g: GarantieProposee) => {
  const color = getGammeColor(g.gamme);
  const gammeLabel = getGammeLabel(g.gamme);
  const couverture = g.niveau === 5
    ? 'Garantie TOUT SAUF — toutes pièces sauf exclusions listées aux CG'
    : g.nombrePiecesCouvertes + ' couvertes';
  const plafond6 = g.plafondParDuree ? g.plafondParDuree['6'] : g.plafondIntervention;
  const plafond12 = g.plafondParDuree ? g.plafondParDuree['12'] : g.plafondIntervention;
  const plafond24 = g.plafondParDuree ? g.plafondParDuree['24'] : g.plafondIntervention;
  const hasVariablePlafond = !!g.plafondParDuree;

  return `
  <div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:16px;">

    <!-- Card header colored -->
    <div style="background:${color};padding:16px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="font-size:10px;color:rgba(255,255,255,0.65);font-weight:700;text-transform:uppercase;letter-spacing:2px;">Gamme ${gammeLabel}</span><br>
            <span style="font-size:16px;color:white;font-weight:700;line-height:1.4;">${g.nomCommercial}</span>
            ${g.pondereApplique ? '<br><span style="display:inline-block;margin-top:4px;background:rgba(255,255,255,0.2);color:white;font-size:11px;font-weight:600;padding:2px 10px;border-radius:12px;">Tarif pondéré ×1,5 appliqué</span>' : ''}
          </td>
          <td style="text-align:right;vertical-align:top;">
            <span style="display:inline-block;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.9);font-size:11px;padding:4px 10px;border-radius:8px;">
              Éligibilité : &lt; ${g.ageMaxAns} ans &amp; &lt; ${g.kmMax.toLocaleString('fr-FR')} km
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Card body -->
    <div style="background:white;padding:16px 20px;">

      <!-- Couverture + Plafond -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
        <tr>
          <td style="width:50%;padding-right:8px;vertical-align:top;">
            <div style="border:1px solid #E5E7EB;border-radius:8px;padding:10px 12px;">
              <div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Couverture</div>
              <div style="font-size:12px;color:${color};font-weight:700;line-height:1.4;">${couverture}</div>
            </div>
          </td>
          <td style="width:50%;padding-left:8px;vertical-align:top;">
            <div style="border:1px solid #E5E7EB;border-radius:8px;padding:10px 12px;">
              <div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Plafond / intervention</div>
              <div style="font-size:12px;color:${color};font-weight:700;line-height:1.4;">
                ${hasVariablePlafond
                  ? `${plafond6} (6 mois) / ${plafond12} (12 mois) / ${plafond24} (24 mois)`
                  : (g.plafondIntervention === 'VRADE' ? 'Plafond VRADE (valeur réelle du véhicule)' : `Jusqu\'à ${g.plafondIntervention}`)
                }
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Tableau des prix -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:${color};">
            <th style="padding:9px 14px;font-size:11px;color:rgba(255,255,255,0.75);font-weight:600;text-align:left;">Durée</th>
            <th style="padding:9px 14px;font-size:11px;color:rgba(255,255,255,0.75);font-weight:600;text-align:center;">Prix TTC</th>
            <th style="padding:9px 14px;font-size:11px;color:rgba(255,255,255,0.75);font-weight:600;text-align:left;">Plafond inclus</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#ffffff;">
            <td style="padding:10px 14px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">6 mois</td>
            <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#374151;text-align:center;border-bottom:1px solid #F3F4F6;">${formatPrix(g.prixFinal['6'])}</td>
            <td style="padding:10px 14px;font-size:12px;color:#9CA3AF;border-bottom:1px solid #F3F4F6;">${plafond6 === 'VRADE' ? 'Plafond VRADE' : plafond6}</td>
          </tr>
          <tr style="background:#F9FAFB;">
            <td style="padding:10px 14px;font-size:13px;color:#374151;font-weight:700;border-bottom:1px solid #F3F4F6;">12 mois <span style="font-size:10px;color:${color};background:rgba(56,24,147,0.08);padding:2px 6px;border-radius:8px;margin-left:4px;">recommandé</span></td>
            <td style="padding:10px 14px;text-align:center;border-bottom:1px solid #F3F4F6;">
              <strong style="font-size:17px;color:${color};">${formatPrix(g.prixFinal['12'])}</strong>
            </td>
            <td style="padding:10px 14px;font-size:12px;color:#9CA3AF;border-bottom:1px solid #F3F4F6;">${plafond12 === 'VRADE' ? 'Plafond VRADE' : plafond12}</td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:10px 14px;font-size:13px;color:#6B7280;">24 mois</td>
            <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#374151;text-align:center;">${formatPrix(g.prixFinal['24'])}</td>
            <td style="padding:10px 14px;font-size:12px;color:#9CA3AF;">${plafond24 === 'VRADE' ? 'Plafond VRADE' : plafond24}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin:6px 0 0;font-size:10px;color:#9CA3AF;text-align:right;">Prix TTC — Taxe d'assurance incluse</p>

    </div>
  </div>
  `;
};

// ── Email garage — HTML professionnel ─────────────────────────────────────────

const emailGarageHTML = (devis: Devis, garanties: GarantieProposee[]) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://devis.garantieplus.fr';

  const caractVehicule = [
    devis.is_4x4 && '4x4 / SUV',
    devis.is_plus_2t3 && '+2,3 tonnes',
    devis.is_plus_14cv && '+14 CV fiscaux',
    devis.is_hybride_electrique && 'Hybride / Électrique',
    devis.valeur_neuf_55k && 'Valeur > 55k€',
    devis.valeur_neuf_100k && 'Valeur > 100k€',
    devis.valeur_neuf_150k && 'Valeur > 150k€',
  ].filter(Boolean) as string[];

  const avantages = [
    ['Pas de vétusté appliquée', true],
    ['Cessible gratuitement', false],
    ['Pas de franchise', true],
    ['Kilométrage illimité', false],
    ['Pas de carence', true],
    ["Pas d'avance de frais", false],
    ['100% Digital', true],
    ['Couverture Européenne', false],
    ['Plafond PAR intervention', true],
  ] as [string, boolean][];

  // 3 badges par ligne
  const badgeRows: [string, boolean][][] = [];
  for (let i = 0; i < avantages.length; i += 3) {
    badgeRows.push(avantages.slice(i, i + 3));
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre devis Garantie Plus</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">

<div style="max-width:640px;margin:24px auto;">

  <!-- ══ HEADER blanc style site ══ -->
  <div style="background:white;border-radius:12px 12px 0 0;border:1px solid #E5E7EB;border-bottom:none;padding:16px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <img src="${baseUrl}/logo.png" alt="Garantie Plus" height="44" style="display:block;max-width:130px;height:auto;" />
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <span style="font-size:10px;color:#9CA3AF;">ORIAS n°25004236</span><br>
          <span style="font-size:10px;color:#9CA3AF;">130, rue de Courcelles – 75017 Paris</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Bandeau titre -->
  <div style="background:linear-gradient(90deg,#381893 0%,#47b4e1 100%);padding:18px 28px;">
    <p style="margin:0;color:white;font-size:18px;font-weight:700;line-height:1.3;">Votre devis personnalisé est prêt !</p>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${devis.marque} ${devis.modele} — ${devis.nom_garage}</p>
  </div>

  <!-- ══ BODY ══ -->
  <div style="background:white;border:1px solid #E5E7EB;border-top:none;padding:28px;">

    <p style="margin:0 0 4px;color:#1A1A2E;font-size:15px;font-weight:600;">Bonjour ${devis.nom_contact},</p>
    <p style="margin:0 0 24px;color:#6B7280;font-size:13px;line-height:1.6;">
      Suite à votre demande, voici les Garanties Panne Mécanique disponibles pour votre véhicule.
      Le <strong>devis complet est joint en PDF</strong> à cet email. Tous les tarifs sont en <strong>TTC, taxe d'assurance incluse</strong>.
    </p>

    <!-- ══ BLOCS VÉHICULE + GARAGE ══ -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <!-- Véhicule -->
        <td style="width:50%;padding-right:8px;vertical-align:top;">
          <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1A1A2E;border-bottom:1px solid #F3F4F6;padding-bottom:8px;">Véhicule</p>
            <table cellpadding="0" cellspacing="0" style="font-size:12px;width:100%;">
              <tr><td style="color:#9CA3AF;padding:3px 0;width:44%;">Marque</td><td style="color:#1A1A2E;font-weight:600;">${devis.marque}</td></tr>
              <tr><td style="color:#9CA3AF;padding:3px 0;">Modèle</td><td style="color:#1A1A2E;font-weight:600;">${devis.modele}</td></tr>
              <tr><td style="color:#9CA3AF;padding:3px 0;">1ère mise en circ.</td><td style="color:#1A1A2E;">${devis.date_mise_en_circulation}</td></tr>
              <tr><td style="color:#9CA3AF;padding:3px 0;">Kilométrage</td><td style="color:#1A1A2E;">${devis.kilometrage.toLocaleString('fr-FR')} km</td></tr>
            </table>
            ${caractVehicule.length > 0 ? `
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid #F3F4F6;">
              ${caractVehicule.map(c =>
                `<span style="display:inline-block;background:#EDE9FE;color:#381893;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;margin:2px 2px 2px 0;">${c}</span>`
              ).join('')}
            </div>` : ''}
          </div>
        </td>

        <!-- Garage -->
        <td style="width:50%;padding-left:8px;vertical-align:top;">
          <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1A1A2E;border-bottom:1px solid #F3F4F6;padding-bottom:8px;">Garage</p>
            <table cellpadding="0" cellspacing="0" style="font-size:12px;width:100%;">
              <tr><td style="color:#9CA3AF;padding:3px 0;width:44%;">Garage</td><td style="color:#1A1A2E;font-weight:600;">${devis.nom_garage}</td></tr>
              <tr><td style="color:#9CA3AF;padding:3px 0;">Contact</td><td style="color:#1A1A2E;">${devis.nom_contact}</td></tr>
              <tr><td style="color:#9CA3AF;padding:3px 0;">Email</td><td><a href="mailto:${devis.email}" style="color:#381893;text-decoration:none;">${devis.email}</a></td></tr>
              <tr><td style="color:#9CA3AF;padding:3px 0;">Téléphone</td><td style="color:#1A1A2E;">${devis.telephone}</td></tr>
            </table>
          </div>
        </td>
      </tr>
    </table>

    ${garanties.length === 0 ? `
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:20px;color:#DC2626;font-size:14px;margin-bottom:24px;">
      Votre véhicule ne correspond pas aux critères d'éligibilité actuels (âge > 15 ans ou kilométrage > 200 000 km).<br>
      Contactez-nous : <a href="mailto:contact@garantieplus.fr" style="color:#DC2626;">contact@garantieplus.fr</a>
    </div>
    ` : `

    <!-- ══ GARANTIES PROPOSÉES ══ -->
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1A1A2E;text-transform:uppercase;letter-spacing:0.5px;">Garanties proposées</p>
    ${garanties.map(g => buildGarantieCard(g)).join('')}

    <!-- CG téléchargeables -->
    <div style="margin-bottom:24px;padding:12px 16px;border:1px solid #E5E7EB;border-radius:8px;background:#F9FAFB;">
      <p style="margin:0 0 8px;font-size:11px;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Conditions Générales téléchargeables</p>
      ${garanties.map(g =>
        `<a href="${baseUrl}${g.fichierCG}" style="display:inline-block;margin:3px;background:white;color:#381893;border:1px solid #381893;padding:6px 14px;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;">${g.nomCommercial}</a>`
      ).join('')}
    </div>

    `}

    <!-- ══ LES + DE GARANTIE PLUS ══ -->
    <div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <div style="background:linear-gradient(90deg,#381893 0%,#47b4e1 100%);padding:14px 20px;text-align:center;">
        <p style="margin:0;color:white;font-size:14px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Les + de Garantie Plus</p>
        <p style="margin:2px 0 0;color:rgba(255,255,255,0.75);font-size:11px;">Ce que vous ne trouvez nulle part ailleurs</p>
      </div>
      <div style="background:white;padding:16px 20px;">

        <!-- 2 arguments clés -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr>
            <td style="width:50%;padding-right:6px;vertical-align:top;">
              <div style="border-left:3px solid #381893;padding:10px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;">
                <p style="margin:0 0 3px;color:#381893;font-size:12px;font-weight:700;">Plafond PAR intervention</p>
                <p style="margin:0;color:#6B7280;font-size:11px;line-height:1.5;">Le plafond se réinitialise à chaque sinistre — pas d'enveloppe globale qui se vide.</p>
              </div>
            </td>
            <td style="width:50%;padding-left:6px;vertical-align:top;">
              <div style="border-left:3px solid #47b4e1;padding:10px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;">
                <p style="margin:0 0 3px;color:#381893;font-size:12px;font-weight:700;">Plafond fixe — sans dégressivité</p>
                <p style="margin:0;color:#6B7280;font-size:11px;line-height:1.5;">Notre plafond ne diminue jamais, même après 7 ou 10 ans. Unique sur le marché.</p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Badges -->
        <table width="100%" cellpadding="0" cellspacing="0">
          ${badgeRows.map(row => `
          <tr>
            ${row.map(([label, isPrimary]) =>
              `<td style="padding:3px;text-align:center;">
                <span style="display:inline-block;background:${isPrimary ? '#381893' : 'white'};color:${isPrimary ? 'white' : '#47b4e1'};border:2px solid ${isPrimary ? '#381893' : '#47b4e1'};font-size:11px;font-weight:700;padding:6px 10px;border-radius:20px;">${label}</span>
              </td>`
            ).join('')}
          </tr>`).join('')}
        </table>
      </div>
    </div>

    <!-- Contact -->
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px 20px;text-align:center;">
      <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
        Une question ? Notre équipe vous rappelle sous 24h<br>
        <a href="mailto:contact@garantieplus.fr" style="color:#381893;font-weight:600;text-decoration:none;">contact@garantieplus.fr</a>
        &nbsp;|&nbsp;
        <a href="https://www.garantieplus.fr" style="color:#47b4e1;font-weight:600;text-decoration:none;">www.garantieplus.fr</a>
      </p>
    </div>

  </div>

  <!-- ══ FOOTER ══ -->
  <div style="background:#1A1A2E;border-radius:0 0 12px 12px;padding:18px 28px;">
    <p style="margin:0;color:#6B7280;font-size:11px;text-align:center;line-height:1.8;">
      Garantie Plus SAS — RCS Paris 943 193 037 — ORIAS n°25004236<br>
      130, rue de Courcelles – 75017 Paris — Courtier en assurance<br>
      <a href="mailto:rgpd@garantieplus.fr" style="color:#47b4e1;text-decoration:none;">rgpd@garantieplus.fr</a>
      &nbsp;—&nbsp;
      <a href="https://www.garantieplus.fr" style="color:#47b4e1;text-decoration:none;">garantieplus.fr</a>
    </p>
  </div>

</div>
</body>
</html>`;
};

// ── Email interne ─────────────────────────────────────────────────────────────

const emailInterneHTML = (devis: Devis, garanties: GarantieProposee[]) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#F8F6FC;">
  <div style="background:white;border-radius:12px;padding:28px;border:1px solid #E5E7EB;">
    <h2 style="margin:0 0 20px;color:#381893;font-size:18px;">Nouveau devis reçu</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr><td style="padding:6px 0;color:#6B7280;width:140px;">Garage</td><td style="padding:6px 0;font-weight:600;color:#1A1A2E;">${devis.nom_garage}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Contact</td><td style="padding:6px 0;color:#1A1A2E;">${devis.nom_contact}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Email</td><td style="padding:6px 0;"><a href="mailto:${devis.email}" style="color:#381893;">${devis.email}</a></td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Téléphone</td><td style="padding:6px 0;color:#1A1A2E;">${devis.telephone}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Véhicule</td><td style="padding:6px 0;color:#1A1A2E;font-weight:600;">${devis.marque} ${devis.modele}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Kilométrage</td><td style="padding:6px 0;color:#1A1A2E;">${devis.kilometrage.toLocaleString('fr-FR')} km</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Garanties</td><td style="padding:6px 0;color:#1A1A2E;">${garanties.map(g => g.nomCommercial).join(', ') || 'Aucune éligible'}</td></tr>
    </table>
    <div style="margin-top:20px;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/devis/${devis.id}"
         style="display:inline-block;background:#381893;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Voir le devis dans le back-office
      </a>
    </div>
  </div>
</body>
</html>
`;

// ── Fonctions d'envoi ─────────────────────────────────────────────────────────

export async function envoyerEmailGarage({
  devis,
  garanties,
}: {
  devis: Devis;
  garanties: GarantieProposee[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Génération du PDF en pièce jointe
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await genererPDFDevis(devis, garanties);
    } catch (pdfErr) {
      console.error('[Email] Erreur génération PDF (non bloquant):', pdfErr);
    }

    const fromAddr = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    // En mode test (onboarding@resend.dev), Resend n'autorise l'envoi que vers
    // l'email du compte Resend. On redirige donc vers EMAIL_ADMIN.
    // En production (domaine vérifié), on envoie directement au garage.
    const isTestMode = fromAddr === 'onboarding@resend.dev';
    const toAddr = isTestMode
      ? (process.env.EMAIL_ADMIN || 'contact@garantieplus.fr')
      : devis.email;

    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: `Garantie Plus <${fromAddr}>`,
      to: toAddr,
      subject: isTestMode
        ? `[TEST → ${devis.email}] Devis Garantie Plus — ${devis.marque} ${devis.modele}`
        : `Votre devis Garantie Plus — ${devis.marque} ${devis.modele}`,
      html: emailGarageHTML(devis, garanties),
    };

    if (pdfBuffer) {
      payload.attachments = [{
        filename: `devis-garantieplus-${devis.marque}-${devis.modele}.pdf`
          .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, ''),
        content: pdfBuffer,
      }];
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('[Resend] Erreur envoi email garage:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log('[Resend] Email garage envoyé, id:', data?.id);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Resend] Exception email garage:', msg);
    return { success: false, error: msg };
  }
}

export async function envoyerEmailInterne({
  devis,
  garanties,
}: {
  devis: Devis;
  garanties: GarantieProposee[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const fromAddr = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const { data, error } = await resend.emails.send({
      from: `Garantie Plus <${fromAddr}>`,
      to: process.env.EMAIL_ADMIN || 'contact@garantieplus.fr',
      subject: `Nouveau devis — ${devis.nom_garage} — ${devis.marque} ${devis.modele}`,
      html: emailInterneHTML(devis, garanties),
    });

    if (error) {
      console.error('[Resend] Erreur envoi email interne:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log('[Resend] Email interne envoyé, id:', data?.id);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Resend] Exception email interne:', msg);
    return { success: false, error: msg };
  }
}
