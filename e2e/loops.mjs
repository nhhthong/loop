/**
 * Per-loop scenarios + the real pass between loops. Each loop scenario walks the player's route through the house
 * (R1 → R2 → hall → door 9) with the simulation running, so that loop's triggers and sequences fire exactly as in play.
 * Add loop N here as `N: async (t) => { ... }` ending at door 9; `pass(t, N)` then takes the stairwell into loop N+1.
 */
const R = Math.PI;
const EAST = -R / 2, NORTH = 0;

/** walk the house route; `at(name)` lets a loop hook checks at named points */
async function route(t, at = async () => {}) {
  await t.teleport(0, 1.2, NORTH); await t.advance(0.5); await at('R1');
  await t.teleport(0, -4.4, NORTH); await t.advance(0.5);
  await t.teleport(1.2, -4.5, EAST); await t.advance(5); await at('R2'); // 5 s: lets a bathroom scene play out
  await t.teleport(2.7, -4.5, EAST); await t.advance(1); await at('pastBath');
  await t.teleport(6, -4.5, EAST); await t.advance(0.5);
  await t.teleport(9.3, -4.5, EAST); await t.advance(0.5); await at('door9');
}

/** one real pass: door 9 → stairwell → stair-bottom door → portal → basement doorway → next loop */
export async function pass(t, n) {
  const before = (await t.state()).loop;
  await t.aim('store'); await t.press('KeyE'); await t.advance(1.5);
  let s = await t.state(); t.check(`pass ${n}: door 9 opens`, s.store.open);
  await t.teleport(11.4, -4.5, EAST, -0.2); await t.advance(1);
  s = await t.state(); t.check(`pass ${n}: door 9 shuts + locks behind on the stair`, !s.store.open && s.store.locked);
  await t.teleport(14.95, -4.5, EAST, -2.04); await t.advance(0.5); await t.aim('stairBottom');
  s = await t.state(); t.check(`pass ${n}: stair-bottom door closed, E prompt, portal off`, !s.bottom && s.prompt && !s.portal, JSON.stringify({ bottom: s.bottom, prompt: s.prompt, portal: s.portal }));
  await t.press('KeyE'); await t.advance(1.5);
  s = await t.state(); t.check(`pass ${n}: stair-bottom + basement doors open, portal on`, s.bottom && s.basement.open && s.portal);
  await t.shot(`pass${n}_portal`);
  await t.teleport(15.72, -4.5, EAST, -2.04); // the next step crosses the portal plane (real PortalSystem code)
  const q = await t.pos();
  s = await t.state();
  t.check(`pass ${n}: crossed to the basement doorway`, q.z < 3.2 && Math.abs(q.x) < 0.6 && Math.abs(q.y) < 0.1 && !s.bottom, JSON.stringify(q));
  await t.teleport(0, 1.2, NORTH); await t.advance(0.5);
  s = await t.state(); t.check(`pass ${n}: basement door shuts + locks → loop ${before + 1}`, s.loop === before + 1 && !s.basement.open && s.basement.locked);
}

export const LOOPS = {
  1: async (t, q) => {
    const st = t.stageAtReady;
    t.check('staged loading: basement door locked until stage 2, then unlocked', (st.loaded || st.basementLocked) && !(await t.state()).basement.locked, JSON.stringify(st));
    let s = await t.state(); t.check('loop 1: radio present & silent', s.loop === 1 && !s.radioPlaying);
    for (const [name, x, z, yaw, y, axis] of [['stairwell', 12.5, -4.5, EAST, -0.6, 'x'], ['house stair', 4.0, -2.2, NORTH, 1.2, 'z']]) {
      await t.view(x, z, yaw, 0, y); await t.advance(0.6);
      const a = await t.pos(); await t.advance(2); const c = await t.pos();
      t.check(`no sliding on the ${name}`, Math.abs(c[axis] - a[axis]) < 0.03 && Math.abs(c.y - a.y) < 0.03, `d${axis}=${(c[axis] - a[axis]).toFixed(3)}`);
    }
    if (q === 'mobile') {
      const lit = (x0, x1, y0) => t.eval(([x0, x1, y0]) => { let ok = false; game.scene.traverse((o) => { if (o.isPointLight && o.intensity > 1 && o.position.x > x0 && o.position.x < x1 && o.position.y > y0) ok = true; }); return ok; }, [x0, x1, y0]);
      await t.view(1.5, -4.5, EAST); await t.advance(1);
      t.check('mobile: door-9 bulb lit by the pool from R2', await lit(8.8, 9.6, 2.0));
      await t.view(14.0, -4.5, EAST, 0, -2.04); await t.advance(1);
      t.check('mobile: stair bulb lit by the pool', await lit(11, 14, -1));
    }
    if (q === 'low') { // shadow cache (LightingSystem): idle = no re-render; a door swinging (rotation only) near the shadow light = re-render
      await t.view(8.5, -4.5, EAST); await t.advance(1.5);
      const r = await t.eval(() => {
        const L = game.scene.children.find((o) => o.isPointLight && o.castShadow);
        L.shadow.needsUpdate = false; game.debugAdvance(0.5); const idle = L.shadow.needsUpdate;
        L.shadow.needsUpdate = false; game.doors.store.open(); game.debugAdvance(0.5); return { idle, moving: L.shadow.needsUpdate };
      });
      t.check('shadow cache: idle scene does not re-render, a swinging door does', !r.idle && r.moving, JSON.stringify(r));
      await t.eval(() => { game.doors.store.close(); game.debugAdvance(3); });
    }
    await t.view(0, 1.2, NORTH);
    await route(t, async (p) => {
      if (p === 'R2') { const s = await t.state(); t.check('loop 1: no bathroom scene', s.control === 1 && !s.bath.locked); }
      if (p === 'R1') await t.shot('loop1_R1');
    });
  },
  2: async (t) => {
    let s = await t.state(); t.check('loop 2: radio crackling, door 9 unlocked again', s.radioPlaying && !s.store.locked);
    await route(t, async (p) => {
      if (p === 'R2') { s = await t.state(); t.check('loop 2: bathroom scene played → door shut + locked, control back', s.bath.locked && Math.abs(s.bath.rot) < 0.02 && s.control === 1); }
    });
  },
  3: async (t) => {
    await t.advance(1.5);
    let s = await t.state();
    t.check('loop 3: radio silent, bathroom locked, door 9 wide open', !s.radioPlaying && s.bath.locked && s.store.open);
    const lamps = await t.eval(() => ({ broken: game.furn.lamps.filter((l) => l.driver && l.tag === 'lamp').length, east: !!game.furn.lamps.find((l) => l.id === 'eastBulb').driver }));
    t.check('loop 3: house lamps failing, door-9 bulb spared', lamps.broken >= 9 && !lamps.east, JSON.stringify(lamps));
    const outs = await t.sampleMax(3, "game.furn.lamps.filter((l) => l.driver && l.driver() < 0.1).length", 0.05);
    t.check('loop 3: lamps black out', outs >= 1, `max lamps out at once: ${outs}`);
    await route(t, async (p) => {
      if (p === 'R2') { s = await t.state(); t.check('loop 3: before the bathroom door, door 9 still open', s.store.open); await t.shot('loop3_hall_open'); }
      if (p === 'pastBath') { s = await t.state(); t.check('loop 3: past the bathroom door, door 9 slammed + locked', !s.store.open && s.store.locked); }
    });
    await t.aim('store'); await t.press('KeyE'); await t.advance(1);
    s = await t.state(); t.check('loop 3: E does not open door 9', !s.store.open && s.store.locked);
    await t.teleport(6, -4.6, R / 2);
    const rattle = await t.sampleMax(4, 'Math.abs(game.doors.bath.handle.rotation.z)', 0.05);
    const knocksFar = await t.eval(() => game.knockScene.knocks);
    t.check('loop 3: bathroom handle rattles while far, no knocks', rattle > 0.1 && knocksFar === 0, `rattle=${rattle.toFixed(2)}`);
    await t.teleport(1.9, -4.6, R); await t.advance(5);
    const k = await t.eval(() => ({ knocks: game.knockScene.knocks, phase: game.knockScene.phase }));
    t.check('loop 3: close → exactly five knocks, then silence', k.knocks === 5 && k.phase === 'done', JSON.stringify(k));
    await t.shot('loop3_bath');
  },
};
export const LAST_LOOP = Math.max(...Object.keys(LOOPS).map(Number));
