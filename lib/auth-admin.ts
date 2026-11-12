// Contrôle d'accès des routes API du back-office (serveur uniquement).
//
// Le back-office appelle /api/devis (liste) et /api/devis/[id] (fiche, statut, relance,
// suppression) ; ces routes lisent la base avec la clé service, donc sans RLS. Elles exigent
// une session Supabase valide : le navigateur envoie son jeton d'accès dans
// « Authorization: Bearer … » (lib/admin-fetch.ts), vérifié ici auprès de Supabase Auth.
// Seule la création d'un devis (POST /api/devis, formulaire public) reste ouverte.

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface UtilisateurAdmin {
  id: string;
  email: string;
}

/** Utilisateur connecté, ou réponse 401 à renvoyer telle quelle. */
export async function exigerSession(req: NextRequest): Promise<UtilisateurAdmin | NextResponse> {
  const entete = req.headers.get('authorization') ?? '';
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7).trim() : '';
  if (!jeton) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { data, error } = await supabaseAdmin().auth.getUser(jeton);
  if (error || !data.user) return NextResponse.json({ error: 'Session invalide ou expirée' }, { status: 401 });
  return { id: data.user.id, email: data.user.email ?? '' };
}
