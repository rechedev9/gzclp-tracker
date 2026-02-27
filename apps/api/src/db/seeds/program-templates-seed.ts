/**
 * Idempotent seed for the program_templates table.
 * Inserts 8 preset programs with their full JSONB definitions.
 * Exercise names are omitted from JSONB — they are resolved from the exercises table at hydration time.
 * Uses onConflictDoNothing() to allow re-runs without error.
 */
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { programTemplates } from '../schema';
import type * as schema from '../schema';
import { GZCLP_DEFINITION_JSONB } from './programs/gzclp';
import { PPL531_DEFINITION_JSONB } from './programs/ppl531';
import { STRONGLIFTS_DEFINITION_JSONB } from './programs/stronglifts';
import { GSLP_DEFINITION_JSONB } from './programs/greyskull';
import { BBB_DEFINITION_JSONB } from './programs/bbb';
import { FSL531_DEFINITION_JSONB } from './programs/fsl531';
import { PHUL_DEFINITION_JSONB } from './programs/phul';
import { NIVEL7_DEFINITION_JSONB } from './programs/nivel7';

type DbClient = PostgresJsDatabase<typeof schema>;

export async function seedProgramTemplates(db: DbClient): Promise<void> {
  await db
    .insert(programTemplates)
    .values([
      {
        id: 'gzclp',
        name: 'GZCLP',
        description:
          'Un programa de progresión lineal basado en el método GZCL. ' +
          'Rotación de 4 días con ejercicios T1, T2 y T3 para desarrollar fuerza en los levantamientos compuestos principales. ' +
          'Comunidad en r/gzcl.',
        author: 'Cody LeFever',
        version: 1,
        category: 'strength',
        source: 'preset',
        definition: GZCLP_DEFINITION_JSONB,
        isActive: true,
      },
      {
        id: 'ppl531',
        name: 'PPL 5/3/1 + Double Progression',
        description:
          'Programa Push/Pull/Legs de 6 días por semana combinando la metodología 5/3/1 ' +
          'para los levantamientos principales con doble progresión para los accesorios. ' +
          'Creado por HeXaN.',
        author: 'HeXaN',
        version: 1,
        category: 'hypertrophy',
        source: 'preset',
        definition: PPL531_DEFINITION_JSONB,
        isActive: true,
      },
      {
        id: 'stronglifts5x5',
        name: 'StrongLifts 5x5',
        description:
          'Programa clásico de fuerza para principiantes. ' +
          'Dos entrenamientos alternos (A/B), 3 días por semana. ' +
          'Sentadilla en cada sesión, progresión lineal de +2.5 kg por entrenamiento (+5 kg en peso muerto). ' +
          'Tres fallos consecutivos provocan una descarga del 10%.',
        author: 'Mehdi Hadim',
        version: 1,
        category: 'strength',
        source: 'preset',
        definition: STRONGLIFTS_DEFINITION_JSONB,
        isActive: true,
      },
      {
        id: 'phraks-gslp',
        name: "Phrak's Greyskull LP",
        description:
          'Programa de fuerza para principiantes de Phrakture. ' +
          'Dos entrenamientos alternos (A/B), 3 días por semana. ' +
          'Cada ejercicio termina con una serie AMRAP (al fallo técnico). ' +
          'Progresión lineal con descarga del 10% al fallar.',
        author: 'Phrakture (r/Fitness)',
        version: 1,
        category: 'strength',
        source: 'preset',
        definition: GSLP_DEFINITION_JSONB,
        isActive: true,
      },
      {
        id: 'wendler531bbb',
        name: '5/3/1 Boring But Big',
        description:
          'Plantilla clásica de 5/3/1 con suplemento Boring But Big (5×10 al 50% del TM). ' +
          'Ciclos de 4 semanas: 5s, 3s, 5/3/1 y descarga. ' +
          '4 días por semana con progresión del Training Max tras cada ciclo.',
        author: 'Jim Wendler',
        version: 1,
        category: 'strength',
        source: 'preset',
        definition: BBB_DEFINITION_JSONB,
        isActive: true,
      },
      {
        id: 'wendler531beginners',
        name: '5/3/1 for Beginners',
        description:
          'Programa de fuerza para principiantes de Jim Wendler. ' +
          'Cuerpo completo 3 días por semana con dos levantamientos principales por sesión. ' +
          'Ciclos de 3 semanas (5s, 3s, 5/3/1) con FSL (First Set Last) 5×5 como suplemento. ' +
          'Progresión del Training Max tras cada ciclo.',
        author: 'Jim Wendler',
        version: 1,
        category: 'strength',
        source: 'preset',
        definition: FSL531_DEFINITION_JSONB,
        isActive: true,
      },
      {
        id: 'phul',
        name: 'PHUL',
        description:
          'Power Hypertrophy Upper Lower — programa de 4 días que combina fuerza e hipertrofia. ' +
          'Dos días de fuerza (compuestos pesados 3-5 reps) y dos de hipertrofia (8-12 reps). ' +
          'Los compuestos principales progresan linealmente, los accesorios con doble progresión.',
        author: 'Brandon Campbell',
        version: 1,
        category: 'hypertrophy',
        source: 'preset',
        definition: PHUL_DEFINITION_JSONB,
        isActive: true,
      },
      {
        id: 'nivel7',
        name: 'Nivel 7',
        description:
          'Programa de fuerza de 12 semanas con periodización inversa. ' +
          'Configuras el récord objetivo (semana 6) y los pesos se calculan hacia atrás. ' +
          'Bloque 1 (5×5) con descarga en semana 3, Bloque 2 (3×3) culminando en récord. ' +
          'Ciclo 2 repite la onda con +2.5kg. Accesorios con doble progresión 3×8-12. ' +
          '4 días/semana: hombros/tríceps, espalda/gemelo, pecho/bíceps, pierna.',
        author: 'nivel7 (musclecoop)',
        version: 1,
        category: 'strength',
        source: 'preset',
        definition: NIVEL7_DEFINITION_JSONB,
        isActive: true,
      },
    ])
    .onConflictDoUpdate({
      target: programTemplates.id,
      set: {
        description: sql`excluded.description`,
        author: sql`excluded.author`,
        definition: sql`excluded.definition`,
      },
    });
}
