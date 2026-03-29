import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculerGaranties } from '@/lib/tarificateur';
import { envoyerEmailGarage, envoyerEmailInterne } from '@/lib/emails';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation côté serveur
    const {
      marque, modele, mois, annee, kilometrage,
      is4x4, isPlus2t3, isPlus14cv, isHybrideElectrique,
      valeurNeuf55k, valeurNeuf100k, valeurNeuf150k,
      nomContact, nomGarage, email, telephone,
    } = body;

    if (!marque || !modele || !mois || !annee || !kilometrage || !nomContact || !nomGarage || !email || !telephone) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const kmInt = parseInt(kilometrage);
    if (isNaN(kmInt) || kmInt < 0) {
      return NextResponse.json({ error: 'Kilométrage invalide' }, { status: 400 });
    }

    const dateCirculation = new Date(parseInt(annee), parseInt(mois) - 1, 1);
    if (isNaN(dateCirculation.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    const garantiesProposees = calculerGaranties({
      dateCirculation,
      kilometrage: kmInt,
      is4x4: !!is4x4,
      isPlus2t3: !!isPlus2t3,
      isPlus14cv: !!isPlus14cv,
      isHybrideElectrique: !!isHybrideElectrique,
      valeurNeuf55k: !!valeurNeuf55k,
      valeurNeuf100k: !!valeurNeuf100k,
      valeurNeuf150k: !!valeurNeuf150k,
    });

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const db = supabaseAdmin();
    const { data, error } = await db.from('devis').insert({
      marque,
      modele,
      date_mise_en_circulation: `${annee}-${mois.toString().padStart(2, '0')}-01`,
      kilometrage: kmInt,
      is_4x4: !!is4x4,
      is_plus_2t3: !!isPlus2t3,
      is_plus_14cv: !!isPlus14cv,
      is_hybride_electrique: !!isHybrideElectrique,
      valeur_neuf_55k: !!valeurNeuf55k,
      valeur_neuf_100k: !!valeurNeuf100k,
      valeur_neuf_150k: !!valeurNeuf150k,
      nom_contact: nomContact,
      nom_garage: nomGarage,
      email,
      telephone,
      garanties_proposees: garantiesProposees,
      statut: 'nouveau',
      ip_address: ipAddress,
      user_agent: userAgent,
    }).select().single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
    }

    // Envoi emails en parallèle — les erreurs sont loguées mais non bloquantes
    const [resGarage, resInterne] = await Promise.allSettled([
      envoyerEmailGarage({ devis: data, garanties: garantiesProposees }),
      envoyerEmailInterne({ devis: data, garanties: garantiesProposees }),
    ]);

    const emailGarageOk = resGarage.status === 'fulfilled' && resGarage.value.success;
    const emailInterneOk = resInterne.status === 'fulfilled' && resInterne.value.success;

    if (!emailGarageOk) {
      const reason = resGarage.status === 'rejected'
        ? resGarage.reason
        : resGarage.value?.error;
      console.error('[API] Email garage échoué:', reason);
    }
    if (!emailInterneOk) {
      const reason = resInterne.status === 'rejected'
        ? resInterne.reason
        : resInterne.value?.error;
      console.error('[API] Email interne échoué:', reason);
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      garanties: garantiesProposees,
      emailEnvoye: emailGarageOk,
    });
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
    query = query.or(
      `nom_garage.ilike.%${search}%,nom_contact.ilike.%${search}%,marque.ilike.%${search}%,modele.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
