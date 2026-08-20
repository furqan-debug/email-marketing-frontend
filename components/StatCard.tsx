interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
}
export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border p-5 text-center">
      <p className="text-3xl font-bold text-blue-700">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
