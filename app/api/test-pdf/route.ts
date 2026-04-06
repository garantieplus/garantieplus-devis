import { NextResponse } from 'next/server';
import { genererPDFDevis } from '@/lib/pdf';
import { Devis, GarantieProposee } from '@/types';

// Route de test uniquement — génère un PDF de démonstration téléchargeable
// Accès : GET /api/test-pdf
export async function GET() {
  try {
    const devisTest: Devis = {
      id: 'test-000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      marque: 'Peugeot',
      modele: '308',
      date_mise_en_circulation: '2021-06-01',
      kilometrage: 65000,
      is_4x4: false,
      is_plus_2t3: false,
      is_plus_14cv: false,
      is_hybride_electrique: false,
      valeur_neuf_55k: false,
      valeur_neuf_100k: false,
      valeur_neuf_150k: false,
      nom_contact: 'Jean Dupont',
      nom_garage: 'Garage Dupont Auto',
      email: 'jean@garagedupont.fr',
      telephone: '06 12 34 56 78',
      garanties_proposees: [],
      statut: 'nouveau',
      notes_commerciales: null,
      commercial_assigne: null,
      ip_address: null,
      user_agent: null,
    };

    const garantiesTest: GarantieProposee[] = [
      {
        gamme: 'classique',
        niveau: 5,
        nomCommercial: 'Garantie Classique 5 Etoiles',
        etoilesAffichage: '⭐⭐⭐⭐⭐',
        ageMaxAns: 6,
        kmMax: 120000,
        plafondIntervention: 'VRADE',
        nombrePiecesCouvertes: '+300 pièces',
        prixBase: { '6': 309, '12': 399, '24': 699 },
        prixFinal: { '6': 309, '12': 399, '24': 699 },
        pondereApplique: false,
        avantagesCommuns: [],
        avantagesSpecifiques: ['Garantie TOUT SAUF'],
        fichierCG: '/cg/CG_Classique_5etoiles.pdf',
      },
      {
        gamme: 'classique',
        niveau: 4,
        nomCommercial: 'Garantie Classique 4 Etoiles',
        etoilesAffichage: '⭐⭐⭐⭐',
        ageMaxAns: 10,
        kmMax: 150000,
        plafondIntervention: '10 000€',
        nombrePiecesCouvertes: '+120 pièces',
        prixBase: { '6': 299, '12': 389, '24': 689 },
        prixFinal: { '6': 299, '12': 389, '24': 689 },
        pondereApplique: false,
        avantagesCommuns: [],
        avantagesSpecifiques: [],
        fichierCG: '/cg/CG_Classique_4etoiles.pdf',
      },
    ];

    const pdfBuffer = await genererPDFDevis(devisTest, garantiesTest);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test-devis-garantieplus.pdf"',
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[test-pdf] Erreur:', msg, err);
    return NextResponse.json({ error: msg, stack: err instanceof Error ? err.stack : '' }, { status: 500 });
  }
}
