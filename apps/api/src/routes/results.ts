/**
 * Result routes — record, delete, and undo workout results.
 * Nested under /programs/:id/results. All routes require auth.
 */
import { Elysia, t } from 'elysia';
import { jwtPlugin, resolveUserId } from '../middleware/auth-guard';
import { rateLimit } from '../middleware/rate-limit';
import { recordResult, deleteResult, undoLast } from '../services/results';

export const resultRoutes = new Elysia({ prefix: '/programs/:id' })
  .use(jwtPlugin)
  .resolve(resolveUserId)

  // POST /programs/:id/results — record a workout result
  .post(
    '/results',
    async ({ userId, params, body, set }) => {
      rateLimit(userId, 'POST /programs/results');
      const result = await recordResult(userId, params.id, body);
      set.status = 201;
      return {
        workoutIndex: result.workoutIndex,
        slotId: result.slotId,
        result: result.result,
        ...(result.amrapReps !== null ? { amrapReps: result.amrapReps } : {}),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        workoutIndex: t.Integer({ minimum: 0 }),
        slotId: t.String({ minLength: 1 }),
        result: t.Union([t.Literal('success'), t.Literal('fail')]),
        amrapReps: t.Optional(t.Integer({ minimum: 0 })),
      }),
    }
  )

  // DELETE /programs/:id/results/:workoutIndex/:slotId — delete a result
  .delete(
    '/results/:workoutIndex/:slotId',
    async ({ userId, params, set }) => {
      await deleteResult(userId, params.id, params.workoutIndex, params.slotId);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
        workoutIndex: t.Numeric(),
        slotId: t.String(),
      }),
    }
  )

  // POST /programs/:id/undo — undo last action
  .post(
    '/undo',
    async ({ userId, params }) => {
      rateLimit(userId, 'POST /programs/undo');
      const entry = await undoLast(userId, params.id);
      if (!entry) {
        return { undone: null };
      }
      return {
        undone: {
          i: entry.workoutIndex,
          slotId: entry.slotId,
          ...(entry.prevResult !== null ? { prev: entry.prevResult } : {}),
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );
