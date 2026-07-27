# Notebook workbench

Runs an analysis notebook **inside the workspace**, on the same AWS-spawned
JupyterHub pod the platform already uses, with the AI assistant still in its rail
beside it. Before this, "Run notebook" called `window.open(pod.url)` and the user
left the app.

The UI is custom — none of the JupyterLab frontend is used. It speaks Jupyter's
protocol through [`@jupyterlab/services`](https://www.npmjs.com/package/@jupyterlab/services),
which is the protocol client, not the UI.

## Flow

1. `useRunNotebook({ …, embed: true })` navigates to
   `…/notebooks/run/{type}/{id}` instead of opening a tab.
2. `RunNotebookView` calls the existing `startNotebook()` — same notebook
   service, same accounting, same `cloud` value (`aws`, `cell_a`, …) — and gets
   back the pod URL.
3. `parsePodUrl()` splits that URL into the server root and the notebook path,
   because the service returns a *JupyterLab* URL (`…/user/x/lab/tree/n.ipynb`).
4. `JupyterProvider` builds one `ServiceManager` for that pod; the workbench
   drives it over REST + websockets.

The pod is spawned by the page rather than the click handler so the URL — which
can carry a token — never passes through the address bar, and so a reload
reconnects instead of dead-ending.

## Blocked on two backend changes (verified against staging)

A real pod was spawned on AWS from this UI and the front end worked end to end —
navigation, `startNotebook`, URL parsing, rendering. The pod then refused to talk
to the browser. Two distinct causes, both confirmed with `curl` against the
staging hub (`jupyterhub.staging.openbrainplatform.com`):

**1. The returned URL is an OAuth bootstrap, not an API base.**
`startNotebook()` returns `…/hub/user/<user>/<server>/`, which `302`s to Keycloak.
The single-user API lives at `…/user/<user>/<server>/`, and reaching it needs a
session cookie obtained through a full browser navigation. An embedded client
needs a **JupyterHub API token** instead — notebook_service already holds
`HUB_ON_EKS_ADMIN_TOKEN`, so it can mint one via
`POST /hub/api/users/{name}/tokens` and return it next to `url`.

**2. The single-user server sends no CORS headers.**
An `OPTIONS` preflight for `/api/kernels` returns `405` with
`access-control-allow-headers` but **no `access-control-allow-origin`**, so the
browser blocks every call. It also sets `content-security-policy:
frame-ancestors 'none'`, so an iframe fallback is not available either. Needs, on
the singleuser server:

```python
c.ServerApp.allow_origin = "https://<app-origin>"   # or allow_origin_pat
```

which also governs the websocket origin check.

Until both land, the page detects the unreachable pod with a single probe and
shows an explanatory panel with **Open in JupyterHub** — today's behaviour — so
the feature degrades instead of showing an editor that silently does nothing.

The workbench UI itself is proven against a real kernel; see the standalone
`obi-lab` project.

## Local development

Point the workbench at a Jupyter server you already run, skipping the spawn:

```bash
# .env.local — only honoured when DEPLOYMENT_ENV=local
NEXT_PUBLIC_NOTEBOOK_DEV_URL=http://127.0.0.1:8890/lab/tree/Welcome.ipynb?token=obi-lab
```

That server needs `--ServerApp.allow_origin=http://localhost:3000`.

## Layout

```
jupyter/       connection (per-pod ServiceManager) + context, session/kernel, contents
notebook/      nbformat model, output accumulation, notebook controller
components/    cell, CodeMirror editor, output renderers, toolbar, file browser, file editor
ui/            menu, tooltip, modal (Button comes from @/ui/molecules/button)
workbench.tsx  the embedded shell — files panel, tabs, "Ask the assistant"
```

`run-notebook-view.tsx` is the entry point; `workbench.css` styles only what
CodeMirror and kernel output render into — colours and fonts come from the app's
`globals.css`.

## Scope

Templates only. Notebook **results** still open in JupyterHub, since the run page
resolves the entity as an `analysis_notebook_template`. ipywidgets are not
supported (outputs show a placeholder); no terminal, no collaborative editing.
