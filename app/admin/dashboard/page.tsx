'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import DevisTable from '@/components/admin/DevisTable';
import { Devis, StatutDevis } from '@/types';

export default function AdminDashboard() {
  const router = useRouter();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) router.push('/admin');
  }, [router]);

  const fetchDevis = useCallback(async () => {
    const res = await fetch('/api/devis');
    const data = await res.json();
    if (Array.isArray(data)) setDevis(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
    fetchDevis();
  }, [checkAuth, fetchDevis]);

  const handleStatutChange = async (id: string, statut: StatutDevis) => {
    try {
      const res = await fetch(`/api/devis/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error();
      setDevis(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  // KPIs
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const totalDevis = devis.length;
  const devisWeek = devis.filter(d => new Date(d.created_at) >= startOfWeek).length;
  const convertis = devis.filter(d => d.statut === 'converti').length;
  const tauxConversion = totalDevis > 0 ? Math.round((convertis / totalDevis) * 100) : 0;
  const aRappeler = devis.filter(d => d.statut === 'a_rappeler').length;

  const kpis = [
    { label: 'Total devis', value: totalDevis, icon: '📊', color: 'from-[#381893] to-[#47b4e1]' },
    { label: 'Cette semaine', value: devisWeek, icon: '📅', color: 'from-blue-500 to-blue-600' },
    { label: 'Taux conversion', value: `${tauxConversion}%`, icon: '🎯', color: 'from-green-500 to-green-600' },
    { label: 'À rappeler', value: aRappeler, icon: '📞', color: 'from-yellow-500 to-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6FC]">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#381893] to-[#47b4e1] rounded-lg flex items-center justify-center p-1">
              <Image src="/logo.svg" alt="Garantie Plus" width={20} height={20} className="brightness-0 invert" />
            </div>
            <div>
              <span className="font-bold text-[#1A1A2E]">Garantie Plus</span>
              <span className="text-gray-400 text-sm ml-2">Back-office</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-gray-500 hover:text-[#381893] transition-colors"
            >
              ↗ Voir le formulaire public
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 border border-gray-200 rounded-lg"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestion des devis Garantie Plus</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{kpi.icon}</span>
                <div className={`w-8 h-8 bg-gradient-to-r ${kpi.color} rounded-lg opacity-20`} />
              </div>
              <div className={`text-3xl font-extrabold bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
                {kpi.value}
              </div>
              <div className="text-gray-500 text-sm mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">Tous les devis</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="animate-spin w-8 h-8 border-2 border-[#381893] border-t-transparent rounded-full mx-auto mb-3" />
              Chargement...
            </div>
          ) : (
            <DevisTable devis={devis} onStatutChange={handleStatutChange} />
          )}
        </div>
      </main>
    </div>
  );
}
