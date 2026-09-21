import {
  createMemoryStore,
  createMemoryTransport,
  createPrometeoPublicState
} from '../prometeo-public-state.mjs';

// Synthetic canonical data only. This is intentionally not wired to real Habits.
const behaviorEvents = [
  {date:'2026-09-14', state:'done'},
  {date:'2026-09-15', state:'done'},
  {date:'2026-09-16', state:'done'},
  {date:'2026-09-17', state:'done'},
  {date:'2026-09-18', state:'done'},
  {date:'2026-09-19', state:'done'},
  {date:'2026-09-20', state:'done'}
];

const currentStreak = events => {
  let streak = 0;
  for (let i = events.length - 1; i >= 0 && events[i].state === 'done'; i--) streak++;
  return streak;
};

const transport = createMemoryTransport();
const registry = {
  'habits.exercise.current_streak': {
    source: 'habits.projection/v1',
    channels: ['home'],
    visibilities: ['workspace'],
    validate: Number.isInteger
  }
};

const habitsProjection = createPrometeoPublicState({
  workspaceId: 'synthetic-workspace',
  store: createMemoryStore(),
  transport,
  registry
});

const tvRenderer = createPrometeoPublicState({
  workspaceId: 'synthetic-workspace',
  store: createMemoryStore(),
  transport
});

await tvRenderer.subscribe(
  'habits.exercise.current_streak',
  value => console.log(`${value} días`),
  {channel:'home'}
);

await habitsProjection.publish(
  'habits.exercise.current_streak',
  currentStreak(behaviorEvents),
  {
    channel:'home',
    source:'habits.projection/v1',
    sourceVersion:1,
    visibility:'workspace',
    operationId:'synthetic-habit-projection-1'
  }
);
