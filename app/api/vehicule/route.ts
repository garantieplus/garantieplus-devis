import { NextRequest, NextResponse } from 'next/server';
import { rechercherVehicule, specsVersion } from '@/lib/vehicule/recherche';

export const dynamic = 'force-dynamic';

/** IP du client telle que la pose le proxy (Vercel : x-forwarded-for, premier segment). */
function ipClient(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  );
}

/** POST { plaque } -> véhicule retrouvé (SIV + véhiculier) et versions possibles. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { plaque?: unknown } | null;
  const plaque = typeof body?.plaque === 'string' ? body.plaque : '';
  if (!plaque.trim()) return NextResponse.json({ error: 'Plaque requise' }, { status: 400 });
  const resultat = await rechercherVehicule(plaque, ipClient(req));
  return NextResponse.json(resultat);
}

/**
 * GET ?sra=… -> caractéristiques de la version choisie (valeur à neuf, pondération).
 * GET ?plaque=… -> même recherche que le POST (contrôle depuis un navigateur).
 */
export async function GET(req: NextRequest) {
  const plaque = req.nextUrl.searchParams.get('plaque')?.trim() ?? '';
  if (plaque) return NextResponse.json(await rechercherVehicule(plaque, ipClient(req)));
  const sra = req.nextUrl.searchParams.get('sra')?.trim() ?? '';
  if (!sra) return NextResponse.json({ error: 'Paramètre plaque ou sra requis' }, { status: 400 });
  return NextResponse.json({ specs: await specsVersion(sra) });
}
