'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { checkSupplyInflationStatus } from '@/domain/calculator/inflation';

interface InflationAlertBadgeProps {
  fechaActualizacionIso?: string;
  nombreInsumo?: string;
  onUpdateRequested?: () => void;
}

export function InflationAlertBadge({
  fechaActualizacionIso,
  nombreInsumo,
  onUpdateRequested,
}: InflationAlertBadgeProps) {
  const status = checkSupplyInflationStatus(fechaActualizacionIso);

  if (status.nivel === 'ok') {
    return (
      <Badge variant="default" className="text-[11px] font-normal opacity-85">
        ✓ {status.mensaje}
      </Badge>
    );
  }

  if (status.nivel === 'warning') {
    return (
      <div className="inline-flex items-center gap-1.5">
        <Badge variant="accent" className="text-[11px] font-semibold text-ink">
          ⚠️ {status.mensaje}
        </Badge>
        {onUpdateRequested && (
          <button
            type="button"
            onClick={onUpdateRequested}
            className="text-[11px] text-primary hover:underline font-semibold ml-1"
          >
            Actualizar
          </button>
        )}
      </div>
    );
  }

  // Critical (> 45 días)
  return (
    <div className="inline-flex items-center gap-1.5">
      <Badge variant="danger" className="text-[11px] font-bold animate-pulse">
        🚨 Desactualizado (+{status.diasDesdeActualizacion} días)
      </Badge>
      {onUpdateRequested && (
        <button
          type="button"
          onClick={onUpdateRequested}
          className="text-[11px] text-danger hover:underline font-bold ml-1"
          title={`Actualizar precio de ${nombreInsumo || 'insumo'}`}
        >
          Ajustar precio
        </button>
      )}
    </div>
  );
}
