# Tools components

Some tools, like `plot-generator`, need a custom component to display their result.

When used in the agent, they will create a file with an `id`.
This file is attached to the thread and will be deleted when the thread will be.
We can call the agent `storage/${fileIdentifier}/presigned-url` entrypoint with this id to get the URL of the file.
When getting the file content, we will have a response header with the type: `X-Amz-Meta-Category`.

To get the file content and its type, we can use `serviceAiAgentStorageGetFileContent() from`src/services/ai-agent/api/storage.ts`.

In `tools/` we have all the components for the different tools.
They must all export a type guard for the tool result.

## Example

Let's create a tool custom component for `plot-generator`.

We start by creating the file `tools/tool-plot-generator/toll-plot-generator.tsx` which exports:

- `ToolPlotGenerator`: the component with the property `results` of type `ToolPlotGeneratorResult[]`.
- `isToolPlotGeneratorResult()`: the type guard used upstream to know if we display this component.

Finally, we add this piece of code into `tools-components.tsx`:

```tsx
<div className={classNames(className, styles.toolsComponents)}>
  <ToolPlotGenerator
    results={extractToolsResults(message, ['plot-generator'], isToolPlotGeneratorResult)}
  />
</div>
```
