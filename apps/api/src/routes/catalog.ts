/**
 * Catalog routes — public endpoints serving program definitions.
 * No auth required — these are read-only reference data.
 */
import { Elysia, t } from 'elysia';
import { getAllPresetPrograms, getProgramDefinition } from '@gzclp/shared/programs/registry';
import { ApiError } from '../middleware/error-handler';

export const catalogRoutes = new Elysia({ prefix: '/catalog' })

  // GET /catalog — list all available program definitions
  .get('/', () => {
    return getAllPresetPrograms();
  })

  // GET /catalog/:programId — get a specific program definition
  .get(
    '/:programId',
    ({ params }) => {
      const definition = getProgramDefinition(params.programId);
      if (!definition) {
        throw new ApiError(404, 'Program not found', 'PROGRAM_NOT_FOUND');
      }
      return definition;
    },
    {
      params: t.Object({
        programId: t.String(),
      }),
    }
  );
