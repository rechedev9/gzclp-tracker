import type React from 'react';

/* ── Types ──────────────────────────────────────── */

export interface Feature {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly desc: string;
}

export interface Step {
  readonly num: string;
  readonly title: string;
  readonly desc: string;
  readonly quote: string;
  readonly source: string;
}

export interface Metric {
  readonly value: string;
  readonly label: string;
  readonly suffix: string;
}

export interface Persona {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly desc: string;
}

/* ── Data ──────────────────────────────────────── */

export const FEATURES: readonly Feature[] = [
  {
    icon: (
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Progresión Inteligente',
    desc: 'La app decide cuándo agregar peso y cómo manejar el fallo. Tú solo apareces y entrenas.',
  },
  {
    icon: (
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    ),
    title: 'Programas Probados',
    desc: 'Programas de entrenamiento respaldados por la ciencia con periodización estructurada. Nuevos programas agregados regularmente.',
  },
  {
    icon: (
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Estadísticas y Gráficas',
    desc: 'Ve tu curva de fuerza a lo largo del tiempo. Datos reales, no suposiciones.',
  },
  {
    icon: (
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: 'Sin Conexión Primero',
    desc: 'Funciona sin internet. Tus datos se quedan en tu dispositivo. Sincronización opcional si la necesitas.',
  },
];

export const STEPS: readonly Step[] = [
  {
    num: '01',
    title: 'Establece tus Pesos',
    desc: 'Ingresa tus pesos iniciales para cada levantamiento. El programa construye tu plan completo de 90 entrenamientos al instante.',
    quote: '"Superaré mis límites aquí y ahora."',
    source: '\u2014 Goku, entrando a la Cámara del Tiempo',
  },
  {
    num: '02',
    title: 'Sigue el Programa',
    desc: 'Cada entrenamiento te dice exactamente qué hacer \u2014 ejercicio, series, repeticiones, peso. Sin adivinar.',
    quote: '"Un año aquí es solo un día afuera. Hagamos que cada segundo cuente."',
    source: '\u2014 Vegeta, Cámara del Tiempo',
  },
  {
    num: '03',
    title: 'Progresa Automáticamente',
    desc: 'Completa tus reps y el peso sube. Fallas y el programa se adapta \u2014 ajustando el volumen para mantenerte avanzando.',
    quote:
      '"El entrenamiento real comienza cuando empujas más allá de lo que crees que es tu límite."',
    source: '\u2014 Goku, entrenando a Gohan',
  },
];

export const SCIENCE_CARDS: readonly Feature[] = [
  {
    icon: (
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mx-auto"
      >
        <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Sobrecarga Progresiva',
    desc: 'El peso sube cuando estás listo. Ni antes, ni después. El programa decide.',
  },
  {
    icon: (
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mx-auto"
      >
        <path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Manejo del Fallo',
    desc: '¿Fallaste un levantamiento? El programa se adapta \u2014 ajustando volumen e intensidad para que sigas progresando.',
  },
  {
    icon: (
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mx-auto"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Cero Pensar',
    desc: 'Entra al gimnasio sabiendo exactamente qué hacer. Sin planeación, sin hojas de cálculo, sin tiempo perdido.',
  },
];

export const METRICS: readonly Metric[] = [
  { value: '90', label: 'Entrenamientos Planificados', suffix: '' },
  { value: '6', label: 'Levantamientos Principales', suffix: '' },
  { value: '3', label: 'Sistema de Niveles', suffix: 'niveles' },
];

export const PERSONAS: readonly Persona[] = [
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Principiantes',
    desc: 'No se necesita experiencia. El programa te dice exactamente qué hacer cada sesión \u2014 solo síguelo.',
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M6 18L18 6M8 6h10v10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Atletas Intermedios',
    desc: 'Rompe estancamientos con periodización estructurada. El sistema de niveles se adapta cuando te estancas.',
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: 'Saltadores de Programa',
    desc: 'Deja de saltar entre programas. Mantente con un sistema probado y observa cómo suben los números.',
  },
];
