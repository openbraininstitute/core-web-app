export default function GuidesSection({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <div>
      <h2>Guides</h2>
      <p>This is the guides section. params is: {JSON.stringify(searchParams)}</p>
    </div>
  );
}
