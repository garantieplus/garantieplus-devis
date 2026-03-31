import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

// SQL à exécuter une fois dans Supabase pour créer la table :
// CREATE TABLE inscriptions (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
//   nom_garage TEXT NOT NULL,
//   email TEXT NOT NULL,
//   nom_dirigeant TEXT NOT NULL,
//   telephone TEXT NOT NULL,
//   statut TEXT DEFAULT 'en_attente',
//   notes TEXT
// );

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const nomGarage    = (formData.get('nomGarage')    as string)?.trim();
    const nomDirigeant = (formData.get('nomDirigeant') as string)?.trim();
    const email        = (formData.get('email')        as string)?.trim();
    const telephone    = (formData.get('telephone')    as string)?.trim();
    const kbisFile     = formData.get('kbis')  as File | null;
    const cniFile      = formData.get('cni')   as File | null;
    const ribFile      = formData.get('rib')   as File | null;

    // Validation
    if (!nomGarage || !nomDirigeant || !email || !telephone) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (!kbisFile || !cniFile || !ribFile) {
      return NextResponse.json({ error: 'Les 3 documents sont obligatoires' }, { status: 400 });
    }

    // Lecture des fichiers
    const [kbisBuffer, cniBuffer, ribBuffer] = await Promise.all([
      kbisFile.arrayBuffer().then(b => Buffer.from(b)),
      cniFile.arrayBuffer().then(b => Buffer.from(b)),
      ribFile.arrayBuffer().then(b => Buffer.from(b)),
    ]);

    // Insertion Supabase
    const db = supabaseAdmin();
    const { error: dbError } = await db.from('inscriptions').insert({
      nom_garage:    nomGarage,
      email,
      nom_dirigeant: nomDirigeant,
      telephone,
      statut: 'en_attente',
    });

    if (dbError) {
      console.error('[Inscription] Supabase error:', dbError);
      // Non bloquant : on continue pour envoyer l'email
    }

    // Email à Garantie Plus avec les pièces jointes
    const fromAddr = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const adminEmail = process.env.EMAIL_ADMIN || 'contact@garantieplus.fr';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#F3F4F6;">
  <div style="background:white;border-radius:12px;padding:28px;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(90deg,#381893 0%,#47b4e1 100%);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:white;font-size:16px;font-weight:700;">Nouvelle demande de partenariat</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">${nomGarage} — reçue le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:7px 0;color:#6B7280;width:150px;border-bottom:1px solid #F3F4F6;">Garage</td><td style="padding:7px 0;font-weight:600;color:#1A1A2E;border-bottom:1px solid #F3F4F6;">${nomGarage}</td></tr>
      <tr><td style="padding:7px 0;color:#6B7280;border-bottom:1px solid #F3F4F6;">Dirigeant</td><td style="padding:7px 0;color:#1A1A2E;border-bottom:1px solid #F3F4F6;">${nomDirigeant}</td></tr>
      <tr><td style="padding:7px 0;color:#6B7280;border-bottom:1px solid #F3F4F6;">Email</td><td style="padding:7px 0;border-bottom:1px solid #F3F4F6;"><a href="mailto:${email}" style="color:#381893;">${email}</a></td></tr>
      <tr><td style="padding:7px 0;color:#6B7280;">Téléphone</td><td style="padding:7px 0;color:#1A1A2E;">${telephone}</td></tr>
    </table>

    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;">Documents joints :</p>
      <p style="margin:2px 0;font-size:12px;color:#6B7280;">• Kbis : <strong>${kbisFile.name}</strong></p>
      <p style="margin:2px 0;font-size:12px;color:#6B7280;">• Pièce d'identité : <strong>${cniFile.name}</strong></p>
      <p style="margin:2px 0;font-size:12px;color:#6B7280;">• RIB : <strong>${ribFile.name}</strong></p>
    </div>

    <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
      Garantie Plus SAS — ORIAS n°25004236 — contact@garantieplus.fr
    </p>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: `Garantie Plus <${fromAddr}>`,
      to: adminEmail,
      subject: `Nouvelle demande partenariat — ${nomGarage}`,
      html,
      attachments: [
        { filename: `kbis_${nomGarage.replace(/\s+/g, '_')}_${kbisFile.name}`, content: kbisBuffer },
        { filename: `cni_${nomDirigeant.replace(/\s+/g, '_')}_${cniFile.name}`, content: cniBuffer },
        { filename: `rib_${nomGarage.replace(/\s+/g, '_')}_${ribFile.name}`,   content: ribBuffer },
      ],
    });

    // Email de confirmation au garage
    await resend.emails.send({
      from: `Garantie Plus <${fromAddr}>`,
      to: fromAddr === 'onboarding@resend.dev' ? adminEmail : email,
      subject: 'Votre demande de partenariat Garantie Plus a bien été reçue',
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#F3F4F6;">
  <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(90deg,#381893 0%,#47b4e1 100%);padding:20px 28px;">
      <p style="margin:0;color:white;font-size:18px;font-weight:700;">Demande reçue !</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Garantie Plus — Réseau Partenaires</p>
    </div>
    <div style="padding:24px 28px;">
      <p style="color:#1A1A2E;font-size:15px;font-weight:600;margin:0 0 4px;">Bonjour ${nomDirigeant},</p>
      <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0 0 20px;">
        Votre demande d'inscription au réseau partenaire Garantie Plus a bien été reçue.<br>
        Notre équipe commerciale vous contacte sous <strong>48h</strong> pour finaliser votre partenariat.
      </p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#374151;">Récapitulatif de votre demande :</p>
        <p style="margin:2px 0;font-size:12px;color:#6B7280;">Garage : <strong>${nomGarage}</strong></p>
        <p style="margin:2px 0;font-size:12px;color:#6B7280;">Email : <strong>${email}</strong></p>
        <p style="margin:2px 0;font-size:12px;color:#6B7280;">Téléphone : <strong>${telephone}</strong></p>
      </div>
      <p style="color:#6B7280;font-size:12px;margin:0;">
        Une question ? <a href="mailto:contact@garantieplus.fr" style="color:#381893;font-weight:600;">contact@garantieplus.fr</a>
      </p>
    </div>
    <div style="background:#1A1A2E;padding:14px 28px;">
      <p style="margin:0;color:#6B7280;font-size:10px;text-align:center;">
        Garantie Plus SAS — RCS Paris 943 193 037 — ORIAS n°25004236 — 130, rue de Courcelles – 75017 Paris
      </p>
    </div>
  </div>
</body></html>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Inscription] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
