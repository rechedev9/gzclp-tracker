/**
 * Program routes — CRUD for program instances. All routes require auth.
 */
import { Elysia, t } from 'elysia';
import { jwtPlugin, resolveUserId } from '../middleware/auth-guard';
import {
  createInstance,
  getInstances,
  getInstance,
  updateInstance,
  deleteInstance,
} from '../services/programs';

export const programRoutes = new Elysia({ prefix: '/programs' })
  .use(jwtPlugin)
  .resolve(resolveUserId)

  // GET /programs — list user's program instances
  .get('/', async ({ userId }) => {
    const instances = await getInstances(userId);
    return instances;
  })

  // POST /programs — create a new program instance
  .post(
    '/',
    async ({ userId, body }) => {
      const instance = await createInstance(userId, body.programId, body.name, body.config);
      return instance;
    },
    {
      body: t.Object({
        programId: t.String({ minLength: 1 }),
        name: t.String({ minLength: 1, maxLength: 100 }),
        config: t.Record(t.String(), t.Number()),
      }),
    }
  )

  // GET /programs/:id — get a single program instance with results
  .get(
    '/:id',
    async ({ userId, params }) => {
      const instance = await getInstance(userId, params.id);
      return instance;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // PATCH /programs/:id — update a program instance
  .patch(
    '/:id',
    async ({ userId, params, body }) => {
      const instance = await updateInstance(userId, params.id, body);
      return instance;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        status: t.Optional(
          t.Union([t.Literal('active'), t.Literal('completed'), t.Literal('archived')])
        ),
        config: t.Optional(t.Record(t.String(), t.Number())),
      }),
    }
  )

  // DELETE /programs/:id — delete a program instance
  .delete(
    '/:id',
    async ({ userId, params, set }) => {
      await deleteInstance(userId, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
