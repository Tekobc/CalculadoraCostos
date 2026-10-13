import { z } from 'zod';

export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1, 'El nombre del insumo es obligatorio'),
  unidad: z.string().trim().min(1, 'La unidad de compra es obligatoria'),
  cantidad: z.number().nonnegative('El stock no puede ser negativo'),
  precio_unitario: z.number().nonnegative('El costo no puede ser negativo'),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const OperationTypeSchema = z.enum(['production', 'order']);
export const OperationStatusSchema = z.enum(['planned', 'completed']);

export const ProductionEntrySchema = z.object({
  id: z.string().uuid(),
  tipo: OperationTypeSchema,
  product_id: z.string().uuid(),
  cantidad: z.number().positive('La cantidad debe ser mayor a cero'),
  fecha: z.string().date(),
  estado: OperationStatusSchema,
  cliente: z.string().trim().optional(),
  notas: z.string().trim().optional(),
});

export type ProductionEntry = z.infer<typeof ProductionEntrySchema>;

export const OperationsWorkspaceSchema = z.object({
  inventario: z.array(InventoryItemSchema).default([]),
  operaciones: z.array(ProductionEntrySchema).default([]),
});

export type OperationsWorkspace = z.infer<typeof OperationsWorkspaceSchema>;

export const EMPTY_OPERATIONS_WORKSPACE: OperationsWorkspace = {
  inventario: [],
  operaciones: [],
};
