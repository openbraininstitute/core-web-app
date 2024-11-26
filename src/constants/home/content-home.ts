export type ThreeColumnScreenOne = {
  section: string;
  content: string;
  available: boolean;
};

export const THREE_COLUMN_SCREEN_ONE: ThreeColumnScreenOne[] = [
  {
    section: 'explore',
    content: 'Explore resources with our Open Brain Atlas',
    available: true,
  },
  {
    section: 'build',
    content: 'Configure and build multiscale models',
    available: false,
  },
  {
    section: 'simulate',
    content: 'Run simulations of your own models',
    available: false,
  },
];

export const SCREEN_TWO = {
  title: 'Why Blue Brain Github?',
  content: [
    {
      title: 'Prefer to go it alone?',
      paragraph:
        'The Blue Brain Open Platform is built on the Blue Brain Project’s legacy. All of Blue Brain’s tools - including the simulation neuroscience platform - are open-sourced for your convenience. Find them all in this Github repository and run them with your own computing resources.',
    },
    // {
    //   title: 'We ♡ Open Science',
    //   paragraph:
    //     'All Blue Brain models and data used in this platform are independently available via AWS’ open data sponsorship program. This provides all the datasets for simulations in your chosen environment.',
    // },
  ],
};

export const BB_AWS = {
  title: 'Discover our AWS Open Data Repository',
  content: [
    {
      title: 'We ♡ Open Science',
      paragraph:
        'All Blue Brain models and data used in this platform are independently available via AWS’ open data sponsorship program. This provides all the datasets for simulations in your chosen environment. ',
    },
  ],
};

export const CONTRIBUTORS = {
  title: 'We thank the 1,000+ contributors',
  subtitle:
    "who advanced the Blue Brain Project scientifically over the years. We couldn't have done this without you!",
  contributors: [
    {
      name: 'Romy Aardse',
      link: '#',
    },
    {
      name: 'Marwan Abdellah',
      link: '#',
    },
    {
      name: 'M. Abdelaziz',
      link: '#',
    },
    {
      name: 'Shabbir S Abdul',
      link: '#',
    },
    {
      name: 'Romy Aardse',
      link: '#',
    },
    {
      name: 'Marwan Abdellah',
      link: '#',
    },
    {
      name: 'M. Abdelaziz',
      link: '#',
    },
    {
      name: 'Shabbir S Abdul',
      link: '#',
    },
  ],
};
