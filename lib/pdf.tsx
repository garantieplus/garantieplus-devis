import React from 'react';
import {
  Document, Page, View, Text, Image, Link,
  Font, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';
import { Devis, GarantieProposee } from '@/types';
import { getRatingChar } from '@/lib/garantieUtils';

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

// ── Helpers ───────────────────────────────────────────────────────────
const fmtPrix = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

const fmtKm = (n: number) => n.toLocaleString('fr-FR') + ' km';

const AVANTAGES = [
  "Main d'oeuvre incluse",
  'Reseau national agree',
  'Pas de franchise kilometrique',
  'Activation immediate',
  'Gestion sinistre directe',
];

// ── Styles adaptatifs (construits à l'intérieur de la fonction) ────────
function buildStyles(n: number) {
  // n = nombre de garanties proposées
  const fScale = n <= 1 ? 1.0 : n === 2 ? 0.9 : 0.8;
  const pScale = n <= 1 ? 1.0 : n === 2 ? 0.8 : 0.65;
  const fs = (base: number) => base * fScale;
  const pd = (base: number) => base * pScale;

  return StyleSheet.create({
    page: { backgroundColor: '#ffffff', fontFamily: 'Inter' },

    // Header
    header:      { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#E8E2F8', paddingVertical: pd(18), paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo:        { height: 70, objectFit: 'contain' },
    headerRight: { alignItems: 'flex-end' },
    headerLabel: { color: '#381893', fontSize: fs(8), letterSpacing: 1, opacity: 0.7 },
    headerDate:  { color: '#381893', fontSize: fs(12), fontWeight: 700 },

    // Body
    body: { paddingTop: pd(16), paddingHorizontal: 40, paddingBottom: 58 },

    // Titre véhicule
    vehicleTitle:    { fontSize: fs(19), fontWeight: 700, color: '#381893', marginBottom: pd(2) },
    vehicleSubtitle: { fontSize: fs(10), color: '#888888', marginBottom: pd(12) },

    // Bloc infos 2 colonnes
    infoRow:   { flexDirection: 'row', marginBottom: pd(12), gap: pd(12) },
    infoCard:  { flex: 1, backgroundColor: '#F8F6FC', borderWidth: 1, borderColor: '#E8E2F8', borderRadius: 8, paddingVertical: pd(9), paddingHorizontal: pd(12) },
    cardTitle: { fontSize: fs(7.5), fontWeight: 700, textTransform: 'uppercase', color: '#7B5EA7', marginBottom: pd(5) },
    infoLine:  { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: '#EDE8F8', paddingVertical: pd(3) },
    infoLabel: { fontSize: fs(9), color: '#888888' },
    infoValue: { fontSize: fs(9), fontWeight: 700, color: '#1A1A2E', maxWidth: '55%' },

    // Titre de section réutilisable
    sectionTitle: { fontSize: fs(8.5), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#381893', borderBottomWidth: 1.5, borderBottomColor: '#381893', paddingBottom: pd(3), marginBottom: pd(7) },

    // Cartes garanties
    garantieCard:    { borderWidth: 1,   borderColor: '#E8E2F8', borderRadius: 8, marginBottom: pd(6), overflow: 'hidden' },
    garantieCardRec: { borderWidth: 1.5, borderColor: '#381893', borderRadius: 8, marginBottom: pd(6), overflow: 'hidden' },
    cardHeaderPlain: { backgroundColor: '#F8F6FC', paddingVertical: pd(7), paddingHorizontal: pd(12), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardHeaderRec:   { backgroundColor: '#381893', paddingVertical: pd(7), paddingHorizontal: pd(12), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLeft:        { flexDirection: 'column' },
    garantieName:    { fontSize: fs(11), fontWeight: 700, color: '#1A1A2E' },
    garantieNameRec: { fontSize: fs(11), fontWeight: 700, color: 'white' },
    starsRow:        { flexDirection: 'row', alignItems: 'center', marginTop: pd(2) },
    star:            { fontSize: fs(9), marginRight: pd(1) },
    recBadge:        { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8, paddingVertical: pd(2), paddingHorizontal: pd(5), marginLeft: pd(6) },
    recBadgeText:    { fontSize: fs(6.5), color: 'white', fontWeight: 700 },
    plafondBadge:    { backgroundColor: '#EDE8F8', borderRadius: 10, paddingVertical: pd(4), paddingHorizontal: pd(7), alignItems: 'center' },
    plafondBadgeRec: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 10, paddingVertical: pd(4), paddingHorizontal: pd(7), alignItems: 'center' },
    plafondLabel:    { fontSize: fs(7), color: '#7B5EA7', opacity: 0.7, marginBottom: pd(1) },
    plafondLabelRec: { fontSize: fs(7), color: 'rgba(255,255,255,0.7)', marginBottom: pd(1) },
    plafondText:     { fontSize: fs(10), color: '#381893', fontWeight: 700 },
    plafondTextRec:  { fontSize: fs(10), color: 'white',   fontWeight: 700 },

    // Grille des prix
    priceGrid:       { flexDirection: 'row' },
    priceCol:        { flex: 1, alignItems: 'center', paddingVertical: pd(7), paddingHorizontal: pd(6), borderRightWidth: 0.5, borderRightColor: '#EDE8F8' },
    priceCol12:      { flex: 1, alignItems: 'center', paddingVertical: pd(7), paddingHorizontal: pd(6), backgroundColor: '#F0ECF9', borderRightWidth: 0.5, borderRightColor: '#EDE8F8' },
    priceDuration:   { fontSize: fs(7.5), color: '#888888', textTransform: 'uppercase', marginBottom: pd(2) },
    priceDuration12: { fontSize: fs(7.5), color: '#381893', fontWeight: 700, textTransform: 'uppercase', marginBottom: pd(2) },
    priceAmount:     { fontSize: fs(12), color: '#555555' },
    priceAmount12:   { fontSize: fs(14), fontWeight: 700, color: '#381893' },
    priceRecLabel:   { fontSize: fs(6.5), color: '#381893', fontWeight: 700, textTransform: 'uppercase', marginTop: pd(2) },

    // Encadrés différenciants
    encadresRow: { flexDirection: 'row', marginTop: pd(9), gap: pd(10) },
    encadre:     { flex: 1, borderLeftWidth: 3, borderLeftColor: '#47b4e1', backgroundColor: '#F0F8FE', paddingVertical: pd(7), paddingHorizontal: pd(10), borderTopRightRadius: 6, borderBottomRightRadius: 6 },
    encadreTitle: { fontSize: fs(8.5), fontWeight: 700, color: '#1A3A6B', marginBottom: pd(2) },
    encadreText:  { fontSize: fs(8), color: '#444444', lineHeight: 1.4 },

    // Avantages communs
    avantagesCard: { backgroundColor: '#F8F6FC', borderWidth: 1, borderColor: '#E8E2F8', borderRadius: 8, paddingVertical: pd(7), paddingHorizontal: pd(12), marginTop: pd(9) },
    avantagesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: pd(2) },
    avantageItem:  { width: '50%', flexDirection: 'row', alignItems: 'center', marginTop: pd(5) },
    checkCircle:   { width: pd(11), height: pd(11), backgroundColor: '#22C55E', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: pd(5) },
    checkText:     { fontSize: fs(6.5), color: 'white', fontWeight: 700 },
    avantageText:  { fontSize: fs(9), color: '#1A1A2E' },

    // Liens CG
    cgSection: { marginTop: pd(9) },
    cgLink:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE8F8', borderWidth: 1, borderColor: '#C5B8ED', borderRadius: 6, paddingVertical: pd(5), paddingHorizontal: pd(10), marginTop: pd(5) },
    cgIcon:    { width: 14, height: 14, backgroundColor: '#381893', borderRadius: 3, alignItems: 'center', justifyContent: 'center', marginRight: pd(7) },
    cgIconText: { fontSize: fs(8), color: 'white', fontWeight: 700 },
    cgText:    { fontSize: fs(10), fontWeight: 700, color: '#381893' },

    // Footer (fixe — position absolute)
    footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1A1A2E', paddingVertical: 8, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerText:    { fontSize: 7, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 },
    footerContact: { fontSize: 7, color: 'rgba(255,255,255,0.6)', textAlign: 'right', lineHeight: 1.4 },
  });
}

// ══════════════════════════════════════════════════════════════════════
export async function genererPDFDevis(devis: Devis, garanties: GarantieProposee[]): Promise<Buffer> {

  const sorted = [...garanties].sort((a, b) => b.niveau - a.niveau);
  const S = buildStyles(sorted.length);

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis.garantieplus.fr';
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  const logoExists = fs.existsSync(logoPath);

  const dateStr = new Date(devis.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const trackUrl = (g: GarantieProposee) =>
    `${BASE_URL}/api/track-cg?d=${encodeURIComponent(devis.id)}&cg=${encodeURIComponent(g.fichierCG)}&nom=${encodeURIComponent(g.nomCommercial)}`;

  const infoRows = (rows: [string, string][]) =>
    rows.map(([lbl, val], i, arr) => (
      <View key={i} style={[S.infoLine, i === arr.length - 1 ? { borderBottomWidth: 0 } : {}]}>
        <Text style={S.infoLabel}>{lbl}</Text>
        <Text style={S.infoValue}>{val}</Text>
      </View>
    ));

  const doc = (
    <Document title={`Devis - ${devis.marque} ${devis.modele}`} author="Garantie Plus">
      <Page size="A4" style={S.page}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <View style={S.header}>
          {logoExists
            ? <Image src={logoPath} style={S.logo} />
            : <Text style={{ color: '#381893', fontSize: 14, fontWeight: 700 }}>GARANTIE PLUS</Text>}
          <View style={S.headerRight}>
            <Text style={S.headerLabel}>DEVIS PERSONNALISE</Text>
            <Text style={S.headerDate}>{dateStr}</Text>
          </View>
        </View>

        {/* ── BODY ──────────────────────────────────────────────────── */}
        <View style={S.body}>

          {/* 1. Titre véhicule */}
          <Text style={S.vehicleTitle}>{devis.marque} {devis.modele}</Text>
          <Text style={S.vehicleSubtitle}>
            Devis etabli pour {devis.nom_garage} · {devis.nom_contact}
          </Text>

          {/* 2. Bloc infos */}
          <View style={S.infoRow}>
            <View style={S.infoCard}>
              <Text style={S.cardTitle}>VEHICULE</Text>
              {infoRows([
                ['Marque',              devis.marque],
                ['Modele',              devis.modele],
                ['Mise en circulation', devis.date_mise_en_circulation],
                ['Kilométrage',         fmtKm(devis.kilometrage)],
              ])}
            </View>
            <View style={S.infoCard}>
              <Text style={S.cardTitle}>GARAGE</Text>
              {infoRows([
                ['Etablissement', devis.nom_garage],
                ['Contact',       devis.nom_contact],
                ['Email',         devis.email],
                ['Telephone',     devis.telephone],
              ])}
            </View>
          </View>

          {/* 3. Garanties */}
          <Text style={S.sectionTitle}>GARANTIES PROPOSEES</Text>

          {sorted.map((g, idx) => {
            const isRec = idx === 0;
            return (
              <View key={idx} style={isRec ? S.garantieCardRec : S.garantieCard}>
                {/* Header carte */}
                <View style={isRec ? S.cardHeaderRec : S.cardHeaderPlain}>
                  <View style={S.cardLeft}>
                    <Text style={isRec ? S.garantieNameRec : S.garantieName}>
                      {g.nomCommercial}
                    </Text>
                    <View style={S.starsRow}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Text key={i} style={[S.star, { color: i < g.niveau ? (g.gamme === 'eco' ? '#2E7D4F' : '#F5A623') : '#cccccc' }]}>
                          {getRatingChar(g.gamme)}
                        </Text>
                      ))}
                      {isRec && (
                        <View style={S.recBadge}>
                          <Text style={S.recBadgeText}>RECOMMANDE</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={isRec ? S.plafondBadgeRec : S.plafondBadge}>
                    <Text style={isRec ? S.plafondLabelRec : S.plafondLabel}>Plafond / Sinistre</Text>
                    <Text style={isRec ? S.plafondTextRec : S.plafondText}>
                      {g.plafondIntervention}
                    </Text>
                  </View>
                </View>

                {/* Grille des prix */}
                <View style={S.priceGrid}>
                  {(['6', '12', '24'] as const).map((key, ci) => {
                    const is12 = key === '12';
                    const isLast = ci === 2;
                    return (
                      <View key={key} style={[
                        is12 ? S.priceCol12 : S.priceCol,
                        isLast ? { borderRightWidth: 0 } : {},
                      ]}>
                        <Text style={is12 ? S.priceDuration12 : S.priceDuration}>
                          {key} MOIS
                        </Text>
                        <Text style={is12 ? S.priceAmount12 : S.priceAmount}>
                          {fmtPrix(g.prixFinal[key])}
                        </Text>
                        {is12 && <Text style={S.priceRecLabel}>RECOMMANDE</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* 4. Encadrés différenciants */}
          <View style={S.encadresRow}>
            <View style={S.encadre}>
              <Text style={S.encadreTitle}>Plafond par intervention</Text>
              <Text style={S.encadreText}>
                Le plafond se renouvelle a chaque sinistre — pas d&apos;enveloppe globale qui s&apos;epuise.
              </Text>
            </View>
            <View style={S.encadre}>
              <Text style={S.encadreTitle}>Plafond sans degressivite</Text>
              <Text style={S.encadreText}>
                Votre plafond reste identique meme apres 7 ou 10 ans, quelle que soit l&apos;anciennete du vehicule.
              </Text>
            </View>
          </View>

          {/* 5. Avantages communs */}
          <View style={S.avantagesCard}>
            <Text style={S.sectionTitle}>AVANTAGES COMMUNS</Text>
            <View style={S.avantagesGrid}>
              {AVANTAGES.map((av, i) => (
                <View key={i} style={S.avantageItem}>
                  <View style={S.checkCircle}>
                    <Text style={S.checkText}>✓</Text>
                  </View>
                  <Text style={S.avantageText}>{av}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 6. Conditions générales */}
          {sorted.some(g => g.fichierCG) && (
            <View style={S.cgSection}>
              <Text style={S.sectionTitle}>TELECHARGER LES CONDITIONS GENERALES</Text>
              {sorted.filter(g => g.fichierCG).map((g, i) => (
                <Link key={i} src={trackUrl(g)} style={{ textDecoration: 'none' }}>
                  <View style={S.cgLink}>
                    <View style={S.cgIcon}>
                      <Text style={S.cgIconText}>↓</Text>
                    </View>
                    <Text style={S.cgText}>CG {g.nomCommercial}</Text>
                  </View>
                </Link>
              ))}
            </View>
          )}

        </View>

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <View style={S.footer}>
          <View>
            <Text style={S.footerText}>Garantie Plus SAS — Capital 10 000 EUR — RCS Paris 943 193 037</Text>
            <Text style={S.footerText}>130 rue de Courcelles, 75017 Paris — ORIAS n°25004236</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.footerContact}>contact@garantieplus.fr</Text>
            <Text style={S.footerContact}>sinistre@garantieplus.fr</Text>
          </View>
        </View>

      </Page>
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return Buffer.from(buf);
}
