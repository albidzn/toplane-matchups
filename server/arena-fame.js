// Arena Season Journey progress (Level + Fame), read from the League client — the
// value shown in the client lobby as "Level N · X Fame". There's no dedicated
// "arena journey" REST resource; it's a lol-reward-track "progression group"
// named like "<season> Cherry Main Progress Track", a new group each season.
// Only the CURRENT season's group serves real progress numbers — past-season
// groups respond with no usable `passProgress` — so every "Cherry ... Main
// Progress Track" group (excluding the separate "Champs Completed" track,
// which doesn't expose per-champion detail) is tried until one has real data.
let cachedGroupId = null;

async function fetchProgress(lcu, groupId) {
  const progress = await lcu.get(`/lol-reward-track/${groupId}/reward-track/progress`).catch(() => null);
  return progress && typeof progress.passProgress === "number" ? progress : null;
}

function toFame(p) {
  return { level: p.level, fame: p.passProgress, totalLevels: p.totalLevels, levelProgress: p.levelProgress };
}

/** Current Arena Season Journey level/fame from the League client, or null if unavailable. */
export async function getArenaSeasonFame(lcu) {
  if (cachedGroupId) {
    const progress = await fetchProgress(lcu, cachedGroupId);
    if (progress) return toFame(progress);
    cachedGroupId = null; // season likely rolled over — re-discover below
  }

  let groups;
  try {
    groups = await lcu.get("/lol-progression/v1/groups/configuration");
  } catch {
    return null;
  }
  if (!Array.isArray(groups)) return null;

  const candidates = groups.filter(
    (g) => typeof g?.name === "string" && /cherry/i.test(g.name) && /main/i.test(g.name) && !/champs/i.test(g.name)
  );
  for (const g of candidates) {
    const progress = await fetchProgress(lcu, g.id);
    if (progress) {
      cachedGroupId = g.id;
      return toFame(progress);
    }
  }
  return null;
}
