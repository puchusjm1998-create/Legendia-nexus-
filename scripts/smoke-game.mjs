// Prueba end-to-end: node scripts/smoke-game.mjs
// Requiere que la app y PostgreSQL estén iniciados. No usa credenciales admin.
import assert from "node:assert/strict";

const base = process.env.GAME_URL || "http://127.0.0.1:3000";
const api = async (path, token, body) => {
  const res = await fetch(`${base}/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, data: await res.json() };
};
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const requireOk = (res, label) => {
  assert.equal(res.status, 200, `${label}: ${JSON.stringify(res.data)}`);
  return res.data;
};

function reachable(actor, units) {
  const occupied = new Set(units.filter((u) => u.alive && u.uid !== actor.uid).map((u) => `${u.x},${u.y}`));
  const visited = new Set([`${actor.x},${actor.y}`]);
  const queue = [{ x: actor.x, y: actor.y, depth: 0 }];
  const out = [];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur.depth > 0) out.push(cur);
    if (cur.depth >= actor.move) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cur.x + dx, y = cur.y + dy, key = `${x},${y}`;
      if (x >= 0 && x < 7 && y >= 0 && y < 5 && !visited.has(key) && !occupied.has(key)) {
        visited.add(key);
        queue.push({ x, y, depth: cur.depth + 1 });
      }
    }
  }
  return out;
}

function decide(state) {
  const actor = state.units.find((u) => u.uid === state.currentUid);
  assert.equal(actor?.side, "ally", "El servidor debe entregar un turno aliado");
  const foes = state.units.filter((u) => u.side === "enemy" && u.alive);
  const allies = state.units.filter((u) => u.side === "ally" && u.alive);
  const wounded = allies.filter((u) => u.hp / u.maxHp < 0.55)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (actor.skill.target === "ally" && actor.cd === 0 && actor.chakra >= actor.skill.cost &&
      wounded && distance(actor, wounded) <= actor.skill.range)
    return { type: "skill", targetUid: wounded.uid };
  let target = foes.filter((u) => distance(actor, u) <= actor.range).sort((a, b) => a.hp - b.hp)[0];
  if (target) return { type: "attack", targetUid: target.uid };
  if (actor.skill.target === "enemy" && actor.cd === 0 && actor.chakra >= actor.skill.cost) {
    target = foes.filter((u) => distance(actor, u) <= actor.skill.range).sort((a, b) => a.hp - b.hp)[0];
    if (target) return { type: "skill", targetUid: target.uid };
  }
  if (actor.energy >= 100 && actor.ultimate.target === "enemy") {
    target = foes.filter((u) => distance(actor, u) <= actor.ultimate.range).sort((a, b) => a.hp - b.hp)[0];
    if (target) return { type: "ultimate", targetUid: target.uid };
  }
  if (!actor.movedThisTurn) {
    const tiles = reachable(actor, state.units).sort((a, b) =>
      Math.min(...foes.map((u) => distance(a, u))) - Math.min(...foes.map((u) => distance(b, u))));
    if (tiles[0]) return { type: "move", x: tiles[0].x, y: tiles[0].y };
  }
  return { type: "wait" };
}

async function run() {
  requireOk(await api("health"), "Healthcheck");
  const username = `qa${Date.now().toString(36).slice(-7)}${Math.random().toString(36).slice(2, 5)}`;
  const created = requireOk(await api("auth/register", null, { username, password: "qa-safe-1529" }), "Registro");
  const token = created.token;
  const initial = requireOk(await api("game/state", token), "Estado inicial");
  assert.equal(initial.chars.length, 4);
  assert.equal(initial.player.gems, 1600);
  assert.equal((await api("admin/data", token)).status, 403, "Un jugador no puede usar admin");
  requireOk(await api("game/daily", token, {}), "Recompensa diaria");
  assert.equal((await api("game/daily", token, {})).status, 409, "Reclamo diario duplicado");
  const summoned = requireOk(await api("summon", token, { bannerKey: "nexus", count: 1 }), "Invocación");
  assert.equal(summoned.results.length, 1);
  const before = requireOk(await api("game/state", token), "Inventario tras invocar");
  assert.equal(before.history.length, 1);

  const started = requireOk(await api("battle/start", token, { missionId: "c1-1", teamIndex: 0 }), "Inicio de misión");
  let state = started.snapshot;
  assert.equal(state.phase, "playing");
  assert.equal((await api("battle/finish", token, { token: started.token, victory: true, turns: 999, survivors: 4 })).status,
    400, "No se aceptan victorias declaradas por el navegador");
  assert.equal((await api("battle/action", token, { token: started.token,
    command: { type: "move", x: 200, y: 200, revision: state.revision } })).status, 400, "Movimiento fuera de cuadrícula");
  const originalRevision = state.revision;
  const firstMove = decide(state);
  assert.equal(firstMove.type, "move");
  const moved = requireOk(await api("battle/action", token, { token: started.token,
    command: { ...firstMove, revision: originalRevision } }), "Movimiento válido");
  state = moved.snapshot;
  assert.equal(state.revision, originalRevision + 1);
  assert.equal((await api("battle/action", token, { token: started.token,
    command: { ...firstMove, revision: originalRevision } })).status, 409, "No se repite una acción");
  const resumed = requireOk(await api("battle/active", token), "Reanudación");
  assert.equal(resumed.snapshot.revision, state.revision);
  assert.equal(resumed.token, started.token);
  assert.equal((await api("battle/start", token, { missionId: "c1-1", teamIndex: 0 })).status,
    409, "No se cobra energía para abrir otra batalla en paralelo");

  let damage = 0, turnCount = 1, finalResult = null;
  while (state.phase === "playing" && turnCount < 100) {
    const intent = decide(state);
    const response = requireOk(await api("battle/action", token, { token: started.token,
      command: { ...intent, revision: state.revision } }), `Turno ${turnCount}`);
    for (const f of response.frames) {
      if (f.event.kind === "damage" && f.state.units.find((u) => u.uid === f.event.targetUid)?.side === "enemy")
        damage += f.event.amount || 0;
    }
    state = response.snapshot;
    if (response.result) finalResult = response.result;
    turnCount++;
  }
  assert.equal(state.phase, "victory", "La misión de inicio debe ser superable con el equipo gratuito");
  assert.equal(finalResult?.victory, true);
  assert.ok(damage > 0, "El motor calcula daño real");
  assert.equal((await api("battle/action", token, { token: started.token,
    command: { type: "wait", revision: state.revision } })).status, 409, "No se cobran premios dos veces");
  const after = requireOk(await api("game/state", token), "Progreso de victoria");
  assert.equal(after.player.wins, 1);
  assert.equal(after.player.gems, before.player.gems + finalResult.rewards.gems);
  assert.equal(after.missions.find((m) => m.id === "c1-1").clears, 1);
  assert.equal(after.activeBattle, null);
  assert.ok(after.missions.find((m) => m.id === "c1-2").unlocked);

  // Un héroe solo puede sobrevivir varios turnos esperando y cargar su definitiva.
  const ryuen = after.chars.find((c) => c.charKey === "ryuen");
  requireOk(await api("game/teams", token, { teams: [
    { name: "Prueba de definitiva", members: [ryuen.id] },
    { name: "B", members: [] }, { name: "C", members: [] },
  ] }), "Formación de prueba");
  const second = requireOk(await api("battle/start", token, { missionId: "c1-1", teamIndex: 0 }), "Segunda batalla");
  state = second.snapshot;
  let ultimates = 0, ultimateDamage = 0;
  for (let i = 0; i < 30 && state.phase === "playing" && !ultimates; i++) {
    const hero = state.units.find((u) => u.side === "ally");
    const foe = hero.energy >= 100 && state.units.find((u) => u.side === "enemy" && u.alive && distance(hero, u) <= hero.ultimate.range);
    const intent = foe ? { type: "ultimate", targetUid: foe.uid } : { type: "wait" };
    const response = requireOk(await api("battle/action", token, { token: second.token,
      command: { ...intent, revision: state.revision } }), "Carga de definitiva");
    ultimates += response.frames.filter((f) => f.event.kind === "ultimate").length;
    ultimateDamage += response.frames.filter((f) => f.event.kind === "damage" &&
      f.state.units.find((u) => u.uid === f.event.targetUid)?.side === "enemy")
      .reduce((total, f) => total + (f.event.amount || 0), 0);
    state = response.snapshot;
  }
  assert.ok(ultimates > 0 && ultimateDamage > 0, "La definitiva debe hacer daño real");
  if (state.phase === "playing") requireOk(await api("battle/retreat", token, { token: second.token }), "Retirada");
  assert.equal((await api("battle/retreat", token, { token: second.token })).status, 409, "Retirada única");
  const logged = requireOk(await api("auth/login", null, { username, password: "qa-safe-1529" }), "Reingreso");
  const persisted = requireOk(await api("game/state", logged.token), "Persistencia tras reingreso");
  assert.equal(persisted.player.wins, state.phase === "victory" ? 2 : 1);
  assert.equal(persisted.history.length, 1);
  console.log(`✓ ${username} · daño: ${damage} · acciones: ${turnCount} · definitiva: ${ultimateDamage} daño · persistencia y seguridad OK`);
}
run().catch((error) => { console.error("FALLO SMOKE:", error); process.exitCode = 1; });
