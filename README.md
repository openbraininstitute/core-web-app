# Blue Brain Open Platform

This is the repository for the Blue Brain Open Platform's core web application.

- [https://openbluebrain.com/mmb-beta](https://openbluebrain.com/mmb-beta)
- [https://github.com/BlueBrain/core-web-app](https://github.com/BlueBrain/core-web-app)

# Table of contents

- [Blue Brain Open Platform](#blue-brain-open-platform)
- [Table of contents](#table-of-contents)
  - [Installation](#installation)
    - [Development](#development)
    - [Testing](#testing)
    - [Documentation](#documentation)
  - [Additional Resources](#additional-resources)
    - [Next.js](#nextjs)
  - [Contribution Guidelines](#contribution-guidelines)
  - [Acknowledgment](#acknowledgment)

## Installation

```bash
npm install
# or
yarn install
```

### Development

To spin-up a local development server, run the following terminal command.

```bash
npm run dev
# or
yarn dev
```

This will start a local server, which can be accessed at the following port: [http://localhost:3000](http://localhost:3000)

### Testing

```bash
npm run test
# or
yarn test
```

### Documentation

To serve the documentation locally using MkDocs, first set up a Python virtual environment and install the required packages:

```bash
python -m venv venv
source ./venv/bin/activate
pip install mkdocs mkdocs-material
```

Then serve the documentation:

```bash
mkdocs serve
```

This will start a local documentation server, typically accessible at [http://localhost:8000](http://localhost:8000)

#### Documentation Tags

Documentation files use tags as metadata to link markdown files to one or more products. Tags are defined in the frontmatter of each markdown file and are used to organize and filter documentation content. The allowed tags are configured in `mkdocs.yml` and include categories such as explore, launch-notebook, contribute-and-fix-data, build-ion-channel-model, single-cell-simulation, paired-neuron-simulation, circuit-simulation, neuron-skeletonization, and virtual-labs.

#### Documentation Updates

Pull requests are automatically checked to ensure documentation is kept up to date. The CI will require at least one file in `/docs/` to be modified, unless:
- The PR targets the `develop` branch, or
- The PR has the `skip docs` label

This helps maintain documentation quality by encouraging updates alongside code changes.

## Additional Resources

### Next.js

This application is based-on the Next.js web framework. To learn more about Next.js, the following resources are recommended:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Contribution Guidelines

[Here](./CONTRIBUTING.md)

## Acknowledgment

The development of this software was supported by funding to the Blue Brain Project, a research center of the École polytechnique fédérale de Lausanne (EPFL), from the Swiss government's ETH Board of the Swiss Federal Institutes of Technology.

Copyright (c) 2025 Open Brain Institute
