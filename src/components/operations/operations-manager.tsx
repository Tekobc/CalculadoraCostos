'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Decimal from 'decimal.js';
import { Product } from '@/domain/schemas/product.schema';
import {
  EMPTY_OPERATIONS_WORKSPACE,
  InventoryItem,
  InventoryItemSchema,
  OperationsWorkspace,
  OperationsWorkspaceSchema,
  ProductionEntry,
  ProductionEntrySchema,
} from '@/domain/schemas/operations.schema';
import {
  estimateProduct,
  getOperationShortages,
  getSupplyRequirements,
  normalizeSupplyName,
} from '@/domain/calculator/production-planning';
import { formatCurrencyARS } from '@/lib/formatters/currency';
import { getOperationsWorkspace, saveOperationsWorkspace } from '@/lib/supabase/db-actions';

type OperationsView = 'inventory' | 'production' | 'orders';

interface OperationsManagerProps {
  products: Product[];
  userId: string | null;
  accountReady: boolean;
  view: OperationsView;
}

const DEMO_STORAGE_KEY = 'calculadora-costos:operations:v1';
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const keyFor = (name: string, unit: string) =>
  `${normalizeSupplyName(name)}\u0000${unit.trim().toLocaleLowerCase('es-AR')}`;

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(amount);
}

function dateInRange(date: string, start: string, days: number): boolean {
  const current = new Date(`${date}T12:00:00`);
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(first);
  last.setDate(last.getDate() + days - 1);
  return current >= first && current <= last;
}

function periodEnd(start: string): string {
  const end = new Date(`${start}T12:00:00`);
  end.setDate(end.getDate() + 6);
  return end.toLocaleDateString('es-AR');
}

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-AR');
}

function InputField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      <input
        {...props}
        className={`min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 ${props.className ?? ''}`}
      />
    </label>
  );
}

export function OperationsManager({
  products,
  userId,
  accountReady,
  view,
}: OperationsManagerProps) {
  const [workspace, setWorkspace] = useState<OperationsWorkspace>(EMPTY_OPERATIONS_WORKSPACE);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveSequence = useRef(0);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stockId, setStockId] = useState<string | null>(null);
  const [stockName, setStockName] = useState('');
  const [stockUnit, setStockUnit] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockPrice, setStockPrice] = useState('');
  const [entryType, setEntryType] = useState<'production' | 'order'>(
    view === 'orders' ? 'order' : 'production'
  );
  const [entryProductId, setEntryProductId] = useState(products[0]?.id ?? '');
  const [entryQuantity, setEntryQuantity] = useState('1');
  const [entryDate, setEntryDate] = useState(today);
  const [entryCustomer, setEntryCustomer] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [period, setPeriod] = useState<'day' | 'week'>('week');
  const [periodDate, setPeriodDate] = useState(today);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    if (!accountReady) return;
    let active = true;
    setLoadedFor(null);
    setLoadError(null);

    const load = async () => {
      if (userId) {
        const result = await getOperationsWorkspace();
        if (!active) return;
        if (result.error) setLoadError(result.error);
        setWorkspace(result.workspace);
        setLoadedFor(userId);
        return;
      }

      try {
        const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
        if (saved) {
          const validation = OperationsWorkspaceSchema.safeParse(JSON.parse(saved));
          if (!validation.success) {
            setLoadError('Los datos locales de stock y operaciones tienen un formato inválido.');
          } else {
            setWorkspace(validation.data);
          }
        } else {
          setWorkspace(EMPTY_OPERATIONS_WORKSPACE);
        }
        setLoadedFor('demo');
      } catch (error) {
        setLoadError(error instanceof Error
          ? `No se pudieron leer los datos guardados en este navegador: ${error.message}`
          : 'No se pudieron leer los datos guardados en este navegador.');
        setLoadedFor('demo');
      }
    };

    void load().catch((error: unknown) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar el stock y las operaciones.');
      setWorkspace(EMPTY_OPERATIONS_WORKSPACE);
      setLoadedFor(userId ?? 'demo');
    });

    return () => {
      active = false;
    };
  }, [accountReady, userId]);

  useEffect(() => {
    const expectedKey = userId ?? 'demo';
    if (!accountReady || loadedFor !== expectedKey || loadError) return;
    const sequence = ++saveSequence.current;
    if (!userId) {
      try {
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(workspace));
        setSaveError(null);
      } catch (error) {
        setSaveError(error instanceof Error
          ? `No se pudieron guardar los datos en este navegador: ${error.message}`
          : 'No se pudieron guardar los datos en este navegador.');
      }
      return;
    }

    setSaving(true);
    const write = saveQueue.current.catch(() => undefined).then(async () => {
      const result = await saveOperationsWorkspace(workspace);
      if (sequence !== saveSequence.current) return;
      if (result.error) setSaveError(result.error);
      else setSaveError(null);
    }).catch((error: unknown) => {
      if (sequence === saveSequence.current) {
        setSaveError(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
      }
    }).finally(() => {
      if (sequence === saveSequence.current) setSaving(false);
    });
    saveQueue.current = write;
  }, [accountReady, loadedFor, userId, workspace]);

  useEffect(() => {
    if (view === 'orders') setEntryType('order');
    else if (view === 'production') setEntryType('production');
  }, [view]);

  useEffect(() => {
    if (products.length > 0 && !products.some((product) => product.id === entryProductId)) {
      setEntryProductId(products[0].id ?? '');
    }
  }, [entryProductId, products]);

  const shortages = useMemo(
    () => getOperationShortages(workspace.inventario, workspace.operaciones, products),
    [workspace, products]
  );

  const periodEntries = useMemo(() => {
    if (view !== 'production') return [];
    return workspace.operaciones.filter((entry) =>
      entry.tipo === 'production' &&
      dateInRange(entry.fecha, periodDate, period === 'week' ? 7 : 1)
    );
  }, [period, periodDate, view, workspace.operaciones]);

  const periodTotals = useMemo(() => {
    return periodEntries.reduce((totals, entry) => {
      const product = products.find((item) => item.id === entry.product_id);
      if (!product) {
        totals.hasProfitEstimate = false;
        return totals;
      }
      const estimate = estimateProduct(product, entry.cantidad, workspace.inventario);
      totals.costo = totals.costo.plus(estimate.costoTotal);
      if (estimate.ingresoTotal && estimate.gananciaTotal) {
        totals.ingreso = totals.ingreso.plus(estimate.ingresoTotal);
        totals.ganancia = totals.ganancia.plus(estimate.gananciaTotal);
      } else {
        totals.hasProfitEstimate = false;
      }
      totals.units += entry.cantidad;
      return totals;
    }, {
      costo: new Decimal(0),
      ingreso: new Decimal(0),
      ganancia: new Decimal(0),
      units: 0,
      hasProfitEstimate: periodEntries.length > 0,
    });
  }, [periodEntries, products, workspace.inventario]);

  const updateWorkspace = (next: OperationsWorkspace) => {
    setWorkspace(next);
    setMessage(null);
    setMessageIsError(false);
  };

  const showError = (text: string) => {
    setMessage(text);
    setMessageIsError(true);
  };

  const saveStock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = InventoryItemSchema.safeParse({
      id: stockId ?? crypto.randomUUID(),
      nombre: stockName,
      unidad: stockUnit,
      cantidad: Number(stockQuantity),
      precio_unitario: Number(stockPrice),
    });
    if (!validation.success) {
      showError(validation.error.issues[0]?.message ?? 'Revisá los datos del insumo.');
      return;
    }

    const collision = workspace.inventario.find((item) =>
      item.id !== stockId && keyFor(item.nombre, item.unidad) === keyFor(validation.data.nombre, validation.data.unidad)
    );
    if (collision) {
      showError('Ya existe un insumo con ese nombre y unidad. Editá el que ya está cargado.');
      return;
    }

    const nextInventory = stockId
      ? workspace.inventario.map((item) => item.id === stockId ? validation.data : item)
      : [...workspace.inventario, validation.data];
    updateWorkspace({ ...workspace, inventario: nextInventory });
    resetStockForm();
  };

  const resetStockForm = () => {
    setStockId(null);
    setStockName('');
    setStockUnit('');
    setStockQuantity('');
    setStockPrice('');
  };

  const createEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = ProductionEntrySchema.safeParse({
      id: crypto.randomUUID(),
      tipo: entryType,
      product_id: entryProductId,
      cantidad: Number(entryQuantity),
      fecha: entryDate,
      estado: 'planned',
      cliente: entryCustomer.trim() || undefined,
      notas: entryNotes.trim() || undefined,
    });
    if (!validation.success) {
      showError(validation.error.issues[0]?.message ?? 'Revisá los datos de la carga.');
      return;
    }
    if (!products.some((product) => product.id === validation.data.product_id)) {
      showError('Elegí un producto válido para continuar.');
      return;
    }

    updateWorkspace({
      ...workspace,
      operaciones: [validation.data, ...workspace.operaciones],
    });
    setEntryQuantity('1');
    setEntryCustomer('');
    setEntryNotes('');
    setMessage(entryType === 'order' ? 'Pedido agregado y stock reservado.' : 'Producción agregada y stock reservado.');
    setMessageIsError(false);
  };

  const completeEntry = (entry: ProductionEntry) => {
    const product = products.find((item) => item.id === entry.product_id);
    if (!product) {
      showError('No se puede completar: el producto ya no está en el catálogo.');
      return;
    }

    const requirements = getSupplyRequirements(product, entry.cantidad);
    const insufficient = requirements.find((requirement) => {
      const available = workspace.inventario
        .filter((item) => keyFor(item.nombre, item.unidad) === keyFor(requirement.nombre, requirement.unidad))
        .reduce((sum, item) => sum + item.cantidad, 0);
      return available + 1e-9 < requirement.cantidad.toNumber();
    });
    if (insufficient) {
      showError(`No hay stock físico suficiente de ${insufficient.nombre} para marcarlo realizado.`);
      return;
    }

    let nextInventory = [...workspace.inventario];
    for (const requirement of requirements) {
      let remaining = requirement.cantidad.toNumber();
      nextInventory = nextInventory.map((item) => {
        if (keyFor(item.nombre, item.unidad) !== keyFor(requirement.nombre, requirement.unidad) || remaining <= 0) {
          return item;
        }
        const deducted = Math.min(item.cantidad, remaining);
        remaining -= deducted;
        return { ...item, cantidad: Math.max(0, item.cantidad - deducted) };
      });
    }

    updateWorkspace({
      inventario: nextInventory,
      operaciones: workspace.operaciones.map((item) =>
        item.id === entry.id ? { ...item, estado: 'completed' } : item
      ),
    });
    setMessage(`${entry.tipo === 'order' ? 'Pedido' : 'Producción'} marcado como realizado; stock actualizado.`);
    setMessageIsError(false);
  };

  const deletePlannedEntry = (entry: ProductionEntry) => {
    if (entry.estado !== 'planned') return;
    updateWorkspace({
      ...workspace,
      operaciones: workspace.operaciones.filter((item) => item.id !== entry.id),
    });
  };

  if (!accountReady || loadedFor !== (userId ?? 'demo')) {
    return <p role="status" className="rounded-xl bg-white/70 px-4 py-5 text-sm text-ink/70">Cargando stock y operaciones…</p>;
  }

  const title = view === 'inventory' ? 'Stock de insumos' : view === 'production' ? 'Producción' : 'Pedidos';
  const description = view === 'inventory'
    ? 'Un stock compartido para tus recetas, tandas y pedidos.'
    : view === 'production'
      ? 'Planificá lo que vas a producir por día o por semana.'
      : 'Anotá pedidos de clientes y revisá si tenés lo necesario para cumplirlos.';
  const visibleEntries = workspace.operaciones
    .filter((entry) => entry.tipo === (view === 'orders' ? 'order' : 'production'))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-ink/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {view === 'inventory' ? 'Insumos' : view === 'production' ? 'Planificación' : 'Clientes'}
          </p>
          <h2 className="font-heading text-2xl font-bold text-ink">{title}</h2>
          <p className="mt-1 max-w-prose text-sm text-ink/70">{description}</p>
        </div>
        <span className="text-xs text-ink/55" role="status">
          {saving
            ? 'Guardando…'
            : loadError || saveError
              ? 'Hay cambios sin guardar'
              : userId
                ? 'Guardado en tu cuenta'
                : 'Guardado en este navegador'}
        </span>
      </header>

      {(loadError || saveError) && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {loadError ?? saveError}
        </p>
      )}
      {message && (
        <p role={messageIsError ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-sm ${messageIsError ? 'border-danger/30 bg-danger/5 text-danger' : 'border-primary/20 bg-primary/5 text-primary'}`}>
          {message}
        </p>
      )}

      {view !== 'inventory' && shortages.length > 0 && (
        <section className="rounded-2xl border border-danger/20 bg-danger/5 p-4 sm:p-5" aria-label="Insumos faltantes">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg text-danger" aria-hidden="true">!</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-ink">Faltantes para cubrir lo planificado</h3>
              <p className="mt-1 text-sm text-ink/70">Se cuentan juntos los compromisos pendientes de producción y de pedidos.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {shortages.map((item) => (
                  <li key={keyFor(item.nombre, item.unidad)} className="rounded-lg bg-white/80 px-3 py-1.5 text-sm text-danger">
                    {item.nombre}: faltan <strong className="tabular-nums">{formatAmount(item.cantidad.toNumber())} {item.unidad}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {view === 'inventory' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.2fr]">
          <form onSubmit={saveStock} className="h-fit space-y-4 rounded-2xl bg-white/80 p-5 shadow-sm">
            <div>
              <h3 className="font-heading text-lg font-bold text-ink">{stockId ? 'Editar insumo' : 'Agregar al stock'}</h3>
              <p className="mt-1 text-sm text-ink/65">Usá el mismo nombre y unidad de compra que aparecen en la receta.</p>
            </div>
            <InputField label="Nombre" value={stockName} onChange={(event) => setStockName(event.target.value)} required placeholder="Harina 0000" />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Unidad de compra" value={stockUnit} onChange={(event) => setStockUnit(event.target.value)} required placeholder="kg, litro, unidad…" />
              <InputField label="Cantidad disponible" type="number" min="0" step="any" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} required />
            </div>
            <InputField label="Costo por unidad de compra ($)" type="number" min="0" step="any" value={stockPrice} onChange={(event) => setStockPrice(event.target.value)} required />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <span aria-hidden="true">+</span> {stockId ? 'Guardar cambios' : 'Agregar insumo'}
              </button>
              {stockId && <button type="button" onClick={resetStockForm} className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancelar</button>}
            </div>
          </form>

          <section className="space-y-3">
            <h3 className="font-heading text-lg font-bold text-ink">Insumos cargados <span className="font-body text-sm font-normal text-ink/50">({workspace.inventario.length})</span></h3>
            {workspace.inventario.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-6 text-sm text-ink/65">
                Todavía no cargaste insumos. Agregá existencias para comparar tus planes con el stock disponible.
              </div>
            ) : (
              <ul className="divide-y divide-ink/10 rounded-2xl bg-white/80 px-4">
                {workspace.inventario.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-semibold text-ink">{item.nombre}</p>
                      <p className="mt-1 text-sm text-ink/65 tabular-nums">{formatAmount(item.cantidad)} {item.unidad} disponibles · {formatCurrencyARS(item.precio_unitario)} / {item.unidad}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => {
                        setStockId(item.id);
                        setStockName(item.nombre);
                        setStockUnit(item.unidad);
                        setStockQuantity(String(item.cantidad));
                        setStockPrice(String(item.precio_unitario));
                      }} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Editar</button>
                      <button type="button" aria-label={`Eliminar ${item.nombre} del stock`} onClick={() => {
                        updateWorkspace({ ...workspace, inventario: workspace.inventario.filter((entry) => entry.id !== item.id) });
                        if (stockId === item.id) resetStockForm();
                      }} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger">Eliminar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_1.1fr]">
          <form onSubmit={createEntry} className="h-fit space-y-4 rounded-2xl bg-white/80 p-5 shadow-sm">
            <div>
              <h3 className="font-heading text-lg font-bold text-ink">{view === 'orders' ? 'Cargar pedido' : 'Planificar producción'}</h3>
              <p className="mt-1 text-sm text-ink/65">Los insumos quedan reservados al planificar y se descuentan al marcarlo realizado.</p>
            </div>
            {products.length === 0 ? (
              <p className="rounded-xl bg-accent/10 px-3 py-3 text-sm text-ink">Primero agregá un producto o receta en “Mis Productos y Recetas”.</p>
            ) : (
              <>
                <label className="block space-y-1.5 text-sm font-medium text-ink">
                  <span>Producto o receta</span>
                  <select value={entryProductId} onChange={(event) => setEntryProductId(event.target.value)} required className="min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                    {products.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Unidades" type="number" min="0.001" step="any" value={entryQuantity} onChange={(event) => setEntryQuantity(event.target.value)} required />
                  <InputField label={view === 'orders' ? 'Fecha de entrega' : 'Fecha de producción'} type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required />
                </div>
                {view === 'orders' && <InputField label="Cliente (opcional)" value={entryCustomer} onChange={(event) => setEntryCustomer(event.target.value)} placeholder="Nombre del cliente" />}
                <label className="block space-y-1.5 text-sm font-medium text-ink">
                  <span>Notas (opcional)</span>
                  <textarea value={entryNotes} onChange={(event) => setEntryNotes(event.target.value)} rows={2} className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Detalles para tener en cuenta" />
                </label>
                <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  <span aria-hidden="true">+</span> {view === 'orders' ? 'Agregar pedido' : 'Agregar producción'}
                </button>
              </>
            )}
          </form>

          <div className="space-y-5">
            {view === 'production' && (
              <section className="space-y-4 rounded-2xl border border-ink/10 bg-white/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-ink">Resumen de producción</h3>
                    <p className="text-sm text-ink/60">{period === 'week' ? `${shortDate(periodDate)} al ${periodEnd(periodDate)}` : shortDate(periodDate)}</p>
                  </div>
                  <div className="inline-flex rounded-xl bg-canvas p-1" aria-label="Período del resumen">
                    <button type="button" aria-pressed={period === 'day'} onClick={() => setPeriod('day')} className={`min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${period === 'day' ? 'bg-white text-primary shadow-sm' : 'text-ink/65'}`}>Día</button>
                    <button type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')} className={`min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${period === 'week' ? 'bg-white text-primary shadow-sm' : 'text-ink/65'}`}>Semana</button>
                  </div>
                </div>
                <InputField label={period === 'week' ? 'Semana desde' : 'Día'} type="date" value={periodDate} onChange={(event) => setPeriodDate(event.target.value)} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SummaryValue label="Unidades" value={formatAmount(periodTotals.units)} />
                  <SummaryValue label="Costo estimado" value={formatCurrencyARS(periodTotals.costo.toNumber())} />
                  <SummaryValue label="Ingreso estimado" value={periodTotals.hasProfitEstimate ? formatCurrencyARS(periodTotals.ingreso.toNumber()) : '—'} />
                  <SummaryValue label="Ganancia estimada" value={periodTotals.hasProfitEstimate ? formatCurrencyARS(periodTotals.ganancia.toNumber()) : '—'} />
                </div>
                {!periodTotals.hasProfitEstimate && periodTotals.units > 0 && (
                  <p className="text-xs text-ink/60">Completá el precio sugerido o el margen/markup de cada producto para estimar ingresos y ganancias.</p>
                )}
              </section>
            )}

            <section className="space-y-3">
              <h3 className="font-heading text-lg font-bold text-ink">
                {view === 'orders' ? 'Pedidos cargados' : 'Producción planificada'}
                <span className="font-body text-sm font-normal text-ink/50"> ({visibleEntries.length})</span>
              </h3>
              {visibleEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-6 text-sm text-ink/65">
                  {view === 'orders' ? 'Todavía no cargaste pedidos.' : 'Todavía no planificaste producción.'}
                </div>
              ) : (
                <ul className="space-y-3">
                  {visibleEntries.map((entry) => {
                    const product = products.find((item) => item.id === entry.product_id);
                    const estimate = product ? estimateProduct(product, entry.cantidad, workspace.inventario) : null;
                    const entryShortages = entry.estado === 'planned' && product
                      ? getOperationShortages(workspace.inventario, [], products, entry)
                      : [];
                    return (
                      <li key={entry.id} className="rounded-2xl bg-white/80 p-4 shadow-sm sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-ink">{product?.nombre ?? 'Producto eliminado'}</h4>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.estado === 'completed' ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-ink'}`}>
                                {entry.estado === 'completed' ? 'Realizado' : 'Planificado'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-ink/65">
                              {formatAmount(entry.cantidad)} unidades · {shortDate(entry.fecha)}
                              {entry.cliente ? ` · ${entry.cliente}` : ''}
                            </p>
                            {entry.notas && <p className="mt-2 text-sm text-ink/65">{entry.notas}</p>}
                          </div>
                          {entry.estado === 'planned' && (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => completeEntry(entry)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                <span aria-hidden="true">✓</span> Realizado
                              </button>
                              <button type="button" aria-label={`Eliminar ${entry.tipo === 'order' ? 'pedido' : 'producción'} de ${product?.nombre ?? 'producto'}`} onClick={() => deletePlannedEntry(entry)} className="min-h-11 rounded-lg px-3 text-danger hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger">
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                        {estimate && (
                          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink/10 pt-3 text-sm sm:grid-cols-3">
                            <SummaryValue label="Costo estimado" value={formatCurrencyARS(estimate.costoTotal.toNumber())} />
                            <SummaryValue label="Venta estimada" value={estimate.ingresoTotal ? formatCurrencyARS(estimate.ingresoTotal.toNumber()) : '—'} />
                            <SummaryValue label="Ganancia estimada" value={estimate.gananciaTotal ? formatCurrencyARS(estimate.gananciaTotal.toNumber()) : '—'} />
                          </div>
                        )}
                        {entryShortages.length > 0 && (
                          <p className="mt-3 rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
                            Faltan {entryShortages.map((item) => `${formatAmount(item.cantidad.toNumber())} ${item.unidad} de ${item.nombre}`).join(', ')} para cubrir la planificación.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink/55">{label}</p>
      <p className="mt-0.5 break-words font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
