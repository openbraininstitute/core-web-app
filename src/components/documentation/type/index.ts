export type SingleSectionProps = {
  name: string;
  slug: string;
  children: SingleSectionProps[] | null;
  disabled: boolean;
};
