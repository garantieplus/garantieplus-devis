import React from 'react';
import {
  Document, Page, View, Text, Image, Link,
  Font, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';
import type { Devis, Duree, GarantieProposee } from '@/types';
import { libelleEnergie } from '@/types';
import { formatDateFr, formatEuros, formatKm } from '@/lib/format';

// ── Polices ───────────────────────────────────────────────────────────
try {
  Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf'), fontWeight: 400 },
      { src: path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf'),    fontWeight: 700 },
    ],
  });
} catch { /* fallback Helvetica */ }

const BRAND = '#381893';
const NAVY = '#1A1A2E';
const ECO = '#166534';

const couleur = (g: GarantieProposee) => (g.gamme === 'eco' ? ECO : g.gamme === 'luxe' ? NAVY : BRAND);
const libelleGamme = (g: GarantieProposee) => (g.gamme === 'eco' ? 'ECO' : g.gamme === 'luxe' ? 'LUXE' : 'CLASSIQUE');

const AVANTAGES = [
  'Pas de vétusté appliquée',
  'Pas de franchise',
  'Pas de carence',
  "Pas d'avance de frais",
  'Cessible gratuitement',
  'Kilométrage illimité',
  'Couverture européenne',
  '100 % digital',
];

// ── Styles adaptatifs (n = nombre de garanties) ────────────────────────
function buildStyles(n: number) {
  const fScale = n <= 1 ? 1.0 : n === 2 ? 0.92 : n === 3 ? 0.84 : 0.78;
  const pScale = n <= 1 ? 1.0 : n === 2 ? 0.85 : n === 3 ? 0.7 : 0.6;
  const fs = (base: number) => base * fScale;
  const pd = (base: number) => base * pScale;

  return StyleSheet.create({
    page: { backgroundColor: '#ffffff', fontFamily: 'Inter', paddingBottom: 56 },

    header:      { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#E8E2F8', paddingVertical: pd(16), paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo:        { height: 60, objectFit: 'contain' },
    headerRight: { alignItems: 'flex-end' },
    headerLabel: { color: BRAND, fontSize: fs(8), letterSpacing: 1, opacity: 0.7 },
    headerDate:  { color: BRAND, fontSize: fs(12), fontWeight: 700 },

    contactBadge: { alignSelf: 'center', marginVertical: pd(8), backgroundColor: '#EDE8F8', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 6 },
    contactText:  { fontSize: fs(9.5), fontWeight: 700, color: BRAND },

    body: { paddingTop: pd(8), paddingHorizontal: 40 },

    vehicleTitle:    { fontSize: fs(18), fontWeight: 700, color: BRAND, marginBottom: pd(2) },
    vehicleSubtitle: { fontSize: fs(9.5), color: '#888888', marginBottom: pd(10) },
    plaque:          { backgroundColor: NAVY, color: 'white', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, fontSize: fs(11), fontWeight: 700, letterSpacing: 1.5, alignSelf: 'flex-start', marginBottom: pd(6) },

    infoRow:   { flexDirection: 'row', marginBottom: pd(10), gap: pd(12) },
    infoCard:  { flex: 1, backgroundColor: '#F8F6FC', borderWidth: 1, borderColor: '#E8E2F8', borderRadius: 8, paddingVertical: pd(8), paddingHorizontal: pd(12) },
    cardTitle: { fontSize: fs(7.5), fontWeight: 700, textTransform: 'uppercase', color: '#7B5EA7', marginBottom: pd(4) },
    infoLine:  { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: '#EDE8F8', paddingVertical: pd(2.5) },
    infoLabel: { fontSize: fs(8.5), color: '#888888' },
    infoValue: { fontSize: fs(8.5), fontWeight: 700, color: NAVY, maxWidth: '58%', textAlign: 'right' },

    sectionTitle: { fontSize: fs(8.5), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: BRAND, borderBottomWidth: 1.5, borderBottomColor: BRAND, paddingBottom: pd(3), marginBottom: pd(7), marginTop: pd(4) },

    card:        { borderWidth: 1, borderColor: '#E8E2F8', borderRadius: 8, marginBottom: pd(6), overflow: 'hidden' },
    cardHeader:  { paddingVertical: pd(6), paddingHorizontal: pd(12), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLeft:    { flexDirection: 'column', flex: 1 },
    gammeLabel:  { fontSize: fs(6.5), color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: pd(1) },
    garantieName:{ fontSize: fs(11), fontWeight: 700, color: 'white' },
    starsRow:    { flexDirection: 'row', alignItems: 'center', marginTop: pd(2) },
    star:        { fontSize: fs(9), marginRight: pd(1) },
    chip:        { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8, paddingVertical: pd(2), paddingHorizontal: pd(5), marginLeft: pd(6) },
    chipText:    { fontSize: fs(6.5), color: 'white', fontWeight: 700 },
    recoBadge:   { backgroundColor: '#F5A623', borderRadius: 8, paddingVertical: pd(2), paddingHorizontal: pd(6), marginLeft: pd(6) },
    cardRight:   { alignItems: 'flex-end', gap: pd(3) },
    eligBadge:   { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 10, paddingVertical: pd(3), paddingHorizontal: pd(7) },
    eligText:    { fontSize: fs(7.5), color: 'white', fontWeight: 700 },

    bande:       { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#EDE8F8' },
    bandeCell:   { flex: 1, paddingVertical: pd(5), paddingHorizontal: pd(10), borderRightWidth: 0.5, borderRightColor: '#EDE8F8' },
    bandeLabel:  { fontSize: fs(6.5), color: '#888888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: pd(1) },
    bandeValue:  { fontSize: fs(9), fontWeight: 700 },

    priceGrid:       { flexDirection: 'row' },
    priceCol:        { flex: 1, alignItems: 'center', paddingVertical: pd(6), paddingHorizontal: pd(6), borderRightWidth: 0.5, borderRightColor: '#EDE8F8' },
    priceCol12:      { flex: 1, alignItems: 'center', paddingVertical: pd(6), paddingHorizontal: pd(6), backgroundColor: '#F0ECF9', borderRightWidth: 0.5, borderRightColor: '#EDE8F8' },
    priceDuration:   { fontSize: fs(7.5), color: '#888888', textTransform: 'uppercase', marginBottom: pd(2) },
    priceDuration12: { fontSize: fs(7.5), color: BRAND, fontWeight: 700, textTransform: 'uppercase', marginBottom: pd(2) },
    priceAmount:     { fontSize: fs(12), color: '#555555' },
    priceAmount12:   { fontSize: fs(14), fontWeight: 700, color: BRAND },
    pricePlafond:    { fontSize: fs(6.5), color: '#888888', marginTop: pd(2) },
    priceRecLabel:   { fontSize: fs(6.5), color: BRAND, fontWeight: 700, textTransform: 'uppercase', marginTop: pd(2) },
    ttcNote:         { fontSize: fs(6.5), color: '#999999', textAlign: 'right', paddingHorizontal: pd(10), paddingVertical: pd(3) },

    encadresRow:  { flexDirection: 'row', marginTop: pd(8), gap: pd(10) },
    encadre:      { flex: 1, borderLeftWidth: 3, borderLeftColor: '#47b4e1', backgroundColor: '#F0F8FE', paddingVertical: pd(6), paddingHorizontal: pd(10), borderTopRightRadius: 6, borderBottomRightRadius: 6 },
    encadreTitle: { fontSize: fs(8.5), fontWeight: 700, color: '#1A3A6B', marginBottom: pd(2) },
    encadreText:  { fontSize: fs(8), color: '#444444', lineHeight: 1.4 },

    avantagesCard: { backgroundColor: '#F8F6FC', borderWidth: 1, borderColor: '#E8E2F8', borderRadius: 8, paddingVertical: pd(6), paddingHorizontal: pd(12), marginTop: pd(8) },
    avantagesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: pd(2) },
    avantageItem:  { width: '50%', flexDirection: 'row', alignItems: 'center', marginTop: pd(4) },
    checkCircle:   { width: 10, height: 10, backgroundColor: '#22C55E', borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginRight: pd(5) },
    checkText:     { fontSize: 6.5, color: 'white', fontWeight: 700 },
    avantageText:  { fontSize: fs(8.5), color: NAVY },

    docSection: { marginTop: pd(8) },
    docLink:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE8F8', borderWidth: 1, borderColor: '#C5B8ED', borderRadius: 6, paddingVertical: pd(5), paddingHorizontal: pd(10), marginTop: pd(4) },
    docIcon:    { width: 14, height: 14, backgroundColor: BRAND, borderRadius: 3, alignItems: 'center', justifyContent: 'center', marginRight: pd(7) },
    docIconText:{ fontSize: 8, color: 'white', fontWeight: 700 },
    docText:    { fontSize: fs(9.5), fontWeight: 700, color: BRAND },
    docSub:     { fontSize: fs(7.5), color: '#666666', marginTop: pd(2) },

    cta:        { marginTop: pd(10), borderWidth: 1, borderColor: '#C5B8ED', borderRadius: 8, padding: pd(10), alignItems: 'center', backgroundColor: '#FBFAFE' },
    ctaTitle:   { fontSize: fs(10), fontWeight: 700, color: NAVY, marginBottom: pd(2) },
    ctaText:    { fontSize: fs(8), color: '#555555', textAlign: 'center', lineHeight: 1.4, marginBottom: pd(5) },
    ctaButton:  { backgroundColor: BRAND, borderRadius: 6, paddingVertical: pd(6), paddingHorizontal: pd(16) },
    ctaButtonText: { fontSize: fs(9), color: 'white', fontWeight: 700 },

    // Page organes
    organesCard:  { borderWidth: 1, borderColor: '#E8E2F8', borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
    organesHead:  { paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    organesTitle: { fontSize: 10, fontWeight: 700, color: 'white' },
    organesSub:   { fontSize: 7.5, color: 'rgba(255,255,255,0.8)' },
    organesGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 6, paddingHorizontal: 12 },
    organeItem:   { width: '33.33%', flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
    organeText:   { fontSize: 8, color: NAVY },

    footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, backgroundColor: NAVY, paddingVertical: 8, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerText:    { fontSize: 7, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 },
    footerContact: { fontSize: 7, color: 'rgba(255,255,255,0.6)', textAlign: 'right', lineHeight: 1.4 },
  });
}

// ══════════════════════════════════════════════════════════════════════
export async function genererPDFDevis(devis: Devis, garanties: GarantieProposee[]): Promise<Buffer> {
  const S = buildStyles(garanties.length);

  const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis.garantieplus.fr').replace(/\/+$/, '');
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  const logoExists = fs.existsSync(logoPath);

  const dateStr = new Date(devis.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const trackUrl = (doc: 'carnet' | 'plaquette') => `${BASE_URL}/api/track-doc?d=${encodeURIComponent(devis.id)}&doc=${doc}`;
  const inscriptionUrl = `${BASE_URL}/inscription?${new URLSearchParams({ nom_garage: devis.nom_garage, nom_dirigeant: devis.nom_contact, email: devis.email, telephone: devis.telephone }).toString()}`;

  const infoRows = (rows: [string, string][]) =>
    rows.map(([lbl, val], i, arr) => (
      <View key={i} style={[S.infoLine, i === arr.length - 1 ? { borderBottomWidth: 0 } : {}]}>
        <Text style={S.infoLabel}>{lbl}</Text>
        <Text style={S.infoValue}>{val}</Text>
      </View>
    ));

  const caract = devis.is_4x4 ? '4x4 / SUV' : '';

  const Footer = () => (
    <View style={S.footer} fixed>
      <View>
        <Text style={S.footerText}>Garantie Plus SAS — Capital 10 000 EUR — RCS Paris 943 193 037</Text>
        <Text style={S.footerText}>130 rue de Courcelles, 75017 Paris — ORIAS n°25004236 — Courtier en assurance</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={S.footerContact}>01 84 18 08 08 — contact@garantieplus.fr</Text>
        <Text style={S.footerContact} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </View>
  );

  const doc = (
    <Document title={`Devis Garantie Plus - ${devis.marque} ${devis.modele}`} author="Garantie Plus">
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          {logoExists
            ? <Image src={logoPath} style={S.logo} />
            : <Text style={{ color: BRAND, fontSize: 14, fontWeight: 700 }}>GARANTIE PLUS</Text>}
          <View style={S.headerRight}>
            <Text style={S.headerLabel}>DEVIS GARANTIE VEHICULE D&apos;OCCASION</Text>
            <Text style={S.headerDate}>{dateStr}</Text>
          </View>
        </View>

        <View style={S.contactBadge}>
          <Text style={S.contactText}>01 84 18 08 08   |   contact@garantieplus.fr</Text>
        </View>

        <View style={S.body}>
          {devis.plaque && <Text style={S.plaque}>{devis.plaque}</Text>}
          <Text style={S.vehicleTitle}>{devis.marque} {devis.modele}{devis.version ? ` ${devis.version}` : ''}</Text>
          <Text style={S.vehicleSubtitle}>Devis établi pour {devis.nom_garage} · {devis.nom_contact}</Text>

          <View style={S.infoRow}>
            <View style={S.infoCard}>
              <Text style={S.cardTitle}>VÉHICULE</Text>
              {infoRows([
                ['Mise en circulation', formatDateFr(devis.date_mise_en_circulation)],
                ['Kilométrage', formatKm(devis.kilometrage)],
                ['Énergie', libelleEnergie(devis.energie)],
                ['Prix à neuf', devis.valeur_neuf_euros ? `${devis.valeur_neuf_euros.toLocaleString('fr-FR')} €` : '—'],
                ...(devis.puissance_fiscale ? [['Puissance fiscale', `${devis.puissance_fiscale} CV`] as [string, string]] : []),
                ...(caract ? [['Caractéristiques', caract] as [string, string]] : []),
              ])}
            </View>
            <View style={S.infoCard}>
              <Text style={S.cardTitle}>GARAGE</Text>
              {infoRows([
                ['Établissement', devis.nom_garage],
                ['Contact', devis.nom_contact],
                ['E-mail', devis.email],
                ['Téléphone', devis.telephone],
              ])}
            </View>
          </View>

          <Text style={S.sectionTitle}>GARANTIES PROPOSÉES</Text>

          {garanties.length === 0 && (
            <View style={[S.encadre, { borderLeftColor: '#DC2626', backgroundColor: '#FEF2F2' }]}>
              <Text style={[S.encadreTitle, { color: '#DC2626' }]}>Véhicule hors des bornes de la garantie</Text>
              <Text style={S.encadreText}>20 ans et 200 000 km au plus (10 ans pour un véhicule électrique ou hybride rechargeable). Contactez-nous pour étudier une solution.</Text>
            </View>
          )}

          {garanties.map((g, idx) => {
            const c = couleur(g);
            const plafond = (d: Duree) => (g.plafondParDuree ? g.plafondParDuree[d] : g.plafondIntervention);
            return (
              <View key={g.code} style={[S.card, { borderColor: c }]} wrap={false}>
                <View style={[S.cardHeader, { backgroundColor: c }]}>
                  <View style={S.cardLeft}>
                    <Text style={S.gammeLabel}>Gamme {libelleGamme(g)}{g.segment === 'luxe_gt150' ? ' · valeur à neuf > 150 000 €' : ''}</Text>
                    <Text style={S.garantieName}>{g.nomCommercial}</Text>
                    <View style={S.starsRow}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Text key={i} style={[S.star, { color: i < g.niveau ? (g.gamme === 'eco' ? '#10D96E' : '#F5A623') : 'rgba(255,255,255,0.3)' }]}>★</Text>
                      ))}
                      {idx === 0 && <View style={S.recoBadge}><Text style={S.chipText}>RECOMMANDÉ</Text></View>}
                      {g.pondereApplique && <View style={S.chip}><Text style={S.chipText}>PONDÉRÉ ×1,5</Text></View>}
                      {g.tarifJeune && <View style={S.chip}><Text style={S.chipText}>TARIF JEUNE</Text></View>}
                    </View>
                  </View>
                  <View style={S.cardRight}>
                    <View style={S.eligBadge}>
                      <Text style={S.eligText}>{`< ${g.ageMaxAns} ans${g.kmMax != null ? ` / ${g.kmMax.toLocaleString('fr-FR')} km` : ''}`}</Text>
                    </View>
                  </View>
                </View>

                <View style={S.bande}>
                  <View style={S.bandeCell}>
                    <Text style={S.bandeLabel}>Plafond par intervention</Text>
                    <Text style={[S.bandeValue, { color: c }]}>
                      {g.plafondParDuree ? `${g.plafondParDuree['6']} (6 mois) · ${g.plafondParDuree['12']} (12 mois) · ${g.plafondParDuree['24']} (24 mois)` : g.plafondIntervention === 'VRADE' ? 'VRADE (valeur de remplacement du véhicule)' : g.plafondIntervention}
                    </Text>
                  </View>
                  <View style={[S.bandeCell, { borderRightWidth: 0 }]}>
                    <Text style={S.bandeLabel}>Pièces couvertes</Text>
                    <Text style={[S.bandeValue, { color: c }]}>{g.nombrePiecesCouvertes === 'TOUT SAUF' ? 'TOUT SAUF (hors exclusions du carnet)' : g.nombrePiecesCouvertes}</Text>
                  </View>
                </View>

                <View style={S.priceGrid}>
                  {(['6', '12', '24'] as const).map((key, ci) => {
                    const is12 = key === '12';
                    return (
                      <View key={key} style={[is12 ? S.priceCol12 : S.priceCol, ci === 2 ? { borderRightWidth: 0 } : {}, is12 && g.gamme === 'eco' ? { backgroundColor: '#f0fdf4' } : {}]}>
                        <Text style={[is12 ? S.priceDuration12 : S.priceDuration, is12 ? { color: c } : {}]}>{key} MOIS</Text>
                        <Text style={[is12 ? S.priceAmount12 : S.priceAmount, is12 ? { color: c } : {}]}>{formatEuros(g.prixCents[key])}</Text>
                        <Text style={S.pricePlafond}>{plafond(key) === 'VRADE' ? 'Jusqu\'à la VRADE' : `Jusqu'à ${plafond(key)}`}</Text>
                        {is12 && <Text style={[S.priceRecLabel, { color: c }]}>RECOMMANDÉ</Text>}
                      </View>
                    );
                  })}
                </View>
                <Text style={S.ttcNote}>Prix TTC, taxe d&apos;assurance incluse — réglé par le garage à la souscription</Text>
              </View>
            );
          })}

          <View style={S.encadresRow}>
            <View style={S.encadre}>
              <Text style={S.encadreTitle}>Plafond par intervention</Text>
              <Text style={S.encadreText}>Le plafond se renouvelle à chaque sinistre — pas d&apos;enveloppe globale qui s&apos;épuise.</Text>
            </View>
            <View style={S.encadre}>
              <Text style={S.encadreTitle}>Plafond sans dégressivité</Text>
              <Text style={S.encadreText}>Le plafond reste identique même après 7 ou 10 ans, quelle que soit l&apos;ancienneté du véhicule.</Text>
            </View>
          </View>

          <View style={S.avantagesCard}>
            <Text style={S.sectionTitle}>AVANTAGES COMMUNS</Text>
            <View style={S.avantagesGrid}>
              {AVANTAGES.map((av, i) => (
                <View key={i} style={S.avantageItem}>
                  <View style={S.checkCircle}><Text style={S.checkText}>✓</Text></View>
                  <Text style={S.avantageText}>{av}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={S.docSection}>
            <Text style={S.sectionTitle}>DOCUMENTS</Text>
            <Link src={trackUrl('carnet')} style={{ textDecoration: 'none' }}>
              <View style={S.docLink}>
                <View style={S.docIcon}><Text style={S.docIconText}>↓</Text></View>
                <View>
                  <Text style={S.docText}>Carnet de garantie 2026 (PDF)</Text>
                  <Text style={S.docSub}>Le document contractuel remis à vos clients — commun à toutes les formules, joint à l&apos;e-mail.</Text>
                </View>
              </View>
            </Link>
            <Link src={trackUrl('plaquette')} style={{ textDecoration: 'none' }}>
              <View style={S.docLink}>
                <View style={S.docIcon}><Text style={S.docIconText}>↓</Text></View>
                <Text style={S.docText}>Plaquette Garantie Plus (PDF)</Text>
              </View>
            </Link>
          </View>

          <Link src={inscriptionUrl} style={{ textDecoration: 'none' }}>
            <View style={S.cta}>
              <Text style={S.ctaTitle}>Proposez ces garanties à vos clients : devenez partenaire Garantie Plus</Text>
              <Text style={S.ctaText}>Souscription en ligne depuis votre espace garage, carnet de garantie remis au client, sinistres gérés par notre plateau technique.</Text>
              <View style={S.ctaButton}><Text style={S.ctaButtonText}>Devenir partenaire →</Text></View>
            </View>
          </Link>
        </View>

        <Footer />
      </Page>

      {garanties.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.header}>
            {logoExists
              ? <Image src={logoPath} style={S.logo} />
              : <Text style={{ color: BRAND, fontSize: 14, fontWeight: 700 }}>GARANTIE PLUS</Text>}
            <View style={S.headerRight}>
              <Text style={S.headerLabel}>ORGANES COUVERTS PAR FORMULE</Text>
              <Text style={S.headerDate}>{devis.marque} {devis.modele}</Text>
            </View>
          </View>
          <View style={[S.body, { paddingTop: 14 }]}>
            {garanties.map(g => {
              const c = couleur(g);
              return (
                <View key={g.code} style={[S.organesCard, { borderColor: c }]} wrap={false}>
                  <View style={[S.organesHead, { backgroundColor: c }]}>
                    <Text style={S.organesTitle}>{g.nomCommercial}</Text>
                    <Text style={S.organesSub}>{g.nombrePiecesCouvertes === 'TOUT SAUF' ? 'Garantie TOUT SAUF — tout est couvert hors exclusions du carnet' : g.nombrePiecesCouvertes} · {g.plafondParDuree ? 'plafond selon durée' : g.plafondIntervention === 'VRADE' ? 'plafond VRADE' : `plafond ${g.plafondIntervention}`}</Text>
                  </View>
                  <View style={S.organesGrid}>
                    {g.organes.map(o => (
                      <View key={o} style={S.organeItem}>
                        <View style={[S.checkCircle, { backgroundColor: c }]}><Text style={S.checkText}>✓</Text></View>
                        <Text style={S.organeText}>{o}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
            <Text style={[S.encadreText, { marginTop: 6, color: '#666666' }]}>
              Les conditions, exclusions et modalités de mise en œuvre sont celles du Carnet de Garantie 2026, qui fait foi. Plateau technique : 01 84 18 08 08 — sinistre@garantieplus.fr.
            </Text>
          </View>
          <Footer />
        </Page>
      )}
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return Buffer.from(buf);
}
