import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/contacts" className="bg-white border rounded-lg p-6 hover:shadow transition">
          <div className="text-3xl mb-2 font-mono">[C]</div>
          <h2 className="font-semibold">Contacts</h2>
          <p className="text-sm text-gray-500 mt-1">Upload CSV to import contacts into an audience</p>
        </Link>
        <Link href="/campaigns" className="bg-white border rounded-lg p-6 hover:shadow transition">
          <div className="text-3xl mb-2 font-mono">[S]</div>
          <h2 className="font-semibold">Campaigns</h2>
          <p className="text-sm text-gray-500 mt-1">Create and send email campaigns</p>
        </Link>
        <Link href="/campaigns" className="bg-white border rounded-lg p-6 hover:shadow transition">
          <div className="text-3xl mb-2 font-mono">[A]</div>
          <h2 className="font-semibold">Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">View open/click/bounce rates per campaign</p>
        </Link>
      </div>
    </div>
  );
}
