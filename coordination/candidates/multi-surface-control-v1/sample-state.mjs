export const sampleState = {
  schema: 'prometeo.multi-surface-control-state/v1',
  generatedAt: 'SAMPLE_NOT_LIVE',
  telemetry: { sourceOfTruth: false },
  surfaces: [
    {
      id: 'control-plan',
      title: 'Plan de acción / Universal Control',
      projectId: 'project-prometeo-chat-control',
      intent: {
        summary: 'Convertir intención humana durable en trabajo visible, verificable y localmente integrable.',
        threadRef: 'coordination/workstreams/chat-native-control-plane-v1/FOCUS.json',
        state: 'DURABLE_FOCUS_AVAILABLE'
      },
      workers: { active: ['sample-worker-control'] },
      returns: { items: [{ id: 'sample-return-control', state: 'CANDIDATE' }], unread: 1 },
      integration: { status: 'DISCOVERY', evidenceRef: 'coordination/CONTINUITY_HEAD.json' },
      preview: {
        label: 'Abrir Universal Control servido',
        href: 'https://juanmanuelpm.github.io/prometeo/',
        routeState: 'KNOWN_SERVED_BASELINE'
      },
      capacity: { usefulFreeSlots: 2, basis: 'SAMPLE derived from compatible unclaimed lanes' },
      authority: { source: 'SAMPLE_DERIVED', humanAccepted: false, current: false, served: false }
    },
    {
      id: 'prometeo-mobile',
      title: 'Prometeo móvil',
      projectId: 'project-prometeo-chat-control',
      intent: {
        summary: 'Superficie móvil de Prometeo con loop local de cambio y verificación.',
        threadRef: 'UNRESOLVED',
        state: 'PREPARED_NOT_BOUND'
      },
      workers: { active: ['sample-worker-mobile-a', 'sample-worker-mobile-b'] },
      returns: { items: [], unread: 0 },
      integration: { status: 'UNPROVEN', evidenceRef: 'UNRESOLVED' },
      preview: { label: 'Abrir preview', href: null, routeState: 'UNRESOLVED' },
      capacity: { usefulFreeSlots: 1, basis: 'SAMPLE compatible surface lanes' },
      authority: { source: 'SAMPLE_DERIVED', humanAccepted: false, current: false, served: false }
    },
    {
      id: 'facultad-digital',
      title: 'Facultad Digital / Study Library',
      projectId: 'project-facultad',
      intent: {
        summary: 'Root de facultad registrado; falta binding durable completo antes de asumir rutas o autoridad.',
        threadRef: 'coordination/workstreams/chat-native-control-plane-v1/PROJECT_INDEX.json',
        state: 'DISCOVERY_REQUIRED'
      },
      workers: { active: [] },
      returns: { items: [{ id: 'sample-return-facultad-discovery', state: 'CANDIDATE' }], unread: 1 },
      integration: { status: 'NOT_STARTED', evidenceRef: 'coordination/CONTINUITY_HEAD.json' },
      preview: { label: 'Abrir preview', href: null, routeState: 'UNRESOLVED' },
      capacity: { usefulFreeSlots: 2, basis: 'SAMPLE surface discovery lanes' },
      authority: { source: 'SAMPLE_DERIVED', humanAccepted: false, current: false, served: false }
    },
    {
      id: 'alumnos-teacher',
      title: 'Alumnos / página docente',
      projectId: 'project-alumnos',
      intent: {
        summary: 'Root de alumnos registrado con workstreams históricos; el control debe resolver el child correcto sin inventar una ruta.',
        threadRef: 'coordination/workstreams/chat-native-control-plane-v1/PROJECT_INDEX.json',
        state: 'DISCOVERY_REQUIRED'
      },
      workers: { active: ['sample-worker-alumnos'] },
      returns: { items: [], unread: 0 },
      integration: { status: 'DISCOVERY', evidenceRef: 'coordination/CONTINUITY_HEAD.json' },
      preview: { label: 'Abrir preview', href: null, routeState: 'UNRESOLVED' },
      capacity: { usefulFreeSlots: 1, basis: 'SAMPLE surface discovery lanes' },
      authority: { source: 'SAMPLE_DERIVED', humanAccepted: false, current: false, served: false }
    }
  ]
};
