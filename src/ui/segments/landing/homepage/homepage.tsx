'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import PlatformTour from './platform-tour';

import type { KeyboardEvent } from 'react';

import styles from './homepage.module.css';

export default function Homepage({
  year,
  isAuthenticated = false,
}: {
  year: number;
  isAuthenticated?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerDocked, setHeaderDocked] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const researchAction = isAuthenticated ? 'Open Virtual Labs' : 'Try it now';

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const updateHeader = () => setHeaderDocked(hero.getBoundingClientRect().bottom <= 0);
    updateHeader();

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(updateHeader, { threshold: 0 });
      observer.observe(hero);
      return () => observer.disconnect();
    }

    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader);
    return () => {
      window.removeEventListener('scroll', updateHeader);
      window.removeEventListener('resize', updateHeader);
    };
  }, []);

  function closeMenuOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }

  return (
    <div className={styles.homepage}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>

      <header
        className={`${styles['site-header']} ${styles.wrap} ${headerDocked ? styles.docked : ''}`}
        data-testid="site-header"
        data-docked={headerDocked}
      >
        <Link href="/" className={styles.wordmark} aria-label="Open Brain Institute home">
          <Image src="/images/obi_logo.svg" alt="Open Brain Institute" width={177} height={57} />
        </Link>
        <nav
          aria-label="Main navigation"
          id="homepage-navigation"
          className={menuOpen ? styles.open : undefined}
          onClick={() => setMenuOpen(false)}
          onKeyDown={closeMenuOnEscape}
        >
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/news">News</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link
            className={`${styles.button} ${styles.small} ${styles.white}`}
            href="/app/virtual-lab/sync"
            prefetch={false}
            data-testid="header-desktop-link-app-virtual-lab"
          >
            {isAuthenticated ? 'Open Virtual Labs' : 'Sign up'}
          </Link>
        </nav>
        <button
          className={styles['menu-toggle']}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          type="button"
          aria-controls="homepage-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
          ref={menuButtonRef}
        >
          Menu <span>＋</span>
        </button>
      </header>

      <main id="main">
        <div className={styles['blue-world']} ref={heroRef}>
          <PlatformTour>
            {({ slide: tourSlide, playing, controls }) => (
              <section className={styles.hero} aria-labelledby="hero-title">
                <div className={styles['hero-copy']}>
                  <div className={styles['hero-heading']}>
                    <p className={styles['hero-label']}>Neuroscience at the speed of thought</p>
                    <h1
                      id="hero-title"
                      data-testid="home-hero-heading"
                      aria-label={tourSlide.title}
                      key={tourSlide.id}
                      className={tourSlide.id === 'models' ? undefined : styles['slide-heading']}
                    >
                      {tourSlide.titleLines
                        ? tourSlide.titleLines.map((line) => (
                            <span className={styles['title-line']} key={line}>
                              {line === 'Run simulations.' ? <em>{line}</em> : line}{' '}
                            </span>
                          ))
                        : tourSlide.title}
                    </h1>
                  </div>
                  <div className={styles['hero-intro']}>
                    <div
                      id="tour-caption"
                      className={styles['tour-caption']}
                      aria-live={playing ? 'off' : 'polite'}
                      aria-atomic="true"
                    >
                      <p className={styles['hero-description']}>{tourSlide.description}</p>
                    </div>
                    <div className={styles['hero-actions']}>
                      <Link
                        className={`${styles.button} ${styles.blue}`}
                        href="/app/virtual-lab/sync"
                        prefetch={false}
                        data-testid="virtual-labs-link"
                      >
                        {researchAction}
                      </Link>
                    </div>
                    <p className={styles.reassurance}>
                      {isAuthenticated
                        ? 'Welcome back. Continue your research.'
                        : 'Free account · 100 initial credits included'}
                    </p>
                  </div>
                </div>
                {controls}
              </section>
            )}
          </PlatformTour>
        </div>
        <section
          className={`${styles['early-adopters']} ${styles.wrap}`}
          aria-label="Existing early adopters"
        >
          <p>
            Among OBI’s
            <br />
            <strong>early adopters</strong>
          </p>
          <div className={styles['adopter-names']}>
            <span>
              Hebrew University
              <br />
              <small>of Jerusalem</small>
            </span>
            <span className={styles.mila}>
              mila<span className={styles['mila-dot']}>.</span>
            </span>
            <span>
              Université
              <br />
              <strong>de Montréal</strong>
            </span>
            <span className={styles.itis}>
              IT’IS <small>Foundation</small>
            </span>
            <span className={styles.uc3m}>
              uc3m <small>Universidad Carlos III de Madrid</small>
            </span>
          </div>
        </section>
        <section className={`${styles.research} ${styles.wrap} ${styles.section}`} id="research">
          <div className={styles['section-intro']}>
            <h2>
              Start with a question.
              <br />
              Find your way in.
            </h2>
            <p>
              You don’t need to build a whole brain to make a discovery. Start with the data, model,
              or experiment that matters to your research.
            </p>
          </div>
          <div className={styles['research-rows']}>
            <Link href="#preview" className={styles['research-row']}>
              <span className={styles['row-number']}>01</span>
              <div className={styles['row-title']}>
                <span>DATA & MORPHOLOGY</span>
                <h3>Find the right data.</h3>
              </div>
              <p>
                Explore curated neuronal reconstructions and experimental data. Inspect what you
                need before building your next model.
              </p>
              <span className={styles['row-action']}>
                View the platform <b>↗</b>
              </span>
            </Link>
            <Link href="#preview" className={styles['research-row']}>
              <span className={styles['row-number']}>02</span>
              <div className={styles['row-title']}>
                <span>MODELS & SIMULATION</span>
                <h3>Test a hypothesis.</h3>
              </div>
              <p>
                Work with single neurons and circuits. Set a stimulus, run a virtual experiment, and
                investigate the response.
              </p>
              <span className={styles['row-action']}>
                View a simulation <b>↗</b>
              </span>
            </Link>
            <Link href="#preview" className={styles['research-row']}>
              <span className={styles['row-number']}>03</span>
              <div className={styles['row-title']}>
                <span>ANALYSIS & NOTEBOOKS</span>
                <h3>Make sense of results.</h3>
              </div>
              <p>
                Use notebooks to analyze your data and models, and share your work with colleagues
                in a common workspace.
              </p>
              <span className={styles['row-action']}>
                View example results <b>↗</b>
              </span>
            </Link>
          </div>
        </section>
        <section className={styles['start-section']} id="getting-started">
          <div className={`${styles.wrap} ${styles['start-grid']}`}>
            <div>
              <p className={styles['section-label']}>YOUR VIRTUAL LAB</p>
              <h2>
                A workspace for
                <br />
                your next discovery.
              </h2>
              <p>
                {isAuthenticated
                  ? 'Return to your Virtual Lab to continue working with your team, data, models, and experiments.'
                  : 'A Virtual Lab brings your research team, data, models, and experiments together. Start with a free account and explore at your own pace.'}
              </p>
              <Link
                className={`${styles.button} ${styles.blue}`}
                href="/app/virtual-lab/sync"
                prefetch={false}
              >
                {researchAction}
              </Link>
              <p className={styles['start-note']}>
                {!isAuthenticated && <>100 initial credits to get started. </>}
                <Link href="/pricing">See plans and credit costs ↗</Link>
              </p>
            </div>
            <div className={styles.steps}>
              <div>
                <span>1</span>
                <section>
                  <h3>{isAuthenticated ? 'Open your Virtual Lab' : 'Create your account'}</h3>
                  <p>
                    {isAuthenticated
                      ? 'Continue in your existing workspace.'
                      : 'Sign up with Google, Microsoft, or GitHub.'}
                  </p>
                </section>
              </div>
              <div>
                <span>2</span>
                <section>
                  <h3>Find your starting point</h3>
                  <p>Explore available data, models, and workflows.</p>
                </section>
              </div>
              <div>
                <span>3</span>
                <section>
                  <h3>Bring your question to life</h3>
                  <p>Use your credits to build models and run experiments.</p>
                </section>
              </div>
            </div>
          </div>
        </section>
        <section className={`${styles.faq} ${styles.wrap} ${styles.section}`}>
          <div className={styles['section-intro']}>
            <h2>
              A few things
              <br />
              you might be wondering.
            </h2>
            <p>
              Start small. Explore what’s possible.
              <br />
              Build from there.
            </p>
          </div>
          <div className={styles['faq-list']}>
            <details>
              <summary>
                Can I get started for free?<span>＋</span>
              </summary>
              <p>
                Yes. OBI’s Free plan includes 100 initial credits. Credit use varies by workflow.
                See the <Link href="/pricing">current pricing page</Link> for details.
              </p>
            </details>
            <details>
              <summary>
                What is a Virtual Lab?<span>＋</span>
              </summary>
              <p>
                A Virtual Lab is your online research workspace for exploring data, working with
                digital brain models, running experiments, and collaborating.
              </p>
            </details>
            <details>
              <summary>
                What does the platform example show?<span>＋</span>
              </summary>
              <p>
                The tour shows voltage traces, spike timing, extracellular fields, electron
                microscopy cell meshes, the FlyWire Drosophila model, analysis plots, and an AI
                assistant connected to the platform. It cycles automatically; use the arrows or
                swipe to choose a view. Sign in to run your own experiments.
              </p>
            </details>
            <details>
              <summary>
                Where can I learn more about OBI?<span>＋</span>
              </summary>
              <p>
                The Open Brain Institute is a nonprofit organization supporting digital brain
                modeling and simulation neuroscience. Read about its{' '}
                <Link href="/mission">mission</Link> and{' '}
                <Link href="/showcases">scientific showcases</Link>.
              </p>
            </details>
          </div>
        </section>
        <footer className={styles.footer} data-testid="site-footer">
          <div className={styles.wrap}>
            <Link href="/" className={styles.wordmark} aria-label="Open Brain Institute home">
              <Image
                src="/images/obi_logo.svg"
                alt="Open Brain Institute"
                width={177}
                height={57}
              />
            </Link>
            <p>
              Tools for discovery.
              <br />A shared future for neuroscience.
            </p>
            <div className={styles['footer-links']}>
              <Link href="/features">Features ↗</Link>
              <Link href="/pricing">Pricing ↗</Link>
              <Link href="/news">News ↗</Link>
              <Link href="/about">About OBI ↗</Link>
              <Link href="/contact">Contact ↗</Link>
              <Link href="/terms">Terms ↗</Link>
              <Link href="/privacy">Privacy ↗</Link>
            </div>
          </div>
          <div className={`${styles.wrap} ${styles['footer-bottom']}`}>
            <span>© {year} Open Brain Institute</span>
            <span>Open neuroscience. Shared discovery.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
