# Backup Plots

Some tools, like `plot-generator`, generate images that need to be displayed in the chat.
This component renders those images as a backup when they're not already embedded in the markdown message text.

When used in the agent, tools create a file with an `id`.
This file is attached to the thread and will be deleted when the thread is deleted.
We can call the agent `storage/${fileIdentifier}/presigned-url` endpoint with this id to get the URL of the file.
When getting the file content, we will have a response header with the type: `X-Amz-Meta-Category`.

To get the file content and its type, we can use `serviceAiAgentStorageGetFileContent()` from `src/services/ai-agent/api/storage.ts`.

In `tools/` we have all the components for rendering different types of tool-generated images.
They must all export a type guard for the tool result.

## Example

Let's create a custom component for `plot-generator`.

We start by creating the file `tools/tool-plot-generator/tool-plot-generator.tsx` which exports:

- `ToolPlotGenerator`: the component with the property `results` of type `ToolPlotGeneratorResult[]`.
- `isToolPlotGeneratorResult()`: the type guard used upstream to know if we display this component.

Finally, we add this piece of code into `backup-plots.tsx`:

```tsx
<div className={classNames(className, styles.backupPlots)}>
  <ToolPlotGenerator
    results={extractToolsResults(message, ['plot-generator'], isToolPlotGeneratorResult)}
  />
</div>
```
