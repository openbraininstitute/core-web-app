import { getVersionInfo } from '@/utils/version-info';

export const dynamic = 'force-dynamic';

export default async function VersionPage() {
  const versionInfo = getVersionInfo();

  return (
    <main className="flex h-screen items-center justify-center">
      <div>
        <h1 className="bold text-2xl">Version Info</h1>
        <table className="mt-8 border-collapse border border-gray-300 bg-white shadow-md">
          <tbody>
            {Object.entries(versionInfo).map(([key, value]) => (
              <tr key={key} className="odd:bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">{key}</th>
                <td className="border border-gray-300 px-4 py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
