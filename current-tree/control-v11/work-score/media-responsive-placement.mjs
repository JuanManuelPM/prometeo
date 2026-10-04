export function mediaResponsivePlacement(width) {
  const w = Number(width);
  const safeWidth = Number.isFinite(w) && w > 0 ? w : 0;
  if (safeWidth <= 520) {
    return {
      mode: 'phone_compact',
      top_grid_columns: '1fr',
      media_min_height_px: 160,
      frame_min_height_px: 104,
      controls_wrap: true,
      url_input_full_row: true
    };
  }
  if (safeWidth <= 900) {
    return {
      mode: 'stacked',
      top_grid_columns: '1fr',
      media_min_height_px: 180,
      frame_min_height_px: 116,
      controls_wrap: false,
      url_input_full_row: false
    };
  }
  return {
    mode: 'rail',
    top_grid_columns: 'minmax(220px,.55fr) minmax(0,1.45fr) minmax(240px,.7fr)',
    media_min_height_px: 150,
    frame_min_height_px: 116,
    controls_wrap: false,
    url_input_full_row: false
  };
}
