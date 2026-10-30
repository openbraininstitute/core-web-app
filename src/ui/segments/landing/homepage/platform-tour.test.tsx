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

  it('automatically shows all eleven examples, featured first within each chapter', () => {
    render(<PlatformTour />);
    const root = screen.getByRole('region', { name: 'Inside Virtual Labs: platform tour' });
    fireEvent(root, pointer('pointerover'));
    fireEvent.focus(chapter('Explore'));
    expect(chapter('Explore')).toHaveAttribute('aria-pressed', 'true');
    advance(60000);
    expectSlide('Explore data. Build models. Run simulations.');
    finishVideo();
    expectSlide('Turn EM meshes into neuronal skeletons.');
    advance(16000);
    expectSlide('Bring your models into Virtual Labs.');
    advance(60000);
    expectSlide('Bring your models into Virtual Labs.');
    finishVideo();
    expectSlide('Build a circuit. Run an experiment.');
    expect(chapter('Build & simulate')).toHaveAttribute('aria-pressed', 'true');
    finishVideo();
    expectSlide('See extracellular fields evolve.');
    advance();
    expectSlide('Discover patterns in firing.');
    advance();
    expectSlide('Follow the electrical response.');
    expect(chapter('Analyze')).toHaveAttribute('aria-pressed', 'true');
    advance();
    expectSlide('Compare activity across cell types.');
    advance();
    expectSlide('Run your own analyses.');
    advance();
    expectSlide('Work through conversation.');
    advance();
    expectSlide('Teach neuroscience by doing.');
    finishVideo();
    expectSlide('Explore data. Build models. Run simulations.');
    expect(chapter('Explore')).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens each chapter at its featured example and restarts playback after selection', () => {
    render(<PlatformTour />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause tour' }));
    fireEvent.click(chapter('Build & simulate'));
    const video = screen.getByLabelText(/Animated 3D FlyWire Drosophila model/);
    expect(video).toHaveAttribute('autoplay');
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.contexts).toContain(video);
    finishVideo();
    expectSlide('Build a circuit. Run an experiment.');
    fireEvent.click(chapter('Build & simulate'));
    expectSlide('Bring your models into Virtual Labs.');
    fireEvent.click(chapter('Analyze'));
    expectSlide('Discover patterns in firing.');
    advance();
    expectSlide('Follow the electrical response.');
    fireEvent.click(chapter('Analyze'));
    expectSlide('Discover patterns in firing.');
    advance(11999);
    expectSlide('Discover patterns in firing.');
    advance(1);
    expectSlide('Follow the electrical response.');
    fireEvent.click(chapter('Ask AI'));
    expectSlide('Work through conversation.');
    fireEvent.click(chapter('Teach & learn'));
    expectSlide('Teach neuroscience by doing.');
    fireEvent.click(chapter('Explore'));
    expectSlide('Explore data. Build models. Run simulations.');
    fireEvent.click(chapter('Skeletonize'));
    expectSlide('Turn EM meshes into neuronal skeletons.');
  });

  it('shows only six chapter choices and the playback control, without example menus', () => {
    render(<PlatformTour />);
    for (const name of [
      'Explore',
      'Skeletonize',
      'Build & simulate',
      'Analyze',
      'Ask AI',
      'Teach & learn',
    ]) {
      fireEvent.click(chapter(name));
      expect(screen.getAllByRole('button')).toHaveLength(7);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Choose an example:/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Example:', { exact: true })).not.toBeInTheDocument();
    }
  });

  it('continues using a timed fallback if any video fails to load', () => {
    render(<PlatformTour />);
    fireEvent.error(screen.getByLabelText(/Animated overview of brain models/));
    advance(14500);
    expectSlide('Turn EM meshes into neuronal skeletons.');
    fireEvent.click(chapter('Build & simulate'));
    fireEvent.error(screen.getByLabelText(/Animated 3D FlyWire Drosophila model/));
    advance(4000);
    expectSlide('Build a circuit. Run an experiment.');
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
    expectSlide('Build a circuit. Run an experiment.');
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
    expect(
      screen.getByRole('img', { name: /Animated 3D FlyWire Drosophila model/ })
    ).toHaveAttribute('src', '/images/homepage/flywire-platform-poster.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Pause tour' }));
    advance(60000);
    expectSlide('Bring your models into Virtual Labs.');
    fireEvent.click(screen.getByRole('button', { name: 'Play tour' }));
    advance(4000);
    advance(8500);
    expect(
      screen.getByRole('img', { name: /Animated layer 4 extracellular field/ })
    ).toHaveAttribute('src', '/images/homepage/lfp-light-traces-poster.png');
    expect(document.querySelector('video')).not.toBeInTheDocument();
  });
});
