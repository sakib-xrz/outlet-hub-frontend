import { type Page, expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

// PDF page widths are in points (1 pt = 1/72 inch = ~0.353 mm).
// 80 mm ≈ 226.8 pt; A4 = 595.3 pt; Letter = 611.4 pt.
const PT_80MM = (80 * 72) / 25.4; // ≈ 226.77

function pdfWidthPt(pdf: Buffer): number {
  // /MediaBox [llx lly urx ury] — urx is the page width in points.
  const match = /\/MediaBox\s*\[\s*[\d.+-]+\s+[\d.+-]+\s+([\d.+-]+)/.exec(pdf.toString('latin1'));
  return match ? Math.abs(Number(match[1])) : 0;
}

test.describe.configure({ mode: 'serial' });
test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('receipt PDF is ~80 mm wide; sales-history PDF uses default paper size', async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  // Find an outlet that has at least one sale by navigating the UI.
  await page.goto('/outlets');
  const outletLinks = page.getByRole('link', { name: /sales history/i });
  const count = await outletLinks.count();
  test.skip(count === 0, 'No outlets found');

  let outletId = '';
  let saleId = '';

  for (let i = 0; i < count; i++) {
    const href = (await outletLinks.nth(i).getAttribute('href')) ?? '';
    const id = /\/outlets\/([^/]+)\/sales/.exec(href)?.[1] ?? '';
    if (!id) continue;

    await page.goto(`/outlets/${id}/sales`);
    const saleLink = page.getByRole('link', { name: /view|receipt/i }).first();
    const saleCount = await saleLink.count();
    if (saleCount === 0) {
      // Try finding a sale row href directly
      const rows = page.getByRole('row').getByRole('link').first();
      const rowCount = await rows.count();
      if (rowCount === 0) continue;
      const saleHref = (await rows.getAttribute('href')) ?? '';
      const sid = /\/sales\/([^/]+)/.exec(saleHref)?.[1] ?? '';
      if (sid) {
        outletId = id;
        saleId = sid;
        break;
      }
    } else {
      const saleHref = (await saleLink.getAttribute('href')) ?? '';
      const sid = /\/sales\/([^/]+)/.exec(saleHref)?.[1] ?? '';
      if (sid) {
        outletId = id;
        saleId = sid;
        break;
      }
    }
  }

  test.skip(!outletId || !saleId, 'No outlet with sales found — seed demo data first');

  // 1. Receipt page → @page receipt → 80 mm
  await page.goto(`/outlets/${outletId}/sales/${saleId}`);
  await page.waitForSelector('[data-print-receipt]');
  const receiptPdf = await page.pdf({ printBackground: true });
  const receiptWidth = pdfWidthPt(receiptPdf);
  expect(receiptWidth, `receipt PDF width should be ~${PT_80MM.toFixed(0)} pt (80 mm)`).toBeCloseTo(
    PT_80MM,
    -1, // within ±5 pt
  );

  // 2. Sales-history page → default @page → A4 or Letter (not 80 mm)
  await page.goto(`/outlets/${outletId}/sales`);
  await page.waitForLoadState('networkidle');
  const historyPdf = await page.pdf({ printBackground: true });
  const historyWidth = pdfWidthPt(historyPdf);
  expect(
    historyWidth,
    'sales-history PDF width should be A4 (595 pt) or Letter (612 pt), not 80 mm',
  ).toBeGreaterThan(500);
});
