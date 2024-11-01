import { ContributorProps, CONTRIBUTORS_LIST } from '@/constants/home/contributors-list';

export default function NavigationContributors({
  selectedLetter,
  setSelectedLetter,
}: {
  selectedLetter: string;
  setSelectedLetter: (letter: string) => void;
}) {
  const sortAlphabetically = (myArray: string[]) => {
    return myArray.sort((a, b) => a.localeCompare(b));
  };

  const allAvailableFirstLetter = () => {
    const existingFirstLetter: string[] = [];

    CONTRIBUTORS_LIST.forEach((contributor: ContributorProps) => {
      const firstLetter: string = contributor.full_name[0];

      if (!existingFirstLetter.includes(firstLetter)) {
        existingFirstLetter.push(firstLetter);
      }
    });

    return sortAlphabetically(existingFirstLetter);
  };

  return (
    <nav className="relative flex w-full flex-row items-center justify-between gap-x-4">
      {allAvailableFirstLetter().map((letter: string, index: number) => (
        <button
          key={`Letter-${letter}_Button_${index + 1}`}
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-full font-sans text-base font-semibold"
          style={{
            color: selectedLetter === letter ? '#002766' : '#69c0ff',
            background: selectedLetter === letter ? '#69c0ff' : 'transparent',
          }}
          onClick={() => setSelectedLetter(letter)}
        >
          {letter}
        </button>
      ))}
    </nav>
  );
}
