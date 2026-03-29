'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import DevisDetail from '@/components/admin/DevisDetail';
import { Devis } from '@/types';

export default function AdminDevisDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) router.push('/admin');
  }, [router]);

  useEffect(() => {
    checkAuth();
    fetch(`/api/devis/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setDevis(data); })
      .finally(() => setLoading(false));
  }, [id, checkAuth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-[#F8F6FC]">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#381893] to-[#47b4e1] rounded-lg flex items-center justify-center p-1">
              <Image src="/logo.svg" alt="Garantie Plus" width={20} height={20} className="brightness-0 invert" />
            </div>
            <span className="font-bold text-[#1A1A2E]">Garantie Plus</span>
            <span className="text-gray-300 text-sm">/</span>
            <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-[#381893]">Dashboard</Link>
            <span className="text-gray-300 text-sm">/</span>
            <span className="text-sm text-gray-700">Devis</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 border border-gray-200 rounded-lg"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#381893] transition-colors"
          >
            ← Retour au dashboard
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#381893] border-t-transparent rounded-full mx-auto mb-3" />
            Chargement du devis...
          </div>
        ) : notFound ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-500">Devis introuvable</p>
            <Link href="/admin/dashboard" className="mt-4 inline-block text-[#381893] underline">
              Retour au dashboard
            </Link>
          </div>
        ) : devis ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <DevisDetail devis={devis} onUpdate={setDevis} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
