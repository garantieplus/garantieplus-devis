import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Politique de confidentialité — Garantie Plus',
  robots: 'noindex',
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#F8F6FC]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Image src="/logo.png" alt="Garantie Plus" width={180} height={70} className="object-contain h-10 w-auto" />
          <Link href="/" className="text-sm text-[#381893] hover:underline font-medium">
            ← Retour
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          <h1 className="text-2xl font-extrabold text-[#6B35A8] mb-2">
            Politique de confidentialité
          </h1>
          <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : avril 2025</p>

          <Section title="1. Responsable du traitement">
            <p>
              <strong>Garantie Plus SAS</strong><br />
              130 rue de Courcelles, 75017 Paris<br />
              Email : <a href="mailto:contact@garantieplus.fr" className="text-[#381893] underline">contact@garantieplus.fr</a>
            </p>
          </Section>

          <Section title="2. Données collectées">
            <p>Dans le cadre de vos demandes de devis et d&apos;inscription partenaire, nous collectons les données suivantes :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nom et prénom du contact</li>
              <li>Adresse email professionnelle</li>
              <li>Numéro de téléphone</li>
              <li>Nom du garage</li>
              <li>Informations relatives au véhicule (marque, modèle, kilométrage, date de mise en circulation)</li>
              <li>Documents d&apos;identification (Kbis, pièce d&apos;identité, RIB — dans le cadre des demandes de partenariat)</li>
            </ul>
          </Section>

          <Section title="3. Finalité du traitement">
            <p>Vos données sont collectées et traitées aux fins suivantes :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Établissement et transmission de votre devis de garantie mécanique</li>
              <li>Recontact commercial suite à votre demande</li>
              <li>Traitement de votre demande d&apos;inscription au réseau partenaire Garantie Plus</li>
              <li>Envoi des conditions générales et documents contractuels</li>
            </ul>
          </Section>

          <Section title="4. Base légale">
            <p>
              Le traitement de vos données repose sur votre <strong>consentement explicite</strong>,
              recueilli lors de la soumission de votre demande de devis ou d&apos;inscription (case à cocher obligatoire).
              Vous pouvez retirer votre consentement à tout moment en contactant&nbsp;:
              <a href="mailto:contact@garantieplus.fr" className="text-[#381893] underline ml-1">contact@garantieplus.fr</a>
            </p>
          </Section>

          <Section title="5. Durée de conservation">
            <p>
              Vos données sont conservées pendant <strong>3 ans</strong> à compter du dernier contact commercial,
              conformément aux recommandations de la CNIL. Au-delà, elles sont supprimées ou anonymisées.
            </p>
          </Section>

          <Section title="6. Destinataires des données">
            <p>Vos données sont traitées exclusivement par Garantie Plus SAS et ne sont pas transmises à des tiers à des fins commerciales.</p>
            <p className="mt-2">
              Nos sous-traitants techniques (hébergement et envoi d&apos;emails) traitent vos données dans le cadre de leurs missions :
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase Inc.</strong> — hébergement de la base de données (données stockées en Europe)</li>
              <li><strong>Resend Inc.</strong> — envoi des emails transactionnels</li>
              <li><strong>Vercel Inc.</strong> — hébergement de l&apos;application</li>
            </ul>
          </Section>

          <Section title="7. Vos droits">
            <p>Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679), vous disposez des droits suivants :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
              <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit d&apos;opposition</strong> : s&apos;opposer au traitement de vos données à des fins de prospection commerciale</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré et lisible</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, adressez votre demande à :{' '}
              <a href="mailto:contact@garantieplus.fr" className="text-[#381893] underline">contact@garantieplus.fr</a>
              {' '}— 130 rue de Courcelles, 75017 Paris.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              En cas de réponse insatisfaisante, vous pouvez introduire une réclamation auprès de la{' '}
              <strong>CNIL</strong> (Commission Nationale de l&apos;Informatique et des Libertés) : <strong>www.cnil.fr</strong>
            </p>
          </Section>

          <Section title="8. Sécurité">
            <p>
              Garantie Plus SAS met en œuvre des mesures techniques et organisationnelles appropriées pour protéger
              vos données contre tout accès non autorisé, perte ou divulgation. Les fichiers transmis sont stockés
              dans un espace sécurisé à accès restreint.
            </p>
          </Section>

        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-base font-bold text-[#381893] mb-2">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-1">{children}</div>
    </div>
  );
}
