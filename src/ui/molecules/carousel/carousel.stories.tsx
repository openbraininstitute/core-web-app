import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/ui/molecules/carousel';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Carousel',
  component: Carousel,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const slides = ['Hippocampus', 'Cortex', 'Thalamus', 'Cerebellum', 'Brainstem'];

export const Default: Story = {
  render: () => (
    <div className="w-[480px]">
      <Carousel className="relative">
        <CarouselContent>
          {slides.map((label) => (
            <CarouselItem key={label} className="basis-full">
              <div className="bg-neutral-1 flex h-40 items-center justify-center rounded-md">
                <span className="text-2xl font-semibold">{label}</span>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};

export const Multi: Story = {
  render: () => (
    <div className="w-[600px]">
      <Carousel className="relative">
        <CarouselContent>
          {slides.map((label) => (
            <CarouselItem key={label} className="basis-1/3">
              <div className="bg-neutral-1 flex h-32 items-center justify-center rounded-md text-sm">
                {label}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};
