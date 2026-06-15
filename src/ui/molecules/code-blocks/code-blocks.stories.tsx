import { CodeBlock, CodeBlockCopyButton, CodeBlockLanguageLabel } from '@/ui/molecules/code-blocks';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/CodeBlock',
  component: CodeBlock,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

const TS_SNIPPET = `import { Button } from '@/ui/molecules/button';

export function Confirm({ onOk }: { onOk: () => void }) {
  return <Button onClick={onOk}>Confirm</Button>;
}`;

const PY_SNIPPET = `import bluepyemodel as bpem

model = bpem.load_model("ca1_pyramidal")
print(model.summary())`;

export const TypeScript: Story = {
  render: () => (
    <div className="w-[640px]">
      <CodeBlock code={TS_SNIPPET} language="ts">
        <div className="flex items-center justify-between border-b border-neutral-2 px-4 py-2">
          <CodeBlockLanguageLabel />
          <CodeBlockCopyButton />
        </div>
      </CodeBlock>
    </div>
  ),
};

export const Python: Story = {
  render: () => (
    <div className="w-[640px]">
      <CodeBlock code={PY_SNIPPET} language="python" showLineNumbers>
        <div className="flex items-center justify-between border-b border-neutral-2 px-4 py-2">
          <CodeBlockLanguageLabel />
          <CodeBlockCopyButton />
        </div>
      </CodeBlock>
    </div>
  ),
};

export const NoToolbar: Story = {
  render: () => (
    <div className="w-[640px]">
      <CodeBlock code={TS_SNIPPET} language="ts" />
    </div>
  ),
};
