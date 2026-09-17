import assert from 'node:assert/strict';
import {buildAliasIndex,loadSurfaceRegistry,normalizeAlias,REQUIRED_SURFACE_IDS,resolveSurface,validateSurfaceRegistry} from '../scripts/validate-surface-registry.mjs';

const registry=loadSurfaceRegistry();
const baseline=validateSurfaceRegistry(registry);
assert.equal(baseline.ok,true,JSON.stringify(baseline.errors));
assert.equal(baseline.summary.surface_count,4);
assert.equal(baseline.summary.unresolved_routes,4);
assert.equal(baseline.summary.known_routes,0);
assert.deepEqual(new Set(registry.surfaces.map(s=>s.surface_id)),new Set(REQUIRED_SURFACE_IDS));
assert.equal(registry.status,'CANDIDATE');
assert.equal(registry.authority.promotion_authority,'NONE');

for(const surface of registry.surfaces){
  assert.equal(surface.public_route.state,'UNRESOLVED');
  assert.equal(surface.public_route.url,null,'unknown routes must not be guessed');
  assert.equal(surface.public_route.page_id,null,'unknown page ids must not be guessed');
  assert.ok(surface.public_route.evidence_refs.length>0);
  assert.equal(surface.privacy_authority.surface_authority,'CANDIDATE_ONLY_NO_PROMOTION');
  assert.ok(surface.local_planner.opportunity_id.startsWith('O-SURFACE-'));
  assert.equal(surface.local_steward.builder_opportunity_id,'O-SWARM-LOCAL-STEWARD-BUILD-V1');
  assert.equal(surface.change_thread.bridge_opportunity_id,'O-SWARM-PAGE-THREAD-BRIDGE-V1');
}

assert.equal(normalizeAlias('  PÁGINA   DOCENTE '),'pagina docente');
assert.equal(resolveSurface(registry,'Plan de Accion').surface_id,'control-plan');
assert.equal(resolveSurface(registry,'PROMETEO MOVIL').surface_id,'prometeo-mobile');
assert.equal(resolveSurface(registry,'Study Library').surface_id,'facultad-digital');
assert.equal(resolveSurface(registry,'Página Docente').surface_id,'alumnos-teacher');
assert.equal(resolveSurface(registry,'surface that does not exist'),null);
assert.ok(buildAliasIndex(registry).size>=REQUIRED_SURFACE_IDS.length);

const clone=()=>structuredClone(registry);
let bad=clone();
bad.status='HUMAN_ACCEPTED';
assert.ok(validateSurfaceRegistry(bad).errors.some(e=>e.code==='AUTHORITY_PROMOTION'));

bad=clone();
bad.surfaces[0].privacy_authority.surface_authority='SERVED';
assert.ok(validateSurfaceRegistry(bad).errors.some(e=>e.code==='SURFACE_AUTHORITY'));

bad=clone();
bad.surfaces[0].public_route.url='https://example.invalid/guessed';
assert.ok(validateSurfaceRegistry(bad).errors.some(e=>e.code==='GUESSED_ROUTE'));

bad=clone();
bad.surfaces[0].public_route.page_id='guessed-page';
assert.ok(validateSurfaceRegistry(bad).errors.some(e=>e.code==='GUESSED_PAGE_ID'));

bad=clone();
bad.surfaces[0].public_route={state:'KNOWN',url:'https://example.invalid/exact',page_id:'control-plan',evidence_refs:[],reason:'test'};
assert.ok(validateSurfaceRegistry(bad).errors.some(e=>e.code==='KNOWN_ROUTE_EVIDENCE'));

const known=clone();
known.surfaces[0].public_route={state:'KNOWN',url:'https://example.invalid/exact',page_id:'control-plan',evidence_refs:['authority:test'],reason:'exact evidence test'};
assert.equal(validateSurfaceRegistry(known).ok,true,'KNOWN is permitted only with exact https route + evidence');

bad=clone();
bad.surfaces[1].aliases.push('plan de accion');
assert.ok(validateSurfaceRegistry(bad).errors.some(e=>e.code==='CROSS_SURFACE_ALIAS_COLLISION'));

bad=clone();
bad.surfaces.push(structuredClone(bad.surfaces[0]));
assert.ok(validateSurfaceRegistry(bad).errors.some(e=>e.code==='DUPLICATE_SURFACE_ID'));

bad=clone();
delete bad.surfaces[2].local_planner.opportunity_id;
assert.ok(validateSurfaceRegistry(bad).errors.some(e=>e.code==='LOCAL_PLANNER_POINTER'));

console.log(JSON.stringify({ok:true,schema:registry.schema,surfaces:baseline.summary.surface_count,known_routes:baseline.summary.known_routes,unresolved_routes:baseline.summary.unresolved_routes,warnings:baseline.warnings.map(w=>w.code)},null,2));
