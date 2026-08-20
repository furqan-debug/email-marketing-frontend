'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import StatCard from '@/components/StatCard';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Campaign { id: string; name: string; status: string; }
interface Analytics {
  sent: number; delivered: number; opened: number;
  clicked: number; bounced: number; complained: number;
  staleWarning?: boolean;
  computedAt?: string;
}

const pct = (n: number, of: number) => of > 0 ? `${((n / of) * 100).toFixed(1)}%` : '-';

export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string };
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [c, a] = await Promise.allSettled([
      axios.get(`${API}/campaigns/${id}`),
      axios.get(`${API}/analytics/campaigns/${id}`),
    ]);
    if (c.status === 'fulfilled') setCampaign(c.value.data);
    if (a.status === 'fulfilled') setAnalytics(a.value.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function action(endpoint: string) {
    setActionLoading(true);
    setMsg('');
    try {
      await axios.post(`${API}/campaigns/${id}/${endpoint}`);
      setMsg(`${endpoint} successful`);
      await load();
    } catch (err: any) {
      setMsg(err.response?.data?.message || `${endpoint} failed`);
    } finally {
      setActionLoading(false);
    }
  }

  async function forceCompute() {
    setActionLoading(true);
    try {
      const r = await axios.post(`${API}/analytics/campaigns/${id}/compute`);
      setAnalytics(r.data);
      setMsg('Analytics refreshed');
    } catch {
      setMsg('Failed to refresh');
    } finally {
      setActionLoading(false);
    }
  }

  if (!campaign) return <p className="text-gray-500">Loading...</p>;

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700', SENDING: 'bg-blue-100 text-blue-700',
    PAUSED: 'bg-yellow-100 text-yellow-700', COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[campaign.status] || ''}`}>
          {campaign.status}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-6">{campaign.id}</p>

      {/* Controls */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {campaign.status === 'DRAFT' && (
          <button onClick={() => action('send')} disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">Send</button>
        )}
        {campaign.status === 'SENDING' && (
          <button onClick={() => action('pause')} disabled={actionLoading}
            className="px-4 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:opacity-50">Pause</button>
        )}
        {campaign.status === 'PAUSED' && (
          <button onClick={() => action('resume')} disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">Resume</button>
        )}
        {!['CANCELLED', 'COMPLETED'].includes(campaign.status) && (
          <button onClick={() => action('cancel')} disabled={actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50">Cancel</button>
        )}
        <button onClick={forceCompute} disabled={actionLoading}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 disabled:opacity-50">Refresh Analytics</button>
      </div>
      {msg && <p className="text-sm mb-4 text-blue-700">{msg}</p>}

      {/* Analytics */}
      <h2 className="text-lg font-semibold mb-3">Analytics Snapshot</h2>
      {!analytics ? (
        <p className="text-gray-500 text-sm">No analytics yet. Click Refresh above to compute now.</p>
      ) : (
        <>
          {analytics.staleWarning && (
            <p className="text-yellow-600 text-sm mb-3">Snapshot may be stale (last computed: {analytics.computedAt ? new Date(analytics.computedAt).toLocaleString() : 'unknown'})</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Sent" value={analytics.sent} />
            <StatCard label="Delivered" value={analytics.delivered} sub={pct(analytics.delivered, analytics.sent)} />
            <StatCard label="Opened" value={analytics.opened} sub={pct(analytics.opened, analytics.delivered)} />
            <StatCard label="Clicked" value={analytics.clicked} sub={pct(analytics.clicked, analytics.opened)} />
            <StatCard label="Bounced" value={analytics.bounced} sub={pct(analytics.bounced, analytics.sent)} />
            <StatCard label="Complained" value={analytics.complained} sub={pct(analytics.complained, analytics.sent)} />
          </div>
        </>
      )}
    </div>
  );
}
