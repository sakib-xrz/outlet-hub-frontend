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

function pdfPageCount(pdf: Buffer): number {
  // Each visible page has a PDF object with /Type /Page (not /Type /Pages).
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

test.describe.configure({ mode: 'serial' });

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('receipt PDF is ~80 mm wide; sales-history PDF uses default paper size', async ({ page }) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) test.skip();
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  // Collect outlet IDs from the outlets list page.
  // The outlet table links to /outlets/:id (detail pages).
  await page.goto('/outlets');
  await page.waitForLoadState('networkidle');

  // Collect outlet detail hrefs from the table (each outlet name links to /outlets/:id).
  const anchors = page.locator('a[href]');
  const anchorCount = await anchors.count();
  const rawHrefs: string[] = [];
  for (let i = 0; i < anchorCount; i++) {
    const href = await anchors.nth(i).getAttribute('href');
    if (href) rawHrefs.push(href);
  }
  const outletIds = [
    ...new Set(
      rawHrefs
        .map((p) => /^\/outlets\/([^/]+)$/.exec(p)?.[1])
        .filter((id): id is string => id != null),
    ),
  ];
  if (outletIds.length === 0) test.skip();

  // For each outlet, go to its sales page and pick the first sale.
  let outletId = '';
  let saleId = '';

  for (const id of outletIds) {
    await page.goto(`/outlets/${id}/sales`);
    await page.waitForLoadState('networkidle');
    const saleHref = await page
      .locator(`a[href^="/outlets/${id}/sales/"]`)
      .first()
      .getAttribute('href');
    if (!saleHref) continue;
    const sid = /\/sales\/([^/]+)/.exec(saleHref)?.[1];
    if (!sid) continue;
    outletId = id;
    saleId = sid;
    break;
  }

  if (!outletId || !saleId) test.skip();

  // 1. Receipt page → @page size 80mm × <measured height> → one 80 mm page
  await page.goto(`/outlets/${outletId}/sales/${saleId}`);
  await page.waitForSelector('[data-print-receipt]');
  const receiptPdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
  const receiptWidth = pdfWidthPt(receiptPdf);
  expect(receiptWidth, `receipt PDF width should be ~${PT_80MM.toFixed(0)} pt (80 mm)`).toBeCloseTo(
    PT_80MM,
    -1, // within ±5 pt
  );
  expect(pdfPageCount(receiptPdf), 'receipt PDF must be exactly one page').toBe(1);

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
