export const PROMETEO_MENU = Object.freeze({
  id: 'root',
  title: 'Prometeo',
  items: [
    { id: 'record', label: 'Grabar una nota', action: 'record' },
    { id: 'notes', label: 'Notas y trabajo', action: 'notes' },
    {
      id: 'pages',
      label: 'Páginas',
      items: [
        { id: 'live', label: 'Prometeo Live', href: './experiments/prometeo-live/' },
      ]
    },
    {
      id: 'legacy',
      label: 'Legado',
      items: [
        { id: 'v5', label: 'Prometeo anterior', href: './legacy/prometeo-v5/' }
      ]
    }
  ]
});
