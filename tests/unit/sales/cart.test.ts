import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { cartKey, lineNeedsReview, useCartStore } from '@/features/sales/stores/cart.store';
import { multiplyMoney, sumMoney } from '@/lib/utils/money';

const product = {
  menuItemId: 'a',
  sku: 'A-1',
  name: 'Burger',
  unitPrice: '250.00',
  availableStock: 2,
};

beforeEach(() => {
  useCartStore.setState({ carts: {} });
  useAuthStore.setState(useAuthStore.getInitialState(), true);
});

describe('exact cart money', () => {
  it('multiplies and adds in integer minor units', () => {
    expect(multiplyMoney('0.10', 3)).toBe('0.30');
    expect(sumMoney(['0.10', '0.20'])).toBe('0.30');
    expect(multiplyMoney('9999999999.99', 2147483647)).toBe('21474836469978525163.53');
  });
});

describe('cart store', () => {
  it('keeps one line per item and never exceeds the displayed stock', () => {
    const key = cartKey('user', 'outlet');
    const { add, setQuantity } = useCartStore.getState();
    add(key, product);
    add(key, product);
    add(key, product);
    expect(useCartStore.getState().carts[key]).toEqual([{ ...product, quantity: 2 }]);
    setQuantity(key, 'a', 99);
    expect(useCartStore.getState().carts[key]?.[0]?.quantity).toBe(2);
    setQuantity(key, 'a', 0);
    expect(useCartStore.getState().carts[key]?.[0]?.quantity).toBe(1);
  });

  it('does not add out-of-stock products', () => {
    const key = cartKey('user', 'outlet');
    useCartStore.getState().add(key, { ...product, availableStock: 0 });
    expect(useCartStore.getState().carts[key] ?? []).toEqual([]);
  });

  it('isolates carts by user and outlet', () => {
    const { add } = useCartStore.getState();
    add(cartKey('user-1', 'outlet-1'), product);
    expect(useCartStore.getState().carts[cartKey('user-1', 'outlet-2')]).toBeUndefined();
    expect(useCartStore.getState().carts[cartKey('user-2', 'outlet-1')]).toBeUndefined();
  });

  it('clears every cart when the session changes', () => {
    useCartStore.getState().add(cartKey('user-1', 'outlet-1'), product);
    useAuthStore.getState().clearSession();
    expect(useCartStore.getState().carts).toEqual({});
  });

  it('marks conflicts for review and accepts new prices explicitly', () => {
    const key = cartKey('user', 'outlet');
    const store = useCartStore.getState();
    store.add(key, { ...product, availableStock: 5 });
    store.setQuantity(key, 'a', 4);
    store.applyConflicts(key, [
      { kind: 'price', menuItemId: 'a', currentUnitPrice: '260.00' },
      { kind: 'stock', menuItemId: 'a', availableQuantity: 3 },
    ]);
    let line = useCartStore.getState().carts[key]?.[0];
    expect(line && lineNeedsReview(line)).toBe(true);

    useCartStore.getState().acceptPrice(key, 'a');
    useCartStore.getState().setQuantity(key, 'a', 3);
    line = useCartStore.getState().carts[key]?.[0];
    expect(line).toMatchObject({ unitPrice: '260.00', quantity: 3 });
    expect(line && lineNeedsReview(line)).toBe(false);
  });

  it('restores submitted lines only into an empty cart', () => {
    const key = cartKey('user', 'outlet');
    const restored = { ...product, quantity: 3, availableStock: 3 };
    useCartStore.getState().restore(key, [restored]);
    expect(useCartStore.getState().carts[key]).toEqual([restored]);

    useCartStore.getState().restore(key, [{ ...restored, quantity: 9 }]);
    expect(useCartStore.getState().carts[key]?.[0]?.quantity).toBe(3);
  });
});
