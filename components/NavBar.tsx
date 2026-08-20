'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NavBar() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-lg">ðŸ“§ EM Platform</span>
      <Link href="/" className="hover:underline text-sm">Dashboard</Link>
      <Link href="/contacts" className="hover:underline text-sm">Contacts</Link>
      <Link href="/campaigns" className="hover:underline text-sm">Campaigns</Link>
      <div className="ml-auto">
        <button onClick={logout} className="text-sm hover:underline">Logout</button>
      </div>
    </nav>
  );
}
