'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Audience { id: string; name: string; }

export default function ContactsPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [audienceId, setAudienceId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/contacts/audiences`).then(r => {
      setAudiences(r.data);
      if (r.data.length > 0) setAudienceId(r.data[0].id);
    }).catch(() => setError('Failed to load audiences'));
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !audienceId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/contacts/import?audienceId=${audienceId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Import Contacts</h1>
      <div className="bg-white border rounded-lg p-6 max-w-lg">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Audience</label>
            {audiences.length === 0 ? (
              <p className="text-sm text-gray-500">No audiences found. Create one first via the API.</p>
            ) : (
              <select
                value={audienceId}
                onChange={e => setAudienceId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {audiences.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Required columns: email (optional: firstName, lastName)</p>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
              <p className="font-medium text-green-800">Import complete</p>
              <p>Imported: {result.imported} | Skipped: {result.skipped} | Errors: {result.errors}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !file || !audienceId}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </form>
      </div>
    </div>
  );
}
