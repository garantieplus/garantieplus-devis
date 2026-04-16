import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { envoyerEmailGarage, envoyerEmailInterne } from '@/lib/emails';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db.from('devis').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const allowed = ['statut', 'notes_commerciales', 'commercial_assigne'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.from('devis').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from('devis').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();

  if (action !== 'resend-email') {
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.from('devis').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });

  await Promise.allSettled([
    envoyerEmailGarage({ devis: data, garanties: data.garanties_proposees }),
    envoyerEmailInterne({ devis: data, garanties: data.garanties_proposees }),
  ]);

  return NextResponse.json({ success: true });
}
