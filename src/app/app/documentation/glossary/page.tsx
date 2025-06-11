export default function FullGlossaryPage() {
  return (
    <div className="flex w-full flex-col gap-y-6">
      <h1 className="text-3xl font-bold">Glossary</h1>
      <p className="text-lg text-gray-700">
        A comprehensive glossary of terms used in the documentation.
      </p>
      <div className="mt-4">{/* Glossary content will go here */}</div>
    </div>
  );
}
