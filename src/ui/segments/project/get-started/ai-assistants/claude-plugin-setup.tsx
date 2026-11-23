import { RiExternalLinkLine } from '@remixicon/react';

import { ClaudeLogo } from './claude-logo';
import { CopyValue } from './copy-value';
import { LightboxScreenshot, type Screenshot, ScreenshotLightbox } from './screenshot-lightbox';

import type { ReactNode } from 'react';

const IMAGES = '/images/ai-assistants/claude';

const MARKETPLACE_REPOSITORY = 'openbraininstitute/obi-skills';
const MCP_SERVER_URL = 'https://cell-a.openbraininstitute.org/api/agent-ts/mcp';
const OAUTH_CLIENT_ID = 'obi-mcp';
const EXAMPLE_PROMPT = 'Can you find me a small microcircuit from cortex?';

type Step = {
  title: string;
  body: ReactNode;
  image: { src: string; width: number; height: number; alt: string };
};

const STEPS: Step[] = [
  {
    title: 'Open the plugins in Claude',
    body: (
      <p>
        Go to{' '}
        <a
          href="https://claude.ai"
          target="_blank"
          rel="noreferrer"
          className="text-primary-7 inline-flex items-center gap-0.5 underline underline-offset-2"
        >
          claude.ai
          <RiExternalLinkLine className="size-3.5" />
        </a>{' '}
        or the Claude desktop app and pick <strong>Plugins</strong> in the left sidebar. Then open
        the <strong>Add</strong> menu and choose <strong>Add marketplace</strong>.
      </p>
    ),
    image: {
      src: `${IMAGES}/01-plugins.webp`,
      width: 1440,
      height: 236,
      alt: 'The Plugins page in Claude, with the Add menu open on Add marketplace',
    },
  },
  {
    title: 'Add the Open Brain Institute marketplace',
    body: (
      <>
        <p>In the URL field, enter the repository and press Sync:</p>
        <CopyValue value={MARKETPLACE_REPOSITORY} />
        <p>Leave “Sync automatically” on so you get new versions of the plugin as they come out.</p>
      </>
    ),
    image: {
      src: `${IMAGES}/02-marketplace.webp`,
      width: 430,
      height: 300,
      alt: 'The Add marketplace dialog with openbraininstitute/obi-skills entered',
    },
  },
  {
    title: 'Open the plugin',
    body: (
      <p>
        <strong>Open Brain Institute</strong> now appears in the list. Click it to open its page.
      </p>
    ),
    image: {
      src: `${IMAGES}/03-discover.webp`,
      width: 760,
      height: 200,
      alt: 'The Open Brain Institute plugin listed under Discover',
    },
  },
  {
    title: 'Connect the obi connector',
    body: (
      <p>
        The plugin comes with skills and the <strong>obi</strong> connector, which lets Claude reach
        the platform. Click <strong>Connect</strong> next to it.
      </p>
    ),
    image: {
      src: `${IMAGES}/04-connect.webp`,
      width: 760,
      height: 560,
      alt: 'The Open Brain Institute plugin page, with Connect next to the obi connector',
    },
  },
  {
    title: 'Check the server and continue',
    body: (
      <>
        <p>The name and the server URL are already filled in. They should read:</p>
        <CopyValue value={MCP_SERVER_URL} />
        <p>
          Click <strong>Continue</strong>.
        </p>
      </>
    ),
    image: {
      src: `${IMAGES}/05-connector.webp`,
      width: 420,
      height: 370,
      alt: 'The Add custom connector dialog with the OBI server URL',
    },
  },
  {
    title: 'Use the OBI sign-in client',
    body: (
      <>
        <p>
          Under <strong>Authentication</strong>, keep <strong>Sign in now</strong>. Under{' '}
          <strong>OAuth client</strong>, choose <strong>Use your own OAuth client</strong> and enter
          this client ID:
        </p>
        <CopyValue value={OAUTH_CLIENT_ID} />
        <p>
          Leave the client secret empty and click <strong>Add</strong>.
        </p>
      </>
    ),
    image: {
      src: `${IMAGES}/06-oauth-client.webp`,
      width: 420,
      height: 940,
      alt: 'The connector sign-in settings, with Use your own OAuth client chosen and obi-mcp as the client ID',
    },
  },
  {
    title: 'Log in to the Open Brain Institute',
    body: (
      <p>
        A new window opens on the OBI login page. Log in with the account you use on the platform.
        When it closes, the connector shows as <strong>Connected</strong>.
      </p>
    ),
    image: {
      src: `${IMAGES}/07-login.webp`,
      width: 600,
      height: 360,
      alt: 'The Open Brain Institute login page',
    },
  },
  {
    title: 'Choose what Claude may do without asking',
    body: (
      <p>
        On the plugin’s <strong>Permissions</strong> tab you decide, tool by tool, whether Claude
        asks you first. <strong>Needs approval</strong> is the safe default; choose{' '}
        <strong>Always allow</strong> for the tools you are happy for it to use on its own.
        Simulations and sandbox runs use your project’s credits.
      </p>
    ),
    image: {
      src: `${IMAGES}/08-permissions.webp`,
      width: 760,
      height: 360,
      alt: 'The Permissions tab of the plugin, with the Always allow option',
    },
  },
  {
    title: 'Try it',
    body: (
      <>
        <p>Start a new chat and ask something about the platform, for example:</p>
        <CopyValue value={EXAMPLE_PROMPT} />
        <p>
          Claude answers with what it finds on the platform, with links that open it here in your
          virtual lab.
        </p>
      </>
    ),
    image: {
      src: `${IMAGES}/09-try.webp`,
      width: 600,
      height: 320,
      alt: 'A Claude chat answering with a small cortical microcircuit from the OBI platform',
    },
  },
];

const SCREENSHOTS: Screenshot[] = STEPS.map((step, index) => ({
  ...step.image,
  caption: `Step ${index + 1}: ${step.title}`,
}));

export function ClaudePluginSetup() {
  return (
    <article className="text-primary-8 flex max-w-5xl flex-col gap-8 pb-16">
      <header className="flex flex-col gap-3">
        <div className="flex flex-row items-center gap-3">
          <span className="bg-primary-0 flex size-11 items-center justify-center rounded-full">
            <ClaudeLogo className="size-6" />
          </span>
          <h1 className="text-3xl font-bold">Use OBI from Claude</h1>
        </div>
        <p className="max-w-3xl text-base leading-relaxed">
          The Open Brain Institute plugin lets Claude search the platform’s data, build and analyse
          models, and run simulations in your virtual lab, all from a chat. Setting it up takes a
          couple of minutes and you only do it once.
        </p>
        <p className="text-sm text-neutral-600">
          You need a Claude account that can add plugins, and an Open Brain Institute account.
        </p>
      </header>

      <ScreenshotLightbox screenshots={SCREENSHOTS}>
        <ol className="flex flex-col gap-10">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-1 gap-5 border-t border-neutral-200 pt-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-row items-center gap-3">
                  <span className="bg-primary-8 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                </div>
                <div className="flex flex-col items-start gap-3 text-sm leading-relaxed">
                  {step.body}
                </div>
              </div>
              <figure className="flex items-start justify-center">
                <LightboxScreenshot index={index} />
              </figure>
            </li>
          ))}
        </ol>
      </ScreenshotLightbox>
    </article>
  );
}
