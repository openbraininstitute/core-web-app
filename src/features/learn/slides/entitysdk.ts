import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * entitysdk, OBI's Python client for EntityCore: connecting, searching and
 * filtering, reading an entity's fields, fetching one by id, downloading its
 * files and working on them, models and recordings, registering your own —
 * every cell as run against production, with what it printed.
 */
export const ENTITYSDK_SLIDES: Slide[] = [
  {
    say: 'Everything on the platform is stored as an entity in EntityCore',
    note: 'Morphologies, recordings, models, circuits and simulations: each entity has its own fields, points to the entities it came from, and carries its files.',
    widget: 'sdk:entities',
  },
  {
    say: 'entitysdk is the Python client for EntityCore',
    note: 'Install it with pip, along with obi-auth to log in and obi-notebook to pick a project.',
    widget: 'sdk:install',
  },
  {
    say: 'A client needs a token, an environment and a project',
    note: 'In a platform notebook, get_token logs you in and get_projects lets you choose a project. Without a project, you see public data only.',
    widget: 'sdk:connect',
  },
  {
    say: 'search_entity finds entities of one type',
    note: 'Give it the type, from models, and a query of filters. Here: the first five morphologies of thick-tufted layer 5 pyramidal cells.',
    widget: 'sdk:search',
  },
  {
    say: 'Filters narrow the search',
    note: "A field's name, with __ to reach into the entities it points to, and an operator if needed: __in for any of a list, __ilike for text it contains.",
    widget: 'sdk:filters',
  },
  {
    say: 'Results arrive as you ask for them',
    note: 'next takes one; .all() takes the rest, page by page; .one() insists on exactly one, and .first() takes the first or None.',
    widget: 'sdk:lazy',
  },
  {
    say: 'An entity carries its fields, and the entities it points to',
    note: 'This is the layer 5 cell from the cortex course: its species and brain region, its m-type, how it was made, and its three files.',
    widget: 'sdk:fields',
  },
  {
    say: 'get_entity fetches one entity by its id',
    note: 'Every entity has its own id: keep it, and you can fetch exactly the same one again, with where it was published and who made it.',
    widget: 'sdk:get',
  },
  {
    say: 'download_assets fetches its files',
    note: 'A selection chooses which; you get back the path each was saved to.',
    widget: 'sdk:download',
  },
  {
    say: 'Then any Python tool can work on them',
    note: 'Here NeuroM measures the morphology just downloaded.',
    widget: 'sdk:analyse',
  },
  {
    say: 'Models point to the data they were built from',
    note: 'An ME-model joins a morphology and an e-model. Its filters differ a little: an ME-model knows its species directly, not through a subject.',
    widget: 'sdk:memodel',
  },
  {
    say: 'Recordings work the same way',
    note: "A real one, in vitro, from the rat's somatosensory cortex. Two recordings share its name; adding its e-type to the query picks out the one.",
    widget: 'sdk:recording',
  },
  {
    say: 'An NWB file opens with h5py: plot one of its sweeps',
    note: "NWB is HDF5 underneath. Each sweep is an array of voltages and its sampling rate: here, the cell's answer to a step of current.",
    widget: 'sdk:trace',
  },
  {
    say: 'Add your own data: register entities, then upload their files',
    note: 'Register what it comes from first, its subject and protocol, then the morphology pointing to them, and upload its file.',
    widget: 'sdk:register',
  },
  {
    say: 'A few things to remember',
    widget: 'sdk:gotchas',
  },
  {
    say: 'Next, choose another course',
    widget: 'sdk:gotchas',
    cta: { label: 'All the courses' },
  },
];
