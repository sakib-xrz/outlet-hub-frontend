import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Receipt } from '@/features/sales/components/receipt';
import { sale } from '../../helpers/sales';

const PRINT_STYLE_SELECTOR = 'style[media="print"]';

describe('Receipt print style', () => {
  it('injects a print <style> into the document while mounted and removes it after unmount', () => {
    expect(document.querySelector(PRINT_STYLE_SELECTOR)).toBeNull();

    const { unmount } = render(<Receipt sale={sale()} cashierLabel="Staff" />);

    const styleEl = document.querySelector(PRINT_STYLE_SELECTOR);
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('80mm');

    unmount();

    expect(document.querySelector(PRINT_STYLE_SELECTOR)).toBeNull();
  });

  it('keeps only one style element when two receipts are mounted simultaneously', () => {
    const { unmount: unmount1 } = render(<Receipt sale={sale()} cashierLabel="A" />);
    const { unmount: unmount2 } = render(
      <Receipt sale={sale({ id: 'other-id' })} cashierLabel="B" />,
    );

    const styleEls = document.querySelectorAll(PRINT_STYLE_SELECTOR);
    expect(styleEls.length).toBe(1);

    unmount1();
    // Second receipt is still mounted — style must still be present
    expect(document.querySelector(PRINT_STYLE_SELECTOR)).not.toBeNull();

    unmount2();
    // Both unmounted — style must be gone
    expect(document.querySelector(PRINT_STYLE_SELECTOR)).toBeNull();
  });
});
