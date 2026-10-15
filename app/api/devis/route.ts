import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculerOffres, faitsDepuisVehicule } from '@/lib/gvo/offres';
import { envoyerEmailGarage, envoyerEmailInterne } from '@/lib/emails';
import { normaliserPlaque } from '@/lib/vehicule/plaque';
import { ENERGIES, type Energie, type VehiculeInput } from '@/types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEPHONE = /^(\+33|0033|0)[1-9][0-9]{8}$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

const texte = (v: unknown, max = 120): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const entier = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

/** Validation serveur du véhicule : même exigence que le formulaire, jamais de confiance au client. */
function lireVehicule(raw: unknown): { vehicule: VehiculeInput } | { error: string } {
  const v = (raw ?? {}) as Record<string, unknown>;
  const energie = texte(v.energie) as Energie;
  const vehicule: VehiculeInput = {
    plaque: normaliserPlaque(texte(v.plaque, 12)),
    vin: texte(v.vin, 17).toUpperCase(),
    marque: texte(v.marque),
    modele: texte(v.modele),
    version: texte(v.version),
    typeMine: texte(v.typeMine, 40),
    dateMiseEnCirculation: texte(v.dateMiseEnCirculation, 10),
    kilometrage: entier(v.kilometrage),
    energie,
    valeurNeufEuros: entier(v.valeurNeufEuros),
    puissanceFiscale: v.puissanceFiscale == null || v.puissanceFiscale === '' ? null : entier(v.puissanceFiscale),
    is4x4: !!v.is4x4,
    isPlus14cv: !!v.isPlus14cv,
    isPlus2t3: !!v.isPlus2t3,
    sourceVehicule: v.sourceVehicule === 'plaque' ? 'plaque' : 'manuel',
  };
  if (!vehicule.marque || !vehicule.modele) return { error: 'Marque et modèle obligatoires' };
  if (!DATE_ISO.test(vehicule.dateMiseEnCirculation) || Number.isNaN(new Date(vehicule.dateMiseEnCirculation).getTime())) {
    return { error: 'Date de mise en circulation invalide' };
  }
  if (vehicule.dateMiseEnCirculation > new Date().toISOString().slice(0, 10)) return { error: 'Date de mise en circulation dans le futur' };
  if (vehicule.kilometrage <= 0) return { error: 'Kilométrage invalide' };
  if (!ENERGIES.some(e => e.value === energie)) return { error: 'Énergie invalide' };
  if (vehicule.valeurNeufEuros < 1000) return { error: 'Prix à neuf invalide' };
  return { vehicule };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

    const lu = lireVehicule(body.vehicule);
    if ('error' in lu) return NextResponse.json({ error: lu.error }, { status: 400 });
    const { vehicule } = lu;

    const nomContact = texte(body.nomContact);
    const nomGarage = texte(body.nomGarage, 200);
    const email = texte(body.email).toLowerCase();
    const telephone = texte(body.telephone, 40);
    if (!nomContact || !nomGarage || !email || !telephone) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }
    if (!EMAIL.test(email)) return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    if (!TELEPHONE.test(telephone.replace(/[\s.\-()]/g, ''))) {
      return NextResponse.json({ error: 'Téléphone invalide' }, { status: 400 });
    }

    // Prix recalculés ici, jamais repris du client.
    const garantiesProposees = calculerOffres(faitsDepuisVehicule(vehicule));

    const ipAddress =
      req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const eco = vehicule.energie === 'electrique' || vehicule.energie === 'hybride_rechargeable';
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('devis')
      .insert({
        marque: vehicule.marque,
        modele: vehicule.modele,
        version: vehicule.version || null,
        plaque: vehicule.plaque || null,
        vin: vehicule.vin || null,
        type_mine: vehicule.typeMine || null,
        date_mise_en_circulation: vehicule.dateMiseEnCirculation,
        kilometrage: vehicule.kilometrage,
        energie: vehicule.energie,
        valeur_neuf_euros: vehicule.valeurNeufEuros,
        puissance_fiscale: vehicule.puissanceFiscale,
        source_vehicule: vehicule.sourceVehicule,
        is_4x4: vehicule.is4x4,
        is_plus_2t3: vehicule.isPlus2t3,
        is_plus_14cv: vehicule.isPlus14cv,
        // Colonnes historiques, dérivées des nouvelles (filtres du back-office).
        is_hybride_electrique: eco,
        valeur_neuf_55k: vehicule.valeurNeufEuros >= 55000,
        valeur_neuf_100k: vehicule.valeurNeufEuros > 100000,
        valeur_neuf_150k: vehicule.valeurNeufEuros >= 150000,
        nom_contact: nomContact,
        nom_garage: nomGarage,
        email,
        telephone,
        garanties_proposees: garantiesProposees,
        statut: 'nouveau',
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
    }

    // Envoi des e-mails en parallèle — les erreurs sont loguées mais non bloquantes.
    const [resGarage, resInterne] = await Promise.allSettled([
      envoyerEmailGarage({ devis: data, garanties: garantiesProposees }),
      envoyerEmailInterne({ devis: data, garanties: garantiesProposees }),
    ]);
    const emailGarageOk = resGarage.status === 'fulfilled' && resGarage.value.success;
    if (!emailGarageOk) {
      console.error('[API] Email garage échoué:', resGarage.status === 'rejected' ? resGarage.reason : resGarage.value?.error);
    }
    if (!(resInterne.status === 'fulfilled' && resInterne.value.success)) {
      console.error('[API] Email interne échoué:', resInterne.status === 'rejected' ? resInterne.reason : resInterne.value?.error);
    }

    return NextResponse.json({ success: true, id: data.id, garanties: garantiesProposees, emailEnvoye: emailGarageOk });
  } catch (err) {
    console.error('API devis error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get('statut');
  const search = searchParams.get('search');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = db.from('devis').select('*').order('created_at', { ascending: false });

  if (statut && statut !== 'tous') query = query.eq('statut', statut);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  if (search) {
    const q = search.replace(/[,%()]/g, '');
    query = query.or(
      `nom_garage.ilike.%${q}%,nom_contact.ilike.%${q}%,marque.ilike.%${q}%,modele.ilike.%${q}%,email.ilike.%${q}%,plaque.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
