import fs from 'fs';
import path from 'path';
import type { Devis, Duree, Gamme, GarantieProposee } from '@/types';
import { libelleEnergie } from '@/types';
import { genererPDFDevis } from '@/lib/pdf';
import { envoyerEmail, type PieceJointe } from '@/lib/brevo';
import { CARNET_2026 } from '@/lib/gvo/documents';
import { AVANTAGES_PLUS } from '@/lib/gvo/organes';
import { echapperHtml as h, formatDateFr, formatEuros, formatKm } from '@/lib/format';

const BRAND = '#381893';
const BRAND_CYAN = '#47b4e1';
const GRADIENT = `linear-gradient(90deg,${BRAND} 0%,${BRAND_CYAN} 100%)`;
const POLICE = 'Arial,Helvetica,sans-serif';
const LARGEUR = 640;
const TEL = '01 84 18 08 08';
const CONTACT = 'contact@garantieplus.fr';

export const baseUrl = () =>
  (process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis.garantieplus.fr').replace(/\/+$/, '');

const couleurGamme = (gamme: Gamme) => (gamme === 'eco' ? '#166534' : gamme === 'luxe' ? '#1A1A2E' : BRAND);
const libelleGamme = (gamme: Gamme) => (gamme === 'eco' ? 'ECO' : gamme === 'luxe' ? 'LUXE' : 'CLASSIQUE');
const etoiles = (g: GarantieProposee) =>
  Array.from({ length: 5 }, (_, k) =>
    `<span style="color:${k < g.niveau ? (g.gamme === 'eco' ? '#10D96E' : '#F5A623') : 'rgba(255,255,255,0.3)'};font-size:15px">${g.gamme === 'eco' ? '🍀' : '★'}</span>`
  ).join('');

/** Habillage commun des e-mails (tableaux, comme l'app garantieplus : Outlook rend en Word). */
export function shell(titre: string, sousTitre: string, corps: string, apercu = ''): string {
  const base = baseUrl();
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${h(titre)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background:#f3f4f6;font-family:${POLICE};color:#1a1a2e;-webkit-font-smoothing:antialiased">
${apercu ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${h(apercu)}${'&#8199;&#65279;&#847; '.repeat(60)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="background:#f3f4f6;border-collapse:collapse">
<tr><td align="center" style="padding:20px 10px">
<!--[if mso]><table role="presentation" width="${LARGEUR}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${LARGEUR}px;border-collapse:collapse">
  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:16px 24px;border-radius:10px 10px 0 0;border:1px solid #e5e7eb;border-bottom:none">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle"><a href="${base}" style="text-decoration:none"><img src="${base}/logo.png" alt="Garantie Plus" height="44" style="display:block;max-width:150px;height:44px;border:0;color:${BRAND};font-family:${POLICE};font-size:20px;font-weight:bold"></a></td>
      <td align="right" style="vertical-align:middle;font-family:${POLICE};font-size:10px;line-height:15px;color:#9ca3af">ORIAS n°25004236<br>130, rue de Courcelles – 75017 Paris</td>
    </tr></table>
  </td></tr>
  <tr><td bgcolor="${BRAND}" style="background:${BRAND};background-image:${GRADIENT};padding:18px 24px">
    <p style="margin:0;font-family:${POLICE};font-size:19px;line-height:26px;color:#ffffff;font-weight:bold">${h(titre)}</p>
    ${sousTitre ? `<p style="margin:4px 0 0;font-family:${POLICE};font-size:13px;line-height:19px;color:rgba(255,255,255,0.85)">${h(sousTitre)}</p>` : ''}
  </td></tr>
  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none">
    ${corps}
  </td></tr>
  <tr><td bgcolor="#1A1A2E" align="center" style="background:#1A1A2E;padding:18px 24px;border-radius:0 0 10px 10px">
    <p style="margin:0 0 6px;font-family:${POLICE};font-size:13px;line-height:20px;color:#ffffff">
      <a href="tel:+33184180808" style="color:#ffffff;text-decoration:none;font-weight:bold">${TEL}</a>
      <span style="color:#6b7280">&nbsp;·&nbsp;</span>
      <a href="mailto:${CONTACT}" style="color:${BRAND_CYAN};text-decoration:none;font-weight:bold">${CONTACT}</a>
    </p>
    <p style="margin:0;font-family:${POLICE};font-size:11px;line-height:17px;color:#9ca3af">
      Garantie Plus SAS — RCS Paris 943 193 037 — ORIAS n°25004236 — Courtier en assurance<br>
      130, rue de Courcelles – 75017 Paris — <a href="https://www.garantieplus.fr" style="color:${BRAND_CYAN};text-decoration:none">garantieplus.fr</a> — <a href="mailto:rgpd@garantieplus.fr" style="color:${BRAND_CYAN};text-decoration:none">rgpd@garantieplus.fr</a>
    </p>
  </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body></html>`;
}

// ── Carte d'une garantie ──────────────────────────────────────────────────────

function carteGarantie(g: GarantieProposee, recommandee: boolean): string {
  const color = couleurGamme(g.gamme);
  const plafond = (d: Duree) => (g.plafondParDuree ? g.plafondParDuree[d] : g.plafondIntervention);
  const ligne = (d: Duree, reco: boolean) => `
    <tr style="background:${reco ? '#F8F6FC' : '#ffffff'}">
      <td style="padding:9px 12px;font-family:${POLICE};font-size:13px;color:#374151;font-weight:${reco ? '700' : '400'};border-bottom:1px solid #f3f4f6">${d} mois${reco ? ` <span style="font-size:10px;color:${color};background:rgba(56,24,147,0.08);padding:2px 6px;border-radius:8px">recommandé</span>` : ''}</td>
      <td align="center" style="padding:9px 12px;font-family:${POLICE};font-size:${reco ? '17px' : '14px'};font-weight:700;color:${reco ? color : '#374151'};border-bottom:1px solid #f3f4f6;white-space:nowrap">${formatEuros(g.prixCents[d])}</td>
      <td style="padding:9px 12px;font-family:${POLICE};font-size:12px;color:#374151;font-weight:700;border-bottom:1px solid #f3f4f6">${plafond(d) === 'VRADE' ? "Jusqu'à la VRADE" : `Jusqu'à ${h(plafond(d))}`}</td>
    </tr>`;
  const badges = [
    g.pondereApplique ? 'Tarif pondéré ×1,5 appliqué' : '',
    g.tarifJeune ? 'Tarif jeune véhicule' : '',
    g.segment === 'luxe_gt150' ? 'Valeur à neuf > 150 000 €' : '',
  ].filter(Boolean);

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;overflow:hidden;margin-bottom:16px">
    <tr><td bgcolor="${color}" style="background:${color};padding:14px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:top">
          <span style="font-family:${POLICE};font-size:10px;color:rgba(255,255,255,0.7);font-weight:700;text-transform:uppercase;letter-spacing:2px">Gamme ${libelleGamme(g.gamme)}</span><br>
          <span style="line-height:20px">${etoiles(g)}</span><br>
          <span style="font-family:${POLICE};font-size:16px;color:#ffffff;font-weight:700;line-height:1.4">${h(g.nomCommercial)}</span>
          ${badges.map(b => `<br><span style="display:inline-block;margin-top:4px;background:rgba(255,255,255,0.2);color:#ffffff;font-family:${POLICE};font-size:11px;font-weight:600;padding:2px 10px;border-radius:12px">${b}</span>`).join('')}
        </td>
        <td align="right" style="vertical-align:top;white-space:nowrap">
          <span style="display:inline-block;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.9);font-family:${POLICE};font-size:11px;padding:4px 10px;border-radius:8px">&lt; ${g.ageMaxAns} ans${g.kmMax != null ? ` / ${g.kmMax.toLocaleString('fr-FR')} km` : ''}</span>
          ${recommandee ? `<br><span style="display:inline-block;margin-top:6px;background:#F5A623;color:#ffffff;font-family:${POLICE};font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px">RECOMMANDÉ</span>` : ''}
        </td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:14px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px"><tr>
        <td width="50%" style="padding-right:6px;vertical-align:top">
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:9px 12px">
            <div style="font-family:${POLICE};font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Plafond / intervention</div>
            <div style="font-family:${POLICE};font-size:12px;color:${color};font-weight:700;line-height:1.4">${g.plafondParDuree ? `${g.plafondParDuree['6']} (6 mois) / ${g.plafondParDuree['12']} (12 mois) / ${g.plafondParDuree['24']} (24 mois)` : g.plafondIntervention === 'VRADE' ? 'Plafond VRADE (valeur de remplacement du véhicule)' : `Jusqu'à ${h(g.plafondIntervention)}`}</div>
          </div>
        </td>
        <td width="50%" style="padding-left:6px;vertical-align:top">
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:9px 12px">
            <div style="font-family:${POLICE};font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Pièces couvertes</div>
            <div style="font-family:${POLICE};font-size:12px;color:${color};font-weight:700;line-height:1.4">${g.nombrePiecesCouvertes === 'TOUT SAUF' ? 'Garantie TOUT SAUF — toutes pièces hors exclusions du carnet' : h(g.nombrePiecesCouvertes)}</div>
          </div>
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;overflow:hidden">
        <tr bgcolor="${color}" style="background:${color}">
          <th align="left" style="padding:8px 12px;font-family:${POLICE};font-size:11px;color:rgba(255,255,255,0.8);font-weight:600">Durée</th>
          <th align="center" style="padding:8px 12px;font-family:${POLICE};font-size:11px;color:rgba(255,255,255,0.8);font-weight:600">Prix TTC</th>
          <th align="left" style="padding:8px 12px;font-family:${POLICE};font-size:11px;color:rgba(255,255,255,0.8);font-weight:600">Plafond</th>
        </tr>
        ${ligne('6', false)}${ligne('12', true)}${ligne('24', false)}
      </table>
      <p style="margin:6px 0 10px;font-family:${POLICE};font-size:10px;color:#9ca3af;text-align:right">Prix TTC — taxe d'assurance incluse — réglé par le garage à la souscription</p>
      <p style="margin:0;font-family:${POLICE};font-size:11px;line-height:17px;color:#4b5563"><strong style="color:#1a1a2e">Organes couverts :</strong> ${g.organes.map(h).join(' · ')}</p>
    </td></tr>
  </table>`;
}

// ── E-mail garage ─────────────────────────────────────────────────────────────

function blocVehicule(devis: Devis): string {
  const caract = [
    devis.is_4x4 && '4x4 / SUV',
    devis.is_plus_14cv && '> 14 CV fiscaux',
    devis.is_plus_2t3 && 'PTAC 2,3–3,5 t',
  ].filter(Boolean) as string[];
  const ligne = (l: string, v: string) =>
    `<tr><td style="font-family:${POLICE};font-size:12px;color:#9ca3af;padding:3px 0;width:46%">${l}</td><td style="font-family:${POLICE};font-size:12px;color:#1a1a2e;font-weight:600">${v}</td></tr>`;
  return `
    <p style="margin:0 0 10px;font-family:${POLICE};font-size:13px;font-weight:700;color:#1a1a2e;border-bottom:1px solid #f3f4f6;padding-bottom:8px">Véhicule</p>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
      ${devis.plaque ? ligne('Immatriculation', `<span style="font-family:monospace;letter-spacing:1px">${h(devis.plaque)}</span>`) : ''}
      ${ligne('Marque / modèle', `${h(devis.marque)} ${h(devis.modele)}`)}
      ${devis.version ? ligne('Version', h(devis.version)) : ''}
      ${ligne('1ère mise en circ.', formatDateFr(devis.date_mise_en_circulation))}
      ${ligne('Kilométrage', formatKm(devis.kilometrage))}
      ${ligne('Énergie', h(libelleEnergie(devis.energie)))}
      ${devis.valeur_neuf_euros ? ligne('Prix à neuf', `${devis.valeur_neuf_euros.toLocaleString('fr-FR')} €`) : ''}
      ${devis.puissance_fiscale ? ligne('Puissance fiscale', `${devis.puissance_fiscale} CV`) : ''}
    </table>
    ${caract.length ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #f3f4f6">${caract.map(c => `<span style="display:inline-block;background:#EDE9FE;color:${BRAND};font-family:${POLICE};font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;margin:2px 2px 2px 0">${c}</span>`).join('')}</div>` : ''}`;
}

export function lienInscription(devis: Pick<Devis, 'nom_garage' | 'nom_contact' | 'email' | 'telephone'>): string {
  const p = new URLSearchParams({
    nom_garage: devis.nom_garage,
    nom_dirigeant: devis.nom_contact,
    email: devis.email,
    telephone: devis.telephone,
  });
  return `${baseUrl()}/inscription?${p.toString()}`;
}

const emailGarageHTML = (devis: Devis, garanties: GarantieProposee[]) => {
  const base = baseUrl();
  const inscription = lienInscription(devis);
  const trackCarnet = `${base}/api/track-doc?d=${encodeURIComponent(devis.id)}&doc=carnet`;
  const badges = AVANTAGES_PLUS.map((label, i) => [label, i % 2 === 0] as const);
  const rows: (readonly [string, boolean])[][] = [];
  for (let i = 0; i < badges.length; i += 3) rows.push(badges.slice(i, i + 3));

  const corps = `
    <p style="margin:0 0 6px;font-family:${POLICE};font-size:15px;font-weight:600;color:#1a1a2e">Bonjour ${h(devis.nom_contact)},</p>
    <p style="margin:0 0 18px;font-family:${POLICE};font-size:13px;line-height:1.6;color:#4b5563">
      Voici les garanties Garantie Plus disponibles pour ce véhicule, aux conditions que vous retrouverez dans le
      <strong>carnet de garantie 2026</strong> remis à vos clients. Le <strong>devis détaillé (PDF)</strong>, le carnet et notre plaquette sont joints à cet e-mail.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px"><tr>
      <td width="55%" style="padding-right:8px;vertical-align:top">
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">${blocVehicule(devis)}</div>
      </td>
      <td width="45%" style="padding-left:8px;vertical-align:top">
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">
          <p style="margin:0 0 10px;font-family:${POLICE};font-size:13px;font-weight:700;color:#1a1a2e;border-bottom:1px solid #f3f4f6;padding-bottom:8px">Garage</p>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
            <tr><td style="font-family:${POLICE};font-size:12px;color:#9ca3af;padding:3px 0;width:40%">Garage</td><td style="font-family:${POLICE};font-size:12px;color:#1a1a2e;font-weight:600">${h(devis.nom_garage)}</td></tr>
            <tr><td style="font-family:${POLICE};font-size:12px;color:#9ca3af;padding:3px 0">Contact</td><td style="font-family:${POLICE};font-size:12px;color:#1a1a2e">${h(devis.nom_contact)}</td></tr>
            <tr><td style="font-family:${POLICE};font-size:12px;color:#9ca3af;padding:3px 0">E-mail</td><td style="font-family:${POLICE};font-size:12px"><a href="mailto:${h(devis.email)}" style="color:${BRAND};text-decoration:none">${h(devis.email)}</a></td></tr>
            <tr><td style="font-family:${POLICE};font-size:12px;color:#9ca3af;padding:3px 0">Téléphone</td><td style="font-family:${POLICE};font-size:12px;color:#1a1a2e">${h(devis.telephone)}</td></tr>
          </table>
        </div>
      </td>
    </tr></table>

    ${garanties.length === 0 ? `
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:18px;font-family:${POLICE};font-size:13px;line-height:1.6;color:#DC2626;margin-bottom:20px">
      Ce véhicule n'entre pas dans les bornes de la garantie (20 ans et 200 000 km au plus ; 10 ans pour un véhicule électrique ou hybride rechargeable).
      Parlons-en : <a href="mailto:${CONTACT}" style="color:#DC2626">${CONTACT}</a> — ${TEL}.
    </div>` : `
    <p style="margin:0 0 12px;font-family:${POLICE};font-size:13px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.5px">Garanties proposées</p>
    ${garanties.map((g, i) => carteGarantie(g, i === 0)).join('')}
    `}

    <!-- Documents -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px"><tr>
      <td style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;background:#F9FAFB">
        <p style="margin:0 0 8px;font-family:${POLICE};font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Documents joints</p>
        <p style="margin:0;font-family:${POLICE};font-size:12px;line-height:1.7;color:#374151">
          📄 <strong>Devis détaillé</strong> (PDF) &nbsp;·&nbsp;
          📘 <a href="${trackCarnet}" style="color:${BRAND};font-weight:700;text-decoration:none">Carnet de garantie 2026</a> — le document contractuel remis à vos clients, commun à toutes les formules &nbsp;·&nbsp;
          📎 <strong>Plaquette Garantie Plus</strong>
        </p>
      </td>
    </tr></table>

    <!-- CTA partenaire -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px"><tr>
      <td align="center" style="padding:20px;border:1px solid #e5e7eb;border-radius:12px;background:#F8F6FC">
        <p style="margin:0 0 4px;font-family:${POLICE};font-size:14px;font-weight:700;color:#1a1a2e">Proposez ces garanties à vos clients dès demain</p>
        <p style="margin:0 0 14px;font-family:${POLICE};font-size:12px;line-height:1.6;color:#6b7280">
          Devenez partenaire Garantie Plus : souscription en ligne depuis votre espace garage, carnet de garantie remis au client,
          sinistres gérés par notre plateau technique. Vos coordonnées sont déjà pré-remplies.
        </p>
        <a href="${inscription}" style="display:inline-block;background:${BRAND};background-image:${GRADIENT};color:#ffffff;padding:12px 26px;border-radius:8px;text-decoration:none;font-family:${POLICE};font-weight:700;font-size:13px">Devenir partenaire Garantie Plus &rarr;</a>
      </td>
    </tr></table>

    <!-- Les + -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;overflow:hidden;margin-bottom:8px">
      <tr><td bgcolor="${BRAND}" align="center" style="background:${BRAND};background-image:${GRADIENT};padding:12px 20px">
        <p style="margin:0;font-family:${POLICE};color:#ffffff;font-size:14px;font-weight:800;letter-spacing:1px;text-transform:uppercase">Les + de Garantie Plus</p>
        <p style="margin:2px 0 0;font-family:${POLICE};color:rgba(255,255,255,0.75);font-size:11px">Ce que vous ne trouvez nulle part ailleurs</p>
      </td></tr>
      <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:14px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px"><tr>
          <td width="50%" style="padding-right:6px;vertical-align:top">
            <div style="border-left:3px solid ${BRAND};padding:9px 12px;background:#F9FAFB">
              <p style="margin:0 0 3px;font-family:${POLICE};color:${BRAND};font-size:12px;font-weight:700">Plafond PAR intervention</p>
              <p style="margin:0;font-family:${POLICE};color:#6b7280;font-size:11px;line-height:1.5">Le plafond se renouvelle à chaque sinistre — pas d'enveloppe globale qui s'épuise.</p>
            </div>
          </td>
          <td width="50%" style="padding-left:6px;vertical-align:top">
            <div style="border-left:3px solid ${BRAND_CYAN};padding:9px 12px;background:#F9FAFB">
              <p style="margin:0 0 3px;font-family:${POLICE};color:${BRAND};font-size:12px;font-weight:700">Plafond fixe — sans dégressivité</p>
              <p style="margin:0;font-family:${POLICE};color:#6b7280;font-size:11px;line-height:1.5">Le plafond ne diminue jamais, même après 7 ou 10 ans.</p>
            </div>
          </td>
        </tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows.map(row => `<tr>${row.map(([label, primary]) => `<td align="center" style="padding:3px"><span style="display:inline-block;background:${primary ? BRAND : '#ffffff'};color:${primary ? '#ffffff' : BRAND_CYAN};border:2px solid ${primary ? BRAND : BRAND_CYAN};font-family:${POLICE};font-size:11px;font-weight:700;padding:6px 10px;border-radius:20px">${label}</span></td>`).join('')}</tr>`).join('')}
        </table>
      </td></tr>
    </table>

    <p style="margin:16px 0 0;font-family:${POLICE};font-size:13px;line-height:1.6;color:#374151;text-align:center">
      Une question ? Notre équipe vous rappelle sous 24 h — <strong>${TEL}</strong> · <a href="mailto:${CONTACT}" style="color:${BRAND};font-weight:600;text-decoration:none">${CONTACT}</a>
    </p>`;

  return shell(
    'Votre devis Garantie Véhicule d\'Occasion',
    `${devis.marque} ${devis.modele}${devis.plaque ? ` · ${devis.plaque}` : ''} — ${devis.nom_garage}`,
    corps,
    `${garanties.length} garantie${garanties.length > 1 ? 's' : ''} pour ${devis.marque} ${devis.modele} — devis PDF, carnet de garantie 2026 et plaquette en pièces jointes.`
  );
};

// ── E-mail interne ────────────────────────────────────────────────────────────

const emailInterneHTML = (devis: Devis, garanties: GarantieProposee[]) => {
  const ligne = (l: string, v: string) =>
    `<tr><td style="padding:6px 0;font-family:${POLICE};font-size:14px;color:#6b7280;width:150px;vertical-align:top">${l}</td><td style="padding:6px 0;font-family:${POLICE};font-size:14px;color:#1a1a2e">${v}</td></tr>`;
  const corps = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${ligne('Garage', `<strong>${h(devis.nom_garage)}</strong>`)}
      ${ligne('Contact', h(devis.nom_contact))}
      ${ligne('E-mail', `<a href="mailto:${h(devis.email)}" style="color:${BRAND}">${h(devis.email)}</a>`)}
      ${ligne('Téléphone', `<a href="tel:${h(devis.telephone.replace(/\s/g, ''))}" style="color:${BRAND}">${h(devis.telephone)}</a>`)}
      ${ligne('Véhicule', `<strong>${h(devis.marque)} ${h(devis.modele)}${devis.version ? ` ${h(devis.version)}` : ''}</strong>${devis.plaque ? ` — <span style="font-family:monospace">${h(devis.plaque)}</span>` : ''}<br><span style="font-size:12px;color:#6b7280">MEC ${formatDateFr(devis.date_mise_en_circulation)} · ${formatKm(devis.kilometrage)} · ${h(libelleEnergie(devis.energie))} · ${devis.valeur_neuf_euros ? `${devis.valeur_neuf_euros.toLocaleString('fr-FR')} € à neuf` : 'prix à neuf inconnu'} · ${devis.source_vehicule === 'plaque' ? 'retrouvé par la plaque' : 'saisi à la main'}</span>`)}
      ${ligne('Pondération', devis.is_4x4 || devis.is_plus_14cv || devis.is_plus_2t3 ? [devis.is_4x4 && '4x4', devis.is_plus_14cv && '> 14 CV', devis.is_plus_2t3 && 'PTAC 2,3–3,5 t'].filter(Boolean).join(', ') : '—')}
      ${ligne('Garanties', garanties.length ? garanties.map(g => `${h(g.nomCommercial)} — ${formatEuros(g.prixCents['12'])} (12 mois)${g.pondereApplique ? ' ×1,5' : ''}${g.tarifJeune ? ' jeune' : ''}`).join('<br>') : '<span style="color:#DC2626">Aucune éligible</span>')}
    </table>
    <div style="margin-top:20px">
      <a href="${baseUrl()}/admin/devis/${devis.id}" style="display:inline-block;background:${BRAND};color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-family:${POLICE};font-weight:600;font-size:14px">Voir le devis dans le back-office</a>
    </div>`;
  return shell('Nouveau devis reçu', `${devis.nom_garage} — ${devis.marque} ${devis.modele}`, corps);
};

// ── Fonctions d'envoi ─────────────────────────────────────────────────────────

// Lectures bornées à public/ et public/documents/ (chemins statiques : Turbopack ne trace
// alors que ces dossiers, pas tout le projet).
const DOSSIER_PUBLIC = path.join(process.cwd(), 'public');
const DOSSIER_DOCUMENTS = path.join(process.cwd(), 'public', 'documents');

function lireFichier(dossier: string, nom: string): Buffer | null {
  try {
    const p = path.join(dossier, path.basename(nom));
    return fs.existsSync(p) ? fs.readFileSync(p) : null;
  } catch (e) {
    console.error('[Email] Lecture fichier échouée:', nom, e);
    return null;
  }
}

export async function envoyerEmailGarage({
  devis,
  garanties,
}: {
  devis: Devis;
  garanties: GarantieProposee[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await genererPDFDevis(devis, garanties);
      console.log('[Email] PDF généré, taille:', pdfBuffer.length, 'bytes');
    } catch (pdfErr) {
      console.error('[Email] Erreur génération PDF:', pdfErr);
    }

    const safeFilename = `devis-garantieplus-${devis.marque}-${devis.modele}.pdf`
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, '');

    const attachments: PieceJointe[] = [];
    if (pdfBuffer) attachments.push({ filename: safeFilename, content: pdfBuffer });
    else console.warn('[Email] PDF non généré — email envoyé sans devis PDF');

    // Le carnet de garantie 2026 : le document contractuel, commun à toutes les formules.
    const carnet = lireFichier(DOSSIER_DOCUMENTS, CARNET_2026.fichier);
    if (carnet) attachments.push({ filename: CARNET_2026.fichier, content: carnet });
    else console.warn('[Email] Carnet de garantie introuvable — non joint');

    const plaquette = lireFichier(DOSSIER_PUBLIC, 'plaquette.pdf');
    if (plaquette) attachments.push({ filename: 'Plaquette_Garantie_Plus.pdf', content: plaquette });

    const data = await envoyerEmail({
      to: devis.email,
      replyTo: 'devis@garantieplus.fr',
      subject: `Votre devis Garantie Plus — ${devis.marque} ${devis.modele}${devis.plaque ? ` (${devis.plaque})` : ''}`,
      html: emailGarageHTML(devis, garanties),
      attachments,
    });
    console.log('[Brevo] Email garage envoyé, id:', data.id);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Brevo] Exception email garage:', msg);
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
    const data = await envoyerEmail({
      to: process.env.EMAIL_ADMIN || 'contact@garantieplus.fr',
      subject: `Nouveau devis — ${devis.nom_garage} — ${devis.marque} ${devis.modele}${devis.plaque ? ` (${devis.plaque})` : ''}`,
      html: emailInterneHTML(devis, garanties),
    });
    console.log('[Brevo] Email interne envoyé, id:', data.id);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Brevo] Exception email interne:', msg);
    return { success: false, error: msg };
  }
}
