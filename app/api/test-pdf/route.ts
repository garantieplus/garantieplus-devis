import { NextResponse } from 'next/server';
import { genererPDFDevis } from '@/lib/pdf';
import { calculerOffres, faitsDepuisVehicule } from '@/lib/gvo/offres';
import type { Devis, VehiculeInput } from '@/types';

// Route de test uniquement — génère un PDF de démonstration téléchargeable.
// Accès : GET /api/test-pdf (désactivée en production).
export async function GET() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_PDF) {
    return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  }
  try {
    const vehicule: VehiculeInput = {
      plaque: 'AB-123-CD',
      vin: 'VF3LCYHZPJS123456',
      marque: 'Peugeot',
      modele: '308',
      version: '1.2 PureTech 130 Allure',
      typeMine: '',
      dateMiseEnCirculation: '2021-06-01',
      kilometrage: 65000,
      energie: 'essence',
      valeurNeufEuros: 28500,
      puissanceFiscale: 7,
      is4x4: false,
      isPlus14cv: false,
      isPlus2t3: false,
      sourceVehicule: 'plaque',
    };
    const garanties = calculerOffres(faitsDepuisVehicule(vehicule));
    const devisTest: Devis = {
      id: '00000000-0000-0000-0000-000000000000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      marque: vehicule.marque,
      modele: vehicule.modele,
      version: vehicule.version,
      plaque: vehicule.plaque,
      vin: vehicule.vin,
      type_mine: null,
      date_mise_en_circulation: vehicule.dateMiseEnCirculation,
      kilometrage: vehicule.kilometrage,
      energie: vehicule.energie,
      valeur_neuf_euros: vehicule.valeurNeufEuros,
      puissance_fiscale: vehicule.puissanceFiscale,
      source_vehicule: 'plaque',
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
      garanties_proposees: garanties,
      statut: 'nouveau',
      notes_commerciales: null,
      commercial_assigne: null,
      ip_address: null,
      user_agent: null,
    };

    const pdf = await genererPDFDevis(devisTest, garanties);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="devis-test-garantieplus.pdf"',
      },
    });
  } catch (err) {
    console.error('[test-pdf]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
