'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Audience { id: string; name: string; }
interface Template { id: string; name: string; subject?: string; }

export default function NewCampaignPage() {
  const router = useRouter();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [audienceId, setAudienceId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [step, setStep] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/contacts/audiences`),
      axios.get(`${API}/templates`),
    ]).then(([a, t]) => {
      setAudiences(a.data);
      setTemplates(t.data);
      if (a.data.length > 0) setAudienceId(a.data[0].id);
      if (t.data.length > 0) setTemplateId(t.data[0].id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !audienceId) return;
    setLoading(true);
    setError('');
    try {
      setStep('Creating campaign...');
      const { data: campaign } = await axios.post(`${API}/campaigns`, { name, audienceId });

      setStep('Generating messages...');
      await axios.post(`${API}/campaigns/${campaign.id}/generate-messages`);

      setStep('Starting send...');
      await axios.post(`${API}/campaigns/${campaign.id}/send`);

      router.push(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
      setStep('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Campaign</h1>
      <div className="bg-white border rounded-lg p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Campaign Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. August Newsletter"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Audience</label>
            {audiences.length === 0 ? (
              <p className="text-sm text-gray-500">No audiences found.</p>
            ) : (
              <select value={audienceId} onChange={e => setAudienceId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                {audiences.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Template (optional)</label>
            {templates.length === 0 ? (
              <p className="text-sm text-gray-500">No templates found — campaign will send with default content.</p>
            ) : (
              <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="">No template</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` (${t.subject})` : ''}</option>)}
              </select>
            )}
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {step && <p className="text-blue-600 text-sm">{step}</p>}
          <button
            type="submit"
            disabled={loading || !name || !audienceId}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? step || 'Processing...' : 'Create & Send Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
}
