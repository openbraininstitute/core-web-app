import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

/**
 * The platform path: what the Open Brain Platform is for; virtual labs,
 * projects and credits; its sections — Home, Data, an item's page,
 * Workflows, Notebooks — with what is public and what is private, how models
 * build on each other, and a run from its form to its results; the OBI
 * Assistant, and its tools over MCP; the services behind it; and a first
 * session, end to end. ← goes back to the choice.
 */
export const PLATFORM_SLIDES: Slide[] = [
  {
    say: 'The Open Brain Platform puts brain data and models in one place',
    note: 'Curated data from labs, models built from it, and the tools to build and simulate more, all in a web browser, at openbraininstitute.org.',
    widget: 'platform:what',
  },
  {
    say: 'Your work lives in a virtual lab, divided into projects',
    note: "The lab is yours, run by administrators you invite. Its projects hold the work — data, models, simulations and notebooks — shared with each project's members.",
    widget: 'platform:account',
  },
  {
    say: 'Running things costs credits; looking does not',
    note: "A lab buys credits and passes them on to its projects. Launching a workflow, running a notebook and storing data draw on the project's credits; browsing the data is free.",
    widget: 'platform:credits',
  },
  {
    say: 'Inside a project, the platform has a few main sections',
    note: 'Home, Data, Workflows, Notebooks and Reports across the top; your lab, project and credits beside them; and the OBI Assistant, in a panel on the right.',
    widget: 'platform:layout',
  },
  {
    say: 'Home is where to start',
    note: 'Get started has guides and examples, Tutorials walk through the platform, and Activities lists everything run in the project, with how it went.',
    widget: 'platform:home',
  },
  {
    say: 'Data holds the curated data and models, by brain region',
    note: 'Experimental data — morphologies, recordings, densities — the models built from it, and simulations, for mouse, rat and human among others, found through a brain-region tree, an atlas and a 3D viewer.',
    widget: 'platform:data',
  },
  {
    say: "Public data is everyone's; your project's is yours",
    note: "Everything belongs to a project and starts private. With no project open you see the public data; inside one, the public data and the project's own. What you upload stays private to the project.",
    widget: 'platform:public',
  },
  {
    say: 'Each item has a page of its own',
    note: 'Its details and files, a 3D view, analyses, the publications it comes from, and the items it is related to.',
    widget: 'platform:item',
  },
  {
    say: 'Models are built up in layers',
    note: "A morphology and an e-model, the cell's electrical behaviour, make an ME-model: a neuron to simulate. Give it synapses and it is a synaptome; connect many and it is a circuit, from a pair of neurons to a whole brain.",
    widget: 'platform:models',
  },
  {
    say: 'Workflows build models, simulate them and analyse data',
    note: 'Each is a standard recipe: build an ion channel model or a neuron, simulate a neuron, a synaptome or a circuit, extract features from recordings, or optimise an e-model.',
    widget: 'platform:workflows',
  },
  {
    say: 'A run is configured, generated, then launched',
    note: 'Fill in the form, with a list of values wherever you want to scan. Generate makes the campaign, one simulation per combination, for free; Launch runs it, for credits.',
    widget: 'platform:run',
  },
  {
    say: 'Results come back to the project',
    note: "Follow a run in Home's Activities or under Workflows; its results open from there, and are kept in Data, under Simulations.",
    widget: 'platform:results',
  },
  {
    say: 'Notebooks analyse it all in Python',
    note: "A catalogue of ready-made analysis notebooks, to run on the platform's JupyterHub, and your own. They use entitysdk, the Python library of the entitysdk course.",
    widget: 'platform:notebooks',
  },
  {
    say: 'The OBI Assistant can do much of it for you',
    note: "Ask in plain words: it searches the data and the literature, plots cells and traces, runs Python, and fills in workflows' forms.",
    widget: 'platform:assistant',
  },
  {
    say: 'Its tools also work from your own AI assistant',
    note: 'Through MCP, an open standard for connecting AI assistants to tools: add the platform to Claude Code, Claude Desktop or Cursor, log in, and it can search, run code and work in your projects.',
    widget: 'platform:mcp',
  },
  {
    say: 'Behind it: a database, workflows, and computers to run them',
    note: 'EntityCore keeps every item and file with what it was made from; obi-one turns forms into runs; compute cells in the cloud run them, in NEURON or Brian2.',
    widget: 'platform:backend',
  },
  {
    say: 'A first session: find, build, simulate, read, analyse',
    note: "From a morphology and an e-model in Data to a simulated neuron's voltage, and what it means.",
    widget: 'platform:journey',
  },
  {
    say: 'Next, write code of your own: start with Python',
    widget: 'platform:journey',
    cta: { href: '/walkthrough/python', label: 'How to code in Python' },
  },
];
