import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DOCUMENTS_AUTORISES } from '@/lib/gvo/documents';

// GET /api/track-doc?d=DEVIS_ID&doc=carnet
// Enregistre l'ouverture d'un document depuis le PDF ou l'e-mail du devis, puis redirige
// vers le fichier. Liste fermée de documents (jamais un chemin libre).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const devisId = searchParams.get('d');
  const doc = searchParams.get('doc') ?? 'carnet';
  const cible = DOCUMENTS_AUTORISES[doc];
  if (!cible) return NextResponse.json({ error: 'Document inconnu' }, { status: 404 });

  if (devisId && /^[0-9a-f-]{36}$/i.test(devisId)) {
    try {
      const db = supabaseAdmin();
      await db.from('cg_clicks').insert({
        devis_id: devisId,
        garantie_nom: doc === 'carnet' ? 'Carnet de garantie 2026' : 'Plaquette Garantie Plus',
        fichier_cg: cible,
        ip_address: request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      });
    } catch (e) {
      console.error('[track-doc] Erreur log:', e);
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis.garantieplus.fr').replace(/\/+$/, '');
  return NextResponse.redirect(`${baseUrl}${cible}`, 302);
}
