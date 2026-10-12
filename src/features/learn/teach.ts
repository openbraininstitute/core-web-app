/*
 * The Learn page's Teach section: what the platform offers someone teaching a class on it, one
 * topic at a time. A first draft of the copy, for judging; the Dev settings' Sections can leave it off.
 */

export type TeachTopic = {
  id: string;
  title: string;
  /** One line, under the title on the left and in the callout on the right. */
  short: string;
  body: string[];
  /** What it takes, in order. */
  steps?: string[];
  /** At a glance: a short value and what it is. */
  facts?: { value: string; label: string }[];
};

export const TEACH_TOPICS: TeachTopic[] = [
  {
    id: 'overview',
    title: 'Teach on the platform',
    short: 'A ready-made lab for a class: real data, real models and simulations, in the browser.',
    body: [
      'The Open Brain Platform can host a whole course. Students explore the same curated data, build and simulate models, and run notebooks without installing anything: everything they need is in their browser.',
      'A course lives in a virtual lab that you own. Each student or group gets a project of their own inside it, while you keep an eye on all of them, share material with everyone, and manage the credits the class uses.',
    ],
    facts: [
      { value: '0', label: 'Installs for students' },
      { value: '1 lab', label: 'Per course' },
      { value: '1 project', label: 'Per student or group' },
    ],
  },
  {
    id: 'setup',
    title: 'Set up a course',
    short: 'One virtual lab for the course, one project for each student or group.',
    body: [
      'Create a virtual lab named after your course and invite your teaching assistants as admins. Inside it, create a project for each student or group, or let students create their own once they have joined.',
      'Projects keep each student’s work apart, while everything in the lab, such as models, notebooks and simulation results, can be shared with the whole class when you choose.',
    ],
    steps: [
      'Create a virtual lab for the course',
      'Invite teaching assistants as lab admins',
      'Invite students by email, or enrol them from Moodle',
      'Give each student or group a project',
      'Share the starting material with the class',
    ],
  },
  {
    id: 'moodle',
    title: 'Moodle integration',
    short: 'Launch the platform from your Moodle course, with your class already enrolled.',
    body: [
      'If your institution uses Moodle, or another learning management system that supports LTI, the platform can be added to a course as an external tool. Students follow a link in Moodle and arrive in their own project, signed in, without a separate account to manage.',
      'The class list comes from Moodle, so students who join or leave the course there join or leave the lab too. Activities can be linked to a course, a notebook or a simulation on the platform, and their completion reported back to the Moodle gradebook.',
    ],
    steps: [
      'Ask us to register your Moodle site',
      'Add the Open Brain Platform as an external tool in your course',
      'Link it to the course’s virtual lab',
      'Add activities that open a course, notebook or simulation',
    ],
  },
  {
    id: 'material',
    title: 'Course material',
    short: 'Use the free courses, glossary and tutorials as they are, or build on them.',
    body: [
      'The free courses on this page, from an introduction to brain modelling to the electrical physics of a neuron and Python for neuroscience, can be set as reading for a class. Each slide has its own live figure for students to play with.',
      'Alongside them, the glossary explains the terms students will meet, and the tutorials walk through the platform itself. Link to any of them from your own course pages or from Moodle.',
    ],
  },
  {
    id: 'exercises',
    title: 'Exercises and notebooks',
    short: 'Hands-on work with data, models and simulations, in notebooks students can run.',
    body: [
      'Set exercises that use the platform’s data and tools: find neurons of a given type in the atlas, build a single-neuron model, run a simulation and analyse its traces.',
      'For coding exercises, share a notebook with the class. Each student runs their own copy against the same data, and their results stay in their project, where you can review them.',
    ],
  },
  {
    id: 'credits',
    title: 'Credits and costs',
    short: 'The class shares the lab’s credits, with a budget for each project if you want one.',
    body: [
      'Browsing data, reading the courses and building models are free. Running simulations and other compute uses credits, which come from the course’s virtual lab.',
      'Set a budget for each project so that no one student can use up the class’s credits, and follow what each project has spent from the lab. Educational pricing is available for courses: get in touch to find out more.',
    ],
  },
  {
    id: 'contact',
    title: 'Get started',
    short: 'Tell us about your course, and we will help you set it up.',
    body: [
      'We are happy to help with the first course you run on the platform, from setting up the lab and connecting Moodle to choosing material and sizing the credits your class will need.',
    ],
  },
];

export const teachTopic = (id: string | null) => TEACH_TOPICS.find((t) => t.id === id);
