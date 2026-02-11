'use client';

import { useRef, useEffect } from 'react';
import type { ChartDataPoint } from '@/types';

interface LineChartProps {
  data: ChartDataPoint[];
  label: string;
}

export function LineChart({ data, label }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const style = getComputedStyle(document.documentElement);
    const gridColor = style.getPropertyValue('--chart-grid').trim() || '#ddd';
    const textColor = style.getPropertyValue('--chart-text').trim() || '#666';
    const lineColor = style.getPropertyValue('--chart-line').trim() || '#333';
    const successColor = style.getPropertyValue('--chart-success').trim() || '#4caf50';
    const failColor = style.getPropertyValue('--chart-fail').trim() || '#ef5350';
    const bgColor = style.getPropertyValue('--bg-th').trim() || '#fafafa';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    if (data.length < 2) {
      ctx.fillStyle = textColor;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Not enough data yet', W / 2, H / 2);
      return;
    }

    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const weights = data.map((d) => d.weight);
    const minW = Math.floor(Math.min(...weights) / 5) * 5 - 5;
    const maxW = Math.ceil(Math.max(...weights) / 5) * 5 + 5;
    const range = maxW - minW || 10;

    const x = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
    const y = (w: number) => pad.top + plotH - ((w - minW) / range) * plotH;

    // Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    const step = range <= 30 ? 5 : range <= 60 ? 10 : 20;
    for (let w = minW; w <= maxW; w += step) {
      ctx.beginPath();
      ctx.moveTo(pad.left, y(w));
      ctx.lineTo(W - pad.right, y(w));
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(w), pad.left - 6, y(w) + 3);
    }

    // X axis labels
    ctx.fillStyle = textColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const labelInterval = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += labelInterval) {
      ctx.fillText(`#${data[i].workout}`, x(i), H - 8);
    }

    // Line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0].weight));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(x(i), y(data[i].weight));
    }
    ctx.stroke();

    // Dots
    for (let i = 0; i < data.length; i++) {
      if (data[i].result) {
        ctx.beginPath();
        ctx.arc(x(i), y(data[i].weight), 4, 0, Math.PI * 2);
        ctx.fillStyle = data[i].result === 'success' ? successColor : failColor;
        ctx.fill();
      }
    }

    // Stage change markers
    for (let i = 1; i < data.length; i++) {
      if (data[i].stage !== data[i - 1].stage) {
        ctx.strokeStyle = failColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x(i), pad.top);
        ctx.lineTo(x(i), pad.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = textColor;
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`S${data[i].stage}`, x(i), pad.top - 4);
      }
    }
  }, [data, label]);

  return <canvas ref={canvasRef} className="w-full h-[200px]" />;
}
