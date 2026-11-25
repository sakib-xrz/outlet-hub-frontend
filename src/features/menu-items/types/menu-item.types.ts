import type { z } from 'zod';
import type {
  menuItemFiltersSchema,
  menuItemFormSchema,
  menuItemPageSchema,
  menuItemSchema,
} from '@/features/menu-items/schemas/menu-item.schemas';

export type MenuItem = z.infer<typeof menuItemSchema>;
export type MenuItemPage = z.infer<typeof menuItemPageSchema>;
export type MenuItemFilters = z.infer<typeof menuItemFiltersSchema>;
export type MenuItemFormValues = z.input<typeof menuItemFormSchema>;
export type MenuItemFormOutput = z.output<typeof menuItemFormSchema>;
export type CreateMenuItemInput = MenuItemFormOutput;
export type UpdateMenuItemInput = Omit<MenuItemFormOutput, 'sku'>;
