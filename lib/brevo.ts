// E-mails transactionnels via Brevo (API REST directe, sans SDK — même principe que
// l'adapter de l'app garantieplus). BREVO_API_KEY obligatoire ; EMAIL_FROM au format
// « Garantie Plus <contact@garantieplus.fr> », dont le domaine doit être authentifié chez Brevo.

const BREVO_EMAIL_API = 'https://api.brevo.com/v3/smtp/email';

export interface PieceJointe {
  filename: string;
  content: Buffer;
}

export interface MessageEmail {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: PieceJointe[];
}

/** « Garantie Plus <contact@garantieplus.fr> » -> { name, email } : Brevo les veut séparés. */
export function expediteur(from: string): { name?: string; email: string } {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  if (!m) return { email: from.trim() };
  const name = m[1].replace(/^"|"$/g, '').trim();
  return name ? { name, email: m[2].trim() } : { email: m[2].trim() };
}

export const EXPEDITEUR_PAR_DEFAUT = 'Garantie Plus <contact@garantieplus.fr>';

export async function envoyerEmail(msg: MessageEmail): Promise<{ id: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY absente : aucun e-mail ne peut partir.');
  const from = process.env.EMAIL_FROM || EXPEDITEUR_PAR_DEFAUT;
  const res = await fetch(BREVO_EMAIL_API, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: expediteur(from),
      to: [{ email: msg.to }],
      ...(msg.replyTo ? { replyTo: { email: msg.replyTo } } : {}),
      subject: msg.subject,
      htmlContent: msg.html,
      ...(msg.attachments?.length
        ? { attachment: msg.attachments.map(a => ({ name: a.filename, content: a.content.toString('base64') })) }
        : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const corps = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string; code?: string };
  if (!res.ok) throw new Error(`Brevo : ${corps.message ?? corps.code ?? `HTTP ${res.status}`}`);
  return { id: corps.messageId ?? 'brevo-sans-id' };
}
