/**
 * Result routes — record, delete, and undo workout results.
 * Nested under /programs/:id/results. All routes require auth.
 */
import { Elysia, t } from 'elysia';
import { jwtPlugin, resolveUserId } from '../middleware/auth-guard';
import { recordResult, deleteResult, undoLast } from '../services/results';

export const resultRoutes = new Elysia({ prefix: '/programs/:id' })
  .use(jwtPlugin)
  .resolve(resolveUserId)

  // POST /programs/:id/results — record a workout result
  .post(
    '/results',
    async ({ userId, params, body }) => {
      const result = await recordResult(userId, params.id, body);
      return result;
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
      await deleteResult(userId, params.id, Number(params.workoutIndex), params.slotId);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
        workoutIndex: t.String(),
        slotId: t.String(),
      }),
    }
  )

  // POST /programs/:id/undo — undo last action
  .post(
    '/undo',
    async ({ userId, params }) => {
      const entry = await undoLast(userId, params.id);
      if (!entry) {
        return { message: 'nothing to undo' };
      }
      return { undone: entry };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );
