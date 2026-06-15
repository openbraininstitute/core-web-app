import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/ui/molecules/stepper';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <Stepper defaultValue={2} className="w-[640px]">
      <StepperNav>
        <StepperItem step={1}>
          <StepperTrigger>
            <StepperIndicator>1</StepperIndicator>
            <StepperTitle>Define</StepperTitle>
            <StepperDescription>Pick the entity</StepperDescription>
          </StepperTrigger>
          <StepperSeparator />
        </StepperItem>
        <StepperItem step={2}>
          <StepperTrigger>
            <StepperIndicator>2</StepperIndicator>
            <StepperTitle>Configure</StepperTitle>
            <StepperDescription>Set parameters</StepperDescription>
          </StepperTrigger>
          <StepperSeparator />
        </StepperItem>
        <StepperItem step={3}>
          <StepperTrigger>
            <StepperIndicator>3</StepperIndicator>
            <StepperTitle>Launch</StepperTitle>
            <StepperDescription>Run the simulation</StepperDescription>
          </StepperTrigger>
        </StepperItem>
      </StepperNav>
      <StepperPanel className="mt-6">
        <StepperContent value={1}>Step 1 content.</StepperContent>
        <StepperContent value={2}>Step 2 content.</StepperContent>
        <StepperContent value={3}>Step 3 content.</StepperContent>
      </StepperPanel>
    </Stepper>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Stepper defaultValue={1} orientation="vertical" className="w-[480px]">
      <StepperNav>
        <StepperItem step={1}>
          <StepperTrigger>
            <StepperIndicator>1</StepperIndicator>
            <StepperTitle>Build morphology</StepperTitle>
          </StepperTrigger>
          <StepperSeparator />
        </StepperItem>
        <StepperItem step={2}>
          <StepperTrigger>
            <StepperIndicator>2</StepperIndicator>
            <StepperTitle>Fit ion channels</StepperTitle>
          </StepperTrigger>
          <StepperSeparator />
        </StepperItem>
        <StepperItem step={3}>
          <StepperTrigger>
            <StepperIndicator>3</StepperIndicator>
            <StepperTitle>Validate</StepperTitle>
          </StepperTrigger>
        </StepperItem>
      </StepperNav>
    </Stepper>
  ),
};
