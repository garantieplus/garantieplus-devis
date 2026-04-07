import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/track-cg?d=DEVIS_ID&cg=/cg/fichier.pdf&nom=Nom+Garantie
// Enregistre le clic et redirige vers le fichier PDF des conditions générales
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const devisId    = searchParams.get('d');
  const fichierCG  = searchParams.get('cg');
  const nomGarantie = searchParams.get('nom') || '';

  if (!fichierCG) {
    return NextResponse.json({ error: 'Parametre cg manquant' }, { status: 400 });
  }

  // Enregistrement non bloquant
  if (devisId) {
    try {
      const db = supabaseAdmin();
      await db.from('cg_clicks').insert({
        devis_id: devisId,
        garantie_nom: decodeURIComponent(nomGarantie),
        fichier_cg: decodeURIComponent(fichierCG),
        ip_address:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('cf-connecting-ip') ||
          null,
      });
    } catch (e) {
      console.error('[track-cg] Erreur log:', e);
    }
  }

  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis.garantieplus.fr';
  const redirectTo = `${baseUrl}${decodeURIComponent(fichierCG)}`;
  return NextResponse.redirect(redirectTo, 302);
}
