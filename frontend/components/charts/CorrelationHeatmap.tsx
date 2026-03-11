'use client';

import { useMemo, useState } from 'react';

interface CorrelationHeatmapProps {
  original: Record<string, Record<string, number>>;
  synthetic: Record<string, Record<string, number>>;
}

type MatrixCell = {
  x: number;
  y: number;
  columnX: string;
  columnY: string;
  original: number;
  synthetic: number;
};

const cellSize = 28;

function toHeatColor(value: number) {
  const normalized = Math.max(-1, Math.min(1, value));
  if (normalized < 0) {
    const ratio = Math.abs(normalized);
    const red = Math.round(255 - ratio * 179);
    const green = Math.round(255 - ratio * 191);
    return `rgb(${red}, ${green}, 255)`;
  }

  const ratio = normalized;
  const green = Math.round(255 - ratio * 191);
  const blue = Math.round(255 - ratio * 191);
  return `rgb(255, ${green}, ${blue})`;
}

export function CorrelationHeatmap({ original, synthetic }: CorrelationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<MatrixCell | null>(null);

  const matrix = useMemo(() => {
    const columns = Object.keys(original);
    const cells: MatrixCell[] = [];

    columns.forEach((columnY, y) => {
      columns.forEach((columnX, x) => {
        cells.push({
          x,
          y,
          columnX,
          columnY,
          original: original[columnY]?.[columnX] ?? 0,
          synthetic: synthetic[columnY]?.[columnX] ?? 0,
        });
      });
    });

    return { columns, cells };
  }, [original, synthetic]);

  if (matrix.columns.length === 0) {
    return <p className="text-sm text-text-2">No numeric columns available for correlation heatmap.</p>;
  }

  const totalSize = matrix.columns.length * cellSize;

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {([
          { key: 'original', label: 'Original Correlation' },
          { key: 'synthetic', label: 'Synthetic Correlation' },
        ] as const).map((panel) => (
          <div key={panel.key} className="overflow-auto rounded-btn border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">{panel.label}</p>
            <svg width={totalSize + 80} height={totalSize + 80}>
              {matrix.columns.map((column, index) => (
                <text
                  key={`x-${panel.key}-${column}`}
                  x={55 + index * cellSize + cellSize / 2}
                  y={20}
                  textAnchor="middle"
                  className="fill-text-3 text-[9px]"
                >
                  {column}
                </text>
              ))}

              {matrix.columns.map((column, index) => (
                <text
                  key={`y-${panel.key}-${column}`}
                  x={6}
                  y={45 + index * cellSize}
                  className="fill-text-3 text-[9px]"
                >
                  {column}
                </text>
              ))}

              {matrix.cells.map((cell) => {
                const value = panel.key === 'original' ? cell.original : cell.synthetic;
                return (
                  <rect
                    key={`${panel.key}-${cell.columnX}-${cell.columnY}`}
                    x={40 + cell.x * cellSize}
                    y={30 + cell.y * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill={toHeatColor(value)}
                    stroke="rgba(17, 24, 39, 0.2)"
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </svg>
          </div>
        ))}
      </div>

      {hoveredCell && (
        <div className="rounded-btn border border-border bg-surface-2 p-3 text-xs text-text-2">
          <p>
            <span className="font-semibold text-text">{hoveredCell.columnY}</span> vs{' '}
            <span className="font-semibold text-text">{hoveredCell.columnX}</span>
          </p>
          <p>Original: {hoveredCell.original.toFixed(4)}</p>
          <p>Synthetic: {hoveredCell.synthetic.toFixed(4)}</p>
        </div>
      )}
    </div>
  );
}
