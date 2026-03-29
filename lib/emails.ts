import { Resend } from 'resend';
import { GarantieProposee, Devis } from '@/types';
import { genererPDFDevis } from '@/lib/pdf';

const resend = new Resend(process.env.RESEND_API_KEY);

const formatPrix = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const getGammeColor = (gamme: string) => {
  switch (gamme) {
    case 'eco': return '#2E7D4F';
    case 'luxe': return '#1A1A2E';
    case 'luxe_premium': return '#0D0D1A';
    default: return '#381893';
  }
};

const buildGarantieRows = (garanties: GarantieProposee[]) =>
  garanties.map((g, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#F8F6FC'};">
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;">
        <span style="display:inline-block;background:${getGammeColor(g.gamme)};color:white;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.3px;">
          ${g.nomCommercial}
        </span>
        ${g.pondereApplique ? '<span style="display:inline-block;margin-left:6px;background:#FEF3C7;color:#92400E;padding:2px 7px;border-radius:10px;font-size:11px;">×1,5</span>' : ''}
      </td>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6B7280;">${g.plafondIntervention}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;color:#374151;">${formatPrix(g.prixFinal['6'])}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:center;">
        <strong style="font-size:15px;color:#381893;">${formatPrix(g.prixFinal['12'])}</strong>
      </td>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;color:#374151;">${formatPrix(g.prixFinal['24'])}</td>
    </tr>
  `).join('');

// ── Email garage — HTML professionnel ─────────────────────────────────────────

const emailGarageHTML = (devis: Devis, garanties: GarantieProposee[]) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre devis Garantie Plus</title>
</head>
<body style="margin:0;padding:0;background:#F0EDF8;font-family:Arial,Helvetica,sans-serif;">

  <div style="max-width:640px;margin:24px auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(56,24,147,0.13);">

    <!-- ── HEADER ── -->
    <div style="background:linear-gradient(135deg,#381893 0%,#47b4e1 100%);padding:36px 40px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;color:white;font-size:26px;font-weight:700;letter-spacing:1px;line-height:1;">GARANTIE PLUS</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.78);font-size:12px;">Courtier en garanties mécaniques automobiles</p>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">ORIAS n°25004236</p>
          </td>
        </tr>
      </table>

      <!-- Titre accrocheur -->
      <div style="margin-top:28px;padding:20px 24px;background:rgba(255,255,255,0.12);border-radius:10px;border-left:4px solid rgba(255,255,255,0.5);">
        <p style="margin:0;color:white;font-size:20px;font-weight:700;line-height:1.3;">Votre devis personnalisé est prêt&nbsp;!</p>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.82);font-size:13px;">
          ${devis.marque} ${devis.modele} — ${devis.nom_garage}
        </p>
      </div>
    </div>

    <!-- ── BODY ── -->
    <div style="background:white;padding:36px 40px;">

      <p style="margin:0 0 6px;color:#1A1A2E;font-size:16px;font-weight:600;">Bonjour ${devis.nom_contact},</p>
      <p style="margin:0 0 28px;color:#6B7280;font-size:14px;line-height:1.6;">
        Suite à votre demande, voici les garanties mécaniques disponibles pour votre véhicule.
        Le <strong>devis complet est joint en PDF</strong> à cet email.
        Tous les tarifs sont en <strong>TTC, taxe d'assurance incluse</strong>.
      </p>

      ${garanties.length === 0 ? `
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:20px;color:#DC2626;font-size:14px;">
          Votre véhicule ne correspond pas aux critères d'éligibilité actuels.<br>
          Contactez-nous : <a href="mailto:contact@garantieplus.fr" style="color:#DC2626;">contact@garantieplus.fr</a>
        </div>
      ` : `

        <!-- ── TABLEAU GARANTIES ── -->
        <p style="margin:0 0 10px;color:#1A1A2E;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Vos offres</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:28px;">
          <thead>
            <tr style="background:#381893;">
              <th style="padding:11px 14px;text-align:left;font-size:12px;color:white;font-weight:600;">Formule</th>
              <th style="padding:11px 14px;text-align:left;font-size:12px;color:white;font-weight:600;">Plafond</th>
              <th style="padding:11px 14px;text-align:center;font-size:12px;color:rgba(255,255,255,0.8);font-weight:600;">6 mois</th>
              <th style="padding:11px 14px;text-align:center;font-size:12px;color:white;font-weight:700;">12 mois</th>
              <th style="padding:11px 14px;text-align:center;font-size:12px;color:rgba(255,255,255,0.8);font-weight:600;">24 mois</th>
            </tr>
          </thead>
          <tbody>
            ${buildGarantieRows(garanties)}
          </tbody>
        </table>
        <p style="margin:-20px 0 28px;color:#9CA3AF;font-size:11px;text-align:right;">Prix TTC — Taxe d'assurance incluse</p>

        <!-- ── LES + DE GARANTIE PLUS ── -->
        <div style="background:#F8F6FC;border-radius:12px;padding:24px;margin-bottom:28px;">
          <p style="margin:0 0 6px;color:#381893;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;">Les + de Garantie Plus</p>
          <p style="margin:0 0 16px;color:#9CA3AF;font-size:12px;text-align:center;">Ce que vous ne trouvez nulle part ailleurs</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td style="vertical-align:top;padding-right:10px;width:50%;">
                <div style="background:white;border-radius:8px;padding:14px;border-left:3px solid #381893;">
                  <p style="margin:0 0 4px;color:#381893;font-size:12px;font-weight:700;">Plafond PAR intervention</p>
                  <p style="margin:0;color:#6B7280;font-size:11px;line-height:1.6;">Le plafond se reinitialise a chaque sinistre — pas d'enveloppe globale qui se vide.</p>
                </div>
              </td>
              <td style="vertical-align:top;width:50%;">
                <div style="background:white;border-radius:8px;padding:14px;border-left:3px solid #47b4e1;">
                  <p style="margin:0 0 4px;color:#381893;font-size:12px;font-weight:700;">Plafond fixe — sans degressi</p>
                  <p style="margin:0;color:#6B7280;font-size:11px;line-height:1.6;">Notre plafond ne diminue jamais, meme apres 7 ou 10 ans. Unique sur le marche.</p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Badges avantages style depliant -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${[
                ['Pas de Vetuste', true],
                ['Cessible Gratuitement', false],
                ['Pas de Franchise', true],
              ].map(([label, isPrimary]) =>
                `<td style="padding:3px;text-align:center;">
                  <span style="display:inline-block;background:${isPrimary ? '#381893' : 'white'};color:${isPrimary ? 'white' : '#47b4e1'};border:2px solid ${isPrimary ? '#381893' : '#47b4e1'};font-size:11px;font-weight:700;padding:6px 12px;border-radius:20px;">${label}</span>
                </td>`
              ).join('')}
            </tr>
            <tr>
              ${[
                ['Kilometrage Illimite', false],
                ['Pas de Carence', true],
                ["Pas d'avance de Frais", false],
              ].map(([label, isPrimary]) =>
                `<td style="padding:3px;text-align:center;">
                  <span style="display:inline-block;background:${isPrimary ? '#381893' : 'white'};color:${isPrimary ? 'white' : '#47b4e1'};border:2px solid ${isPrimary ? '#381893' : '#47b4e1'};font-size:11px;font-weight:700;padding:6px 12px;border-radius:20px;">${label}</span>
                </td>`
              ).join('')}
            </tr>
            <tr>
              ${[
                ['100% Digital', true],
                ['Couverture Europeenne', false],
                ['Plafond par Intervention', true],
              ].map(([label, isPrimary]) =>
                `<td style="padding:3px;text-align:center;">
                  <span style="display:inline-block;background:${isPrimary ? '#381893' : 'white'};color:${isPrimary ? 'white' : '#47b4e1'};border:2px solid ${isPrimary ? '#381893' : '#47b4e1'};font-size:11px;font-weight:700;padding:6px 12px;border-radius:20px;">${label}</span>
                </td>`
              ).join('')}
            </tr>
          </table>
        </div>

        <!-- ── CTA ── -->
        <div style="text-align:center;margin-bottom:28px;">
          <p style="margin:0 0 14px;color:#6B7280;font-size:13px;">Le PDF de votre devis est joint à cet email.</p>
          ${garanties.map(g => `
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}${g.fichierCG}"
             style="display:inline-block;margin:4px;background:white;color:#381893;border:2px solid #381893;padding:9px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
            Conditions Générales — ${g.nomCommercial}
          </a>`).join('')}
        </div>

      `}

      <!-- ── CONTACT ── -->
      <div style="background:#F8F6FC;border-radius:10px;padding:16px 20px;text-align:center;">
        <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
          Une question ? Notre équipe vous rappelle sous 24h<br>
          <a href="mailto:contact@garantieplus.fr" style="color:#381893;font-weight:600;text-decoration:none;">contact@garantieplus.fr</a>
        </p>
      </div>
    </div>

    <!-- ── FOOTER ── -->
    <div style="background:#1A1A2E;padding:20px 40px;">
      <p style="margin:0;color:#6B7280;font-size:11px;text-align:center;line-height:1.8;">
        Garantie Plus SAS — RCS Paris 943 193 037 — ORIAS n°25004236<br>
        130, rue de Courcelles – 75017 Paris<br>
        <a href="mailto:rgpd@garantieplus.fr" style="color:#47b4e1;text-decoration:none;">rgpd@garantieplus.fr</a>
      </p>
    </div>

  </div>
</body>
</html>
`;

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
        Voir le devis dans le back-office →
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
    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: `Garantie Plus <${fromAddr}>`,
      to: devis.email,
      subject: `Votre devis Garantie Plus — ${devis.marque} ${devis.modele}`,
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
