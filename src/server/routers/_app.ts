import { router } from '../trpc';
import { rosterRouter } from './roster';
import { cwlRouter } from './cwl';
import { dashboardRouter } from './dashboard';
import { syncRouter } from './sync';
import { performanceRouter } from './performance';

export const appRouter = router({
  roster: rosterRouter,
  cwl: cwlRouter,
  dashboard: dashboardRouter,
  sync: syncRouter,
  performance: performanceRouter,
});

export type AppRouter = typeof appRouter;
