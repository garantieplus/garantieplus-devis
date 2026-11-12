// fetch du back-office : ajoute le jeton de la session Supabase (vérifié côté serveur par
// lib/auth-admin.ts) et renvoie vers la page de connexion si la session n'est plus valide.

import { supabase } from '@/lib/supabase';

export async function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/admin';
  return res;
}
