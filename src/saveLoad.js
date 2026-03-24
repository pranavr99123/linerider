export function exportTrack(track) {
  return JSON.stringify(track.data, null, 2);
}

export function importTrack(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.segments) || !parsed.settings) {
    throw new Error("Invalid track JSON.");
  }
  return parsed;
}
