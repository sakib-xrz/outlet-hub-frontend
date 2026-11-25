import type { z } from 'zod';
import type {
  adjustmentResultSchema,
  createAdjustmentSchema,
  inventoryFiltersSchema,
  inventoryItemSchema,
  inventoryPageSchema,
} from '@/features/inventory/schemas/inventory.schemas';

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type InventoryPage = z.infer<typeof inventoryPageSchema>;
export type InventoryFilters = z.infer<typeof inventoryFiltersSchema>;
export type AdjustmentResult = z.infer<typeof adjustmentResultSchema>;
export type AdjustmentFormValues = z.input<ReturnType<typeof createAdjustmentSchema>>;
export type AdjustmentFormOutput = z.output<ReturnType<typeof createAdjustmentSchema>>;
export type StockAdjustment =
  | { operation: 'INCREASE' | 'DECREASE'; quantity: number }
  | { operation: 'SET'; quantity: number; expectedStockQuantity: number };
