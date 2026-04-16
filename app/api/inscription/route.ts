import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// SQL À EXÉCUTER UNE FOIS DANS SUPABASE :
//
// -- Table rate limiting
// CREATE TABLE IF NOT EXISTS rate_limit_logs (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   ip TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON rate_limit_logs(ip, created_at);
//
// -- Table logs sécurité (VirusTotal)
// CREATE TABLE IF NOT EXISTS security_logs (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   ip TEXT,
//   nom_fichier TEXT,
//   resultat_vt JSONB,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- Colonnes supplémentaires pour inscriptions
// ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS ip_address TEXT;
// ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS documents JSONB;
//
// -- Storage : créer le bucket "inscriptions-documents" en PRIVÉ
// -- (Supabase Dashboard > Storage > New bucket > décocher "Public bucket")
// ═══════════════════════════════════════════════════════════════

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Magic bytes validation ──────────────────────────────────────
const ALLOWED_MAGIC: { mime: string; check: (b: Buffer) => boolean }[] = [
  { mime: 'application/pdf', check: b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: 'image/jpeg',      check: b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { mime: 'image/png',       check: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
];

function getMimeFromMagic(buf: Buffer): string | null {
  const match = ALLOWED_MAGIC.find(m => m.check(buf));
  return match?.mime ?? null;
}

// ── Sanitisation ────────────────────────────────────────────────
function sanitize(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim();
}

// ── VirusTotal ──────────────────────────────────────────────────
interface VTResult { clean: boolean; stats?: Record<string, number> }

async function scanVT(buf: Buffer, filename: string, apiKey: string): Promise<VTResult> {
  try {
    const form = new FormData();
    const uint8 = new Uint8Array(buf);
    form.append('file', new Blob([uint8]), filename);

    const submitRes = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: { 'x-apikey': apiKey },
      body: form,
    });
    if (!submitRes.ok) return { clean: true };

    const submitJson = await submitRes.json() as { data?: { id?: string } };
    const analysisId = submitJson.data?.id;
    if (!analysisId) return { clean: true };

    // Polling — max 30s par itérations de 3s
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 3000));
      const pollRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { 'x-apikey': apiKey },
      });
      if (!pollRes.ok) continue;
      const pollJson = await pollRes.json() as { data?: { attributes?: { status?: string; stats?: Record<string, number> } } };
      const attrs = pollJson.data?.attributes;
      if (attrs?.status === 'completed') {
        const stats = attrs.stats ?? {};
        return { clean: (stats.malicious ?? 0) === 0, stats };
      }
    }
    // Timeout → on considère propre pour ne pas bloquer
    return { clean: true };
  } catch {
    return { clean: true };
  }
}

// ── Route POST ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();

  try {
    const formData = await req.formData();

    // ── 1. Honeypot ───────────────────────────────────────────
    const honeypot = (formData.get('_website') as string) || '';
    if (honeypot.length > 0) {
      // Bot détecté — réponse silencieuse
      return NextResponse.json({ success: true });
    }

    // ── 2. IP ─────────────────────────────────────────────────
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';

    // ── 3. Rate limiting (3 soumissions / IP / heure) ────────
    try {
      const since = new Date(Date.now() - 3_600_000).toISOString();
      const { count } = await db
        .from('rate_limit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', since);

      if (count !== null && count >= 3) {
        return NextResponse.json(
          { error: 'Trop de soumissions. Veuillez réessayer dans 1 heure.' },
          { status: 429 }
        );
      }

      // Enregistrer cette soumission
      await db.from('rate_limit_logs').insert({ ip });
    } catch (e) {
      console.error('[Inscription] Rate limit check failed:', e);
      // Non bloquant
    }

    // ── 4. Lecture et validation des champs texte ─────────────
    const nomGarageRaw    = (formData.get('nomGarage')    as string) || '';
    const nomDirigeantRaw = (formData.get('nomDirigeant') as string) || '';
    const emailRaw        = (formData.get('email')        as string) || '';
    const telephoneRaw    = (formData.get('telephone')    as string) || '';

    const nomGarage    = sanitize(nomGarageRaw);
    const nomDirigeant = sanitize(nomDirigeantRaw);
    const email        = sanitize(emailRaw).toLowerCase();
    const telephone    = sanitize(telephoneRaw);

    if (!nomGarage || !nomDirigeant || !email || !telephone) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }
    if (nomGarage.length < 2 || nomDirigeant.length < 2) {
      return NextResponse.json({ error: 'Nom trop court (2 caractères minimum)' }, { status: 400 });
    }
    // Email RFC-compliant
    if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    // Téléphone français
    if (!/^(\+33|0033|0)[1-9][0-9]{8}$/.test(telephone.replace(/[\s.\-()]/g, ''))) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 });
    }

    // ── 5. Fichiers ───────────────────────────────────────────
    const kbisFile = formData.get('kbis') as File | null;
    const cniFile  = formData.get('cni')  as File | null;
    const ribFile  = formData.get('rib')  as File | null;

    if (!kbisFile || !cniFile || !ribFile) {
      return NextResponse.json({ error: 'Les 3 documents sont obligatoires' }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    const fileEntries = [
      { key: 'kbis', file: kbisFile },
      { key: 'cni',  file: cniFile  },
      { key: 'rib',  file: ribFile  },
    ];

    // Lecture des buffers
    const buffers = await Promise.all(
      fileEntries.map(async ({ key, file }) => ({
        key,
        file,
        buf: Buffer.from(await file.arrayBuffer()),
      }))
    );

    // Validation taille + magic bytes
    for (const { key, file, buf } of buffers) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `Fichier ${key} trop volumineux (max 5 Mo)` }, { status: 400 });
      }
      const mime = getMimeFromMagic(buf);
      if (!mime) {
        return NextResponse.json(
          { error: `Type de fichier non autorisé pour ${key}. Formats acceptés : PDF, JPG, PNG` },
          { status: 400 }
        );
      }
    }

    // ── 6. Upload vers Supabase Storage (bucket privé, UUID) ──
    const storagePaths: Record<string, string> = {};
    for (const { key, file, buf } of buffers) {
      const mime = getMimeFromMagic(buf)!;
      const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/jpeg' ? 'jpg' : 'png';
      const storageName = `${randomUUID()}.${ext}`;

      try {
        const { error: upErr } = await db.storage
          .from('inscriptions-documents')
          .upload(storageName, buf, { contentType: mime, upsert: false });

        if (upErr) {
          console.error(`[Inscription] Storage upload error (${key}):`, upErr);
        } else {
          storagePaths[key] = storageName;
          console.log(`[Inscription] Uploaded ${key} → ${storageName}`);
        }
      } catch (e) {
        console.error(`[Inscription] Storage exception (${key}):`, e);
      }

      // Conserver le nom original pour les emails
      storagePaths[`${key}_original`] = file.name;
    }

    // ── 7. VirusTotal scan ────────────────────────────────────
    const vtApiKey = process.env.VIRUSTOTAL_API_KEY || '';
    const vtResults: { key: string; file: File; buf: Buffer; clean: boolean; stats?: Record<string, number> }[] = [];

    if (vtApiKey) {
      for (const { key, file, buf } of buffers) {
        const result = await scanVT(buf, file.name, vtApiKey);
        vtResults.push({ key, file, buf, ...result });

        if (!result.clean) {
          console.warn(`[Inscription] VirusTotal: fichier suspect détecté — ${file.name}`);
          // Logger dans security_logs
          try {
            await db.from('security_logs').insert({
              ip,
              nom_fichier: file.name,
              resultat_vt: result.stats ?? {},
            });
          } catch (e) {
            console.error('[Inscription] security_logs insert error:', e);
          }
        }
      }
    } else {
      // Pas de clé VT → tous considérés propres
      for (const { key, file, buf } of buffers) {
        vtResults.push({ key, file, buf, clean: true });
      }
    }

    const cleanFiles  = vtResults.filter(r => r.clean);
    const blockedFiles = vtResults.filter(r => !r.clean);

    // ── 8. Insertion Supabase ─────────────────────────────────
    const { error: dbError } = await db.from('inscriptions').insert({
      nom_garage:    nomGarage,
      email,
      nom_dirigeant: nomDirigeant,
      telephone,
      statut:        'en_attente',
      ip_address:    ip,
      documents:     storagePaths,
    });
    if (dbError) console.error('[Inscription] Supabase insert error:', dbError);

    // ── 9. Email admin ────────────────────────────────────────
    const adminEmail = process.env.EMAIL_ADMIN || 'contact@garantieplus.fr';

    const blockedBanner = blockedFiles.length > 0
      ? `<div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:14px;margin-bottom:20px;">
           <p style="margin:0;font-size:13px;font-weight:700;color:#DC2626;">
             ⚠️ ${blockedFiles.length} fichier(s) bloqué(s) — détecté(s) comme malveillant(s) par VirusTotal
           </p>
           ${blockedFiles.map(f => `<p style="margin:4px 0 0;font-size:12px;color:#991B1B;">• ${f.file.name}</p>`).join('')}
           <p style="margin:6px 0 0;font-size:11px;color:#B91C1C;">Consulter les logs admin (table security_logs) pour les détails.</p>
         </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#F3F4F6;">
  <div style="background:white;border-radius:12px;padding:28px;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(90deg,#381893 0%,#47b4e1 100%);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:white;font-size:16px;font-weight:700;">🆕 Nouvelle inscription partenaire — ${nomGarage}</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Reçue le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
    ${blockedBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:7px 0;color:#6B7280;width:150px;border-bottom:1px solid #F3F4F6;">Garage</td><td style="padding:7px 0;font-weight:600;color:#1A1A2E;border-bottom:1px solid #F3F4F6;">${nomGarage}</td></tr>
      <tr><td style="padding:7px 0;color:#6B7280;border-bottom:1px solid #F3F4F6;">Dirigeant</td><td style="padding:7px 0;color:#1A1A2E;border-bottom:1px solid #F3F4F6;">${nomDirigeant}</td></tr>
      <tr><td style="padding:7px 0;color:#6B7280;border-bottom:1px solid #F3F4F6;">Email</td><td style="padding:7px 0;border-bottom:1px solid #F3F4F6;"><a href="mailto:${email}" style="color:#381893;">${email}</a></td></tr>
      <tr><td style="padding:7px 0;color:#6B7280;border-bottom:1px solid #F3F4F6;">Téléphone</td><td style="padding:7px 0;color:#1A1A2E;border-bottom:1px solid #F3F4F6;">${telephone}</td></tr>
      <tr><td style="padding:7px 0;color:#6B7280;">IP</td><td style="padding:7px 0;color:#1A1A2E;">${ip}</td></tr>
    </table>
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#374151;">Documents joints (fichiers propres uniquement) :</p>
      ${cleanFiles.map(f => `<p style="margin:2px 0;font-size:12px;color:#6B7280;">✅ ${f.key.toUpperCase()} : <strong>${f.file.name}</strong></p>`).join('')}
      ${blockedFiles.map(f => `<p style="margin:2px 0;font-size:12px;color:#DC2626;">⚠️ ${f.key.toUpperCase()} BLOQUÉ : <strong>${f.file.name}</strong></p>`).join('')}
    </div>
    <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">Garantie Plus SAS — ORIAS n°25004236 — contact@garantieplus.fr</p>
  </div>
</body></html>`;

    await resend.emails.send({
      from:    'Garantie Plus <devis@garantieplus.fr>',
      to:      adminEmail,
      subject: `🆕 Nouvelle inscription partenaire — ${nomGarage}`,
      html,
      attachments: cleanFiles.map(f => ({
        filename: `${f.key}_${randomUUID().slice(0, 8)}_${f.file.name}`,
        content:  f.buf,
      })),
    });

    // ── 10. Email de confirmation ─────────────────────────────
    await resend.emails.send({
      from:    'Garantie Plus <devis@garantieplus.fr>',
      replyTo: 'devis@garantieplus.fr',
      to:      email,
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
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#374151;">Récapitulatif :</p>
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
