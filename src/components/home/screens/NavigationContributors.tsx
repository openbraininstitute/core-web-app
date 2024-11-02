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
    <nav className="sticky top-3 flex w-full flex-row items-center justify-between gap-x-2 overflow-x-scroll px-8 md:relative md:top-0 md:gap-x-4 md:overflow-x-auto md:px-0">
      {allAvailableFirstLetter().map((letter: string, index: number) => (
        <button
          key={`Letter-${letter}_Button_${index + 1}`}
          type="button"
          className="relative flex h-12 w-12 items-center justify-center rounded-full px-5 font-sans text-2xl font-semibold md:h-8 md:w-8 md:px-0 md:text-base"
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
