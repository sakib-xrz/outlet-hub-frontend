import { type Page, expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
const tag = Date.now().toString(36).toUpperCase().slice(-6);
const outletCode = `E2E-${tag}`;
const outletName = `E2E Outlet ${tag}`;
const staffEmail = `e2e-staff-${tag.toLowerCase()}@example.invalid`;
const staffPassword = `E2e-${tag}-${Math.random().toString(36).slice(2, 12)}!`;
const burger = { sku: `E2E-BRG-${tag}`, name: `E2E Burger ${tag}`, price: '250.00' };
const tea = { sku: `E2E-TEA-${tag}`, name: `E2E Tea ${tag}`, price: '30.50' };

test.describe.configure({ mode: 'serial' });
test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');

let outletId = '';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function createMenuItem(page: Page, item: typeof burger): Promise<void> {
  await page.goto('/menu-items');
  await page.getByRole('button', { name: 'Create menu item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('SKU').fill(item.sku);
  await dialog.getByLabel('Item name').fill(item.name);
  await dialog.getByLabel('Base price').fill(item.price);
  await dialog.getByRole('button', { name: 'Create menu item' }).click();
  await expect(dialog).toBeHidden();
}

async function assignAndStock(page: Page, item: typeof burger, quantity: number): Promise<void> {
  await page.goto(`/outlets/${outletId}/menu`);
  await page.getByRole('button', { name: 'Assign menu item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search master menu items').fill(item.sku);
  await dialog.getByRole('radio', { name: `${item.sku} ${item.name}` }).click();
  await dialog.getByRole('button', { name: 'Assign item' }).click();
  await expect(dialog).toBeHidden();

  await page.goto(`/outlets/${outletId}/inventory`);
  await page.getByRole('button', { name: `Adjust stock for ${item.name}` }).click();
  const adjust = page.getByRole('dialog');
  await adjust.getByText('Add stock', { exact: true }).click();
  await adjust.getByRole('textbox', { name: 'Quantity' }).fill(String(quantity));
  await adjust.getByRole('button', { name: 'Confirm adjustment' }).click();
  await expect(adjust).toBeHidden();
}

test('protected routes redirect signed-out visitors to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('HQ sets up an outlet, menu, stock and a cashier', async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page.getByText('Total revenue')).toBeVisible();

  await page.goto('/outlets');
  await page.getByRole('button', { name: 'Create outlet' }).click();
  const outletDialog = page.getByRole('dialog');
  await outletDialog.getByLabel('Outlet code').fill(outletCode);
  await outletDialog.getByLabel('Outlet name').fill(outletName);
  await outletDialog.getByRole('button', { name: 'Create outlet' }).click();
  await expect(outletDialog).toBeHidden();
  await page.getByLabel('Search outlets by code or name').fill(outletCode);
  await page.getByRole('link', { name: outletName, exact: true }).click();
  await expect(page).toHaveURL(/\/outlets\/[0-9a-f-]{36}$/);
  outletId = page.url().split('/').pop() ?? '';

  await createMenuItem(page, burger);
  await createMenuItem(page, tea);
  await assignAndStock(page, burger, 10);
  await assignAndStock(page, tea, 20);

  await page.goto('/staff');
  await page.getByRole('button', { name: 'Create staff' }).click();
  const staffDialog = page.getByRole('dialog');
  await staffDialog.getByRole('textbox', { name: 'Email' }).fill(staffEmail);
  await staffDialog.getByRole('textbox', { name: 'Password', exact: true }).fill(staffPassword);
  await staffDialog.getByRole('textbox', { name: 'Confirm password' }).fill(staffPassword);
  await staffDialog.getByLabel('Search outlets to assign').fill(outletCode);
  await staffDialog.getByLabel(new RegExp(outletCode)).check();
  await staffDialog.getByRole('button', { name: 'Create staff' }).click();
  await expect(staffDialog).toBeHidden();
  await signOut(page);
});

test('staff sells a multi-item cart and sees the receipt and history', async ({ page }) => {
  await signIn(page, staffEmail, staffPassword);
  await expect(page.getByText('Total revenue')).toHaveCount(0);
  await page.getByRole('link', { name: 'Open POS' }).click();
  await expect(page).toHaveURL(new RegExp(`/outlets/${outletId}/pos`));

  const addBurger = page.getByRole('button', { name: `Add ${burger.name} to cart` });
  await addBurger.click();
  await addBurger.click();
  await page.getByRole('button', { name: `Add ${tea.name} to cart` }).click();
  await expect(page.getByLabel('Cart total')).toHaveText('৳530.50');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByRole('button', { name: 'Confirm sale' }).click();

  const receipt = page.getByRole('article');
  await expect(receipt).toContainText(`${outletCode}-000001`);
  await expect(receipt).toContainText('৳530.50');

  await page.goto(`/outlets/${outletId}/sales`);
  await expect(page.getByRole('link', { name: `View receipt ${outletCode}-000001` })).toBeVisible();

  await page.goto(`/outlets/${outletId}/inventory`);
  await expect(page.getByRole('row', { name: new RegExp(burger.name) })).toContainText('8');
  await expect(page.getByRole('row', { name: new RegExp(tea.name) })).toContainText('19');

  await page.goto('/staff');
  await expect(page).toHaveURL(/\/unauthorized/);
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to home' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await signOut(page);
});

test('HQ sees the sale in reports, then signs out', async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(page.getByRole('row', { name: new RegExp(outletName) })).toContainText('৳530.50');
  await page.getByRole('button', { name: `Show top items for ${outletName}` }).click();
  const top = page.getByRole('table', { name: `Top items for ${outletName}` });
  await expect(top.getByRole('row').nth(1)).toContainText(burger.name);
  await expect(top.getByRole('row').nth(1)).toContainText('৳500.00');

  await signOut(page);
  await page.goto('/outlets');
  await expect(page).toHaveURL(/\/login/);
});
