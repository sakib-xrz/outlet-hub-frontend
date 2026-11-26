import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Receipt } from '@/features/sales/components/receipt';
import { sale } from '../../helpers/sales';

const PRINT_STYLE_SELECTOR = 'style[media="print"]';

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  private cb: ResizeCallback;
  private targets: Element[] = [];

  constructor(cb: ResizeCallback) {
    this.cb = cb;
    MockResizeObserver.instances.push(this);
  }

  observe(el: Element) {
    this.targets.push(el);
  }

  unobserve(el: Element) {
    this.targets = this.targets.filter((t) => t !== el);
  }

  disconnect() {
    this.targets = [];
  }

  fire(heightPx: number, el?: Element) {
    const target = el ?? this.targets[0];
    if (!target) return;
    this.cb([
      {
        target,
        contentRect: { height: heightPx },
        borderBoxSize: [{ blockSize: heightPx, inlineSize: 0 }],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      },
    ] as unknown as ResizeObserverEntry[]);
  }
}

function printStyleText(): string {
  return document.querySelector(PRINT_STYLE_SELECTOR)?.textContent ?? '';
}

beforeEach(() => {
  MockResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Receipt print style', () => {
  it('injects a print <style> with two-length @page size while mounted and removes it after unmount', () => {
    expect(document.querySelector(PRINT_STYLE_SELECTOR)).toBeNull();

    const { unmount } = render(<Receipt sale={sale()} cashierLabel="Staff" />);

    expect(document.querySelector(PRINT_STYLE_SELECTOR)).not.toBeNull();
    // size must be two explicit lengths — never "auto"
    expect(printStyleText()).toMatch(/size:\s*80mm\s+\d+\.\d+mm/);

    unmount();

    expect(document.querySelector(PRINT_STYLE_SELECTOR)).toBeNull();
  });

  it('updates the @page height when ResizeObserver fires', () => {
    const { unmount } = render(<Receipt sale={sale()} cashierLabel="Staff" />);

    const observer = MockResizeObserver.instances[0];
    if (!observer) throw new Error('expected ResizeObserver to be created');

    // 500 px * 25.4 / 96 + 2 ≈ 134.1 mm
    observer.fire(500);

    const match = /size:\s*80mm\s+([\d.]+)mm/.exec(printStyleText());
    expect(match).not.toBeNull();
    const heightMm = match ? parseFloat(match[1] ?? '0') : 0;
    expect(heightMm).toBeGreaterThan(130);
    expect(heightMm).toBeLessThan(140);

    unmount();
  });

  it('uses the tallest receipt height when multiple receipts are mounted', () => {
    const { unmount: unmount1 } = render(<Receipt sale={sale()} cashierLabel="A" />);
    const { unmount: unmount2 } = render(
      <Receipt sale={sale({ id: 'other-id' })} cashierLabel="B" />,
    );

    const obs1 = MockResizeObserver.instances[0];
    const obs2 = MockResizeObserver.instances[1];
    if (!obs1 || !obs2) throw new Error('expected two ResizeObservers to be created');
    obs1.fire(400); // shorter: ~107.8 mm
    obs2.fire(600); // taller:  ~160.8 mm

    const match = /size:\s*80mm\s+([\d.]+)mm/.exec(printStyleText());
    expect(match).not.toBeNull();
    const heightMm = match ? parseFloat(match[1] ?? '0') : 0;
    // Must use 600 px (taller), not 400 px (shorter)
    expect(heightMm).toBeGreaterThan(155);

    unmount1();
    unmount2();
  });

  it('keeps only one style element when two receipts are mounted simultaneously', () => {
    const { unmount: unmount1 } = render(<Receipt sale={sale()} cashierLabel="A" />);
    const { unmount: unmount2 } = render(
      <Receipt sale={sale({ id: 'other-id' })} cashierLabel="B" />,
    );

    expect(document.querySelectorAll(PRINT_STYLE_SELECTOR).length).toBe(1);

    unmount1();
    expect(document.querySelector(PRINT_STYLE_SELECTOR)).not.toBeNull();

    unmount2();
    expect(document.querySelector(PRINT_STYLE_SELECTOR)).toBeNull();
  });
});
