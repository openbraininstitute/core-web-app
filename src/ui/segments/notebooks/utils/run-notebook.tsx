import { env } from '@/env';
import { Notebook } from '@/util/virtual-lab/types';

const runNotebook = async (notebook: Notebook) => {
  const repo = `https://github.com/${notebook.githubUser}/${notebook.githubRepo}`;
  const urlpath = `lab/tree/${notebook.githubRepo}/${notebook.path}`;

  const environment = env.NEXT_PUBLIC_DEPLOYMENT_ENV;
  const subdomain = environment === 'production' ? 'www' : 'staging';

  // Metabolism notebook requires a separate jupyterhub instance
  const jupyterHubBasePath =
    notebook.name === 'Metabolism' ? 'jupyterhub_metabolism' : 'jupyterhub';

  const url = new URL(`https://${subdomain}.openbraininstitute.org`);
  url.pathname = `${jupyterHubBasePath}/hub/user-redirect/git-pull`;
  url.searchParams.append('repo', repo);
  url.searchParams.append('urlpath', urlpath);
  url.searchParams.append('branch', 'main');

  window.open(url, '_blank');
};

export default runNotebook;
