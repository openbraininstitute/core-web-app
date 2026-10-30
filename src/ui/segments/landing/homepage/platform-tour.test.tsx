import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlatformTour from './platform-tour';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function chapter(name: string) {
  return within(
    screen.getByRole('group', { name: 'Choose a research or teaching chapter' })
  ).getByRole('button', { name });
}
function chooseExample(name: string) {
  const group = screen.getByRole('group', { name: 'Examples in the selected chapter' });
  for (let step = 0; step < 4; step += 1) {
    if (screen.getByTestId('current-example').textContent === name) return;
    fireEvent.click(within(group).getByRole('button', { name: 'Next example' }));
  }
  expect(screen.getByTestId('current-example')).toHaveTextContent(name);
}
function expectSlide(title: string) {
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
}
function advance(duration = 12000) {
  act(() => vi.advanceTimersByTime(duration));
}
function finishVideo() {
  const video = document.querySelector('video');
  expect(video).not.toBeNull();
  expect(video).not.toHaveAttribute('loop');
  if (video) fireEvent.ended(video);
}
function pointer(type: string, x = 0, y = 0) {
  return Object.assign(new Event(type, { bubbles: true }), {
    clientX: x,
    clientY: y,
    pointerType: 'mouse',
  });
}

describe('guided platform tour', () => {
  it('puts the requested text below chapter selectors and restores the original hero captions', () => {
    render(<PlatformTour />);
    const description = screen.getByTestId('chapter-description');
    const exploreCopy =
      'Explore morphologies, electrophysiological recordings, ion channels, circuits, and models across different species.';
    expect(description).toHaveTextContent(exploreCopy);
    expect(description.parentElement?.previousElementSibling).toHaveAttribute(
      'aria-label',
      'Choose a research or teaching chapter'
    );
    expect(
      within(screen.getByRole('heading').parentElement!).queryByText(exploreCopy)
    ).not.toBeInTheDocument();
    fireEvent.click(chapter('Skeletonize'));
    expect(description).toHaveTextContent(
      'Skeletonize electron microscopy meshes from MICrONS, H01, or your own data.'
    );
    expect(
      within(screen.getByRole('heading').parentElement!).getByText(
        'Inspect detailed cell meshes and discover skeletonization tools.'
      )
    ).toBeInTheDocument();
    fireEvent.click(chapter('Ask AI'));
    expect(description).toHaveTextContent(
      'Connect the OBI Plugin to your AI assistant and start prompting.'
    );
    expect(
      within(screen.getByRole('heading').parentElement!).getByText(
        'Explore data and workflows with a compatible AI assistant.'
      )
    ).toBeInTheDocument();
  });

  it('completes each video and cycles through six chapters while pointer and focus stay in the hero', () => {
    render(<PlatformTour />);
    const root = screen.getByRole('region', { name: 'Inside Virtual Labs: platform tour' });
    fireEvent(root, pointer('pointerover'));
    fireEvent.focus(chapter('Explore'));
    expect(chapter('Explore')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Models overview' })).not.toBeInTheDocument();
    advance(60000);
    expectSlide('Explore data. Build models. Run simulations.');
    finishVideo();
    expectSlide('Turn EM meshes into neuronal skeletons.');
    advance(16000);
    expectSlide('Bring your models into Virtual Labs.');
    advance(60000);
    expectSlide('Bring your models into Virtual Labs.');
    finishVideo();
    expectSlide('Discover patterns in firing.');
    advance();
    expectSlide('Work through conversation.');
    advance();
    expectSlide('Teach neuroscience by doing.');
    finishVideo();
    expectSlide('Explore data. Build models. Run simulations.');
    expect(chapter('Explore')).toHaveAttribute('aria-pressed', 'true');
    finishVideo();
    expectSlide('Turn EM meshes into neuronal skeletons.');
  });

  it('plays a clicked chapter or example once and automatically continues to the next chapter', () => {
    render(<PlatformTour />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause tour' }));
    fireEvent.click(chapter('Build & simulate'));
    const video = screen.getByLabelText(/Animated 3D FlyWire Drosophila model/);
    expect(video).toHaveAttribute('autoplay');
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.contexts).toContain(video);
    finishVideo();
    expectSlide('Discover patterns in firing.');

    fireEvent.click(chapter('Build & simulate'));
    chooseExample('Microcircuits');
    expectSlide('Build a circuit. Run an experiment.');
    finishVideo();
    expectSlide('Discover patterns in firing.');
    fireEvent.click(chapter('Build & simulate'));
    chooseExample('Extracellular fields');
    advance();
    expectSlide('Discover patterns in firing.');

    fireEvent.click(chapter('Skeletonize'));
    advance(15999);
    expectSlide('Turn EM meshes into neuronal skeletons.');
    advance(1);
    expectSlide('Bring your models into Virtual Labs.');
    fireEvent.click(chapter('Teach & learn'));
    finishVideo();
    expectSlide('Explore data. Build models. Run simulations.');
    fireEvent.click(chapter('Explore'));
    finishVideo();
    expectSlide('Turn EM meshes into neuronal skeletons.');
  });

  it('keeps all eleven examples reachable under the six chapters', () => {
    render(<PlatformTour />);
    expect(
      screen.queryByRole('group', { name: 'Examples in the selected chapter' })
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Animated overview of brain models/)).toHaveAttribute(
      'src',
      '/images/homepage/models-overview.mp4'
    );
    for (const [name, items] of [
      [
        'Build & simulate',
        [
          ['Import models', 'Bring your models into Virtual Labs.'],
          ['Microcircuits', 'Build a circuit. Run an experiment.'],
          ['Extracellular fields', 'See extracellular fields evolve.'],
        ],
      ],
      [
        'Analyze',
        [
          ['Voltage traces', 'Follow the electrical response.'],
          ['Spike activity', 'Discover patterns in firing.'],
          ['Activity analysis', 'Compare activity across cell types.'],
          ['Notebooks', 'Run your own analyses.'],
        ],
      ],
    ] as const) {
      fireEvent.click(chapter(name));
      expect(
        within(screen.getByRole('group', { name: 'Examples in the selected chapter' })).getByText(
          'Example:',
          { exact: true }
        )
      ).toBeInTheDocument();
      for (const [label, title] of items) {
        chooseExample(label);
        expectSlide(title);
        expect(screen.getByTestId('current-example')).toHaveTextContent(label);
      }
      const examples = screen.getByRole('group', { name: 'Examples in the selected chapter' });
      expect(within(examples).getAllByRole('button')).toHaveLength(2);
      fireEvent.click(within(examples).getByRole('button', { name: 'Next example' }));
      expect(screen.getByTestId('current-example')).toHaveTextContent(items[0][0]);
      fireEvent.click(within(examples).getByRole('button', { name: 'Previous example' }));
      expect(screen.getByTestId('current-example')).toHaveTextContent(items[items.length - 1][0]);
    }
    fireEvent.click(chapter('Skeletonize'));
    expect(
      screen.getByRole('img', { name: /Animated electron microscopy cell mesh/ })
    ).toHaveAttribute('src', '/images/homepage/em-cell-mesh.webp');
    fireEvent.click(chapter('Ask AI'));
    expect(screen.getByRole('link', { name: 'View AI chat example at full size' })).toHaveAttribute(
      'href',
      '/images/homepage/ai-chat-platform.png'
    );
    fireEvent.click(chapter('Teach & learn'));
    expect(screen.getByLabelText(/Students exploring neuroscience/)).toHaveAttribute(
      'src',
      '/images/homepage/education.mp4'
    );
  });

  it('continues using a timed fallback if any video fails to load', () => {
    render(<PlatformTour />);
    fireEvent.error(screen.getByLabelText(/Animated overview of brain models/));
    advance(14500);
    expectSlide('Turn EM meshes into neuronal skeletons.');
    fireEvent.click(chapter('Build & simulate'));
    fireEvent.error(screen.getByLabelText(/Animated 3D FlyWire Drosophila model/));
    advance(4000);
    expectSlide('Discover patterns in firing.');
  });

  it('supports keyboard chapter selection and swipes without hijacking vertical scrolling', () => {
    render(<PlatformTour />);
    fireEvent.keyDown(chapter('Explore'), { key: 'ArrowLeft' });
    expect(chapter('Teach & learn')).toHaveFocus();
    expectSlide('Teach neuroscience by doing.');
    fireEvent.keyDown(chapter('Teach & learn'), { key: 'Home' });
    expect(chapter('Explore')).toHaveFocus();
    const viewport = screen.getByTestId('tour-viewport');
    const touch = (type: string, x: number, y: number) =>
      Object.assign(pointer(type, x, y), { pointerType: 'touch' });
    fireEvent(viewport, touch('pointerdown', 250, 100));
    fireEvent(viewport, touch('pointerup', 150, 105));
    expectSlide('Turn EM meshes into neuronal skeletons.');
    fireEvent(viewport, touch('pointerdown', 250, 100));
    fireEvent(viewport, touch('pointerup', 240, 220));
    expectSlide('Turn EM meshes into neuronal skeletons.');
  });

  it('pauses both playback and automatic advancement and resumes using Play', () => {
    render(<PlatformTour />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause tour' }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    advance(60000);
    expectSlide('Explore data. Build models. Run simulations.');
    fireEvent.click(screen.getByRole('button', { name: 'Play tour' }));
    finishVideo();
    advance(5000);
    fireEvent.click(screen.getByRole('button', { name: 'Pause tour' }));
    advance(24000);
    expectSlide('Turn EM meshes into neuronal skeletons.');
    expect(
      screen.getByRole('img', { name: /Animated electron microscopy cell mesh/ })
    ).toHaveAttribute('src', '/images/homepage/em-cell-mesh-poster.png');
    fireEvent.click(screen.getByRole('button', { name: 'Play tour' }));
    advance(16000);
    expectSlide('Bring your models into Virtual Labs.');
    finishVideo();
    expectSlide('Discover patterns in firing.');
  });

  it('suspends advancement when the browser tab is hidden or the hero is offscreen', () => {
    let notify: IntersectionObserverCallback | undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      }
    );
    render(<PlatformTour />);
    finishVideo();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    advance(24000);
    expectSlide('Turn EM meshes into neuronal skeletons.');
    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    act(() =>
      notify?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver)
    );
    advance(24000);
    expectSlide('Turn EM meshes into neuronal skeletons.');
    act(() =>
      notify?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    );
    advance(16000);
    expectSlide('Bring your models into Virtual Labs.');
  });

  it('uses still posters and manual navigation when reduced motion is requested', () => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true });
    render(<PlatformTour />);
    advance(60000);
    expect(screen.getByRole('img', { name: /Animated overview of brain models/ })).toHaveAttribute(
      'src',
      '/images/homepage/models-overview-poster.jpg'
    );
    fireEvent.click(chapter('Skeletonize'));
    expect(
      screen.getByRole('img', { name: /Animated electron microscopy cell mesh/ })
    ).toHaveAttribute('src', '/images/homepage/em-cell-mesh-poster.png');
    fireEvent.click(chapter('Build & simulate'));
    chooseExample('Extracellular fields');
    expect(
      screen.getByRole('img', { name: /Animated layer 4 extracellular field/ })
    ).toHaveAttribute('src', '/images/homepage/lfp-light-traces-poster.png');
    expect(document.querySelector('video')).not.toBeInTheDocument();
  });
});
