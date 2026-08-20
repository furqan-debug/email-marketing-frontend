'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Campaign { id: string; name: string; status: string; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENDING: 'bg-blue-100 text-blue-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/campaigns`).then(r => setCampaigns(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link href="/campaigns/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
          + New Campaign
        </Link>
      </div>
      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && campaigns.length === 0 && (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
          No campaigns yet. <Link href="/campaigns/new" className="text-blue-600 underline">Create one</Link>.
        </div>
      )}
      <div className="space-y-3">
        {campaigns.map(c => (
          <Link key={c.id} href={`/campaigns/${c.id}`}
            className="flex items-center justify-between bg-white border rounded-lg px-5 py-4 hover:shadow transition"
          >
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.id}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>
              {c.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
