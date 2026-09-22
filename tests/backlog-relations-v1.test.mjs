import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBacklogText,
  backlogTokens,
  explicitBacklogRefs,
  backlogPairMetrics,
  classifyBacklogPair,
  auditBacklogRelations
} from '../scripts/audit-backlog-relations.mjs';

test('normalization ignores accents, case and common filler', () => {
  assert.equal(normalizeBacklogText('Evolución de SKILLS'), 'evolucion de skills');
  assert.deepEqual(backlogTokens('La evolución de las Skills'), ['evolucion', 'skill']);
});

test('highly similar needs become duplicate candidates without relying on IDs', () => {
  const a = {id: 10, title: 'Versionado de Skills', summary: 'Mantener versiones e historial'};
  const b = {id: 77, title: 'Versiones de Skill', summary: 'Conservar historial y versiones de skills'};
  const relation = classifyBacklogPair(a, b);
  assert.equal(relation.relation, 'DUPLICATE_CANDIDATE');
  assert.ok(relation.score >= 0.68);
  assert.ok(relation.common_terms.includes('skill'));
});

test('related items can be detected below duplicate threshold', () => {
  const a = {id: 20, title: 'Banco de regresión para Skills', summary: 'Casos reutilizables para probar versiones nuevas'};
  const b = {id: 21, title: 'Comparar versiones de Skills', summary: 'Probar versiones contra casos conocidos antes de promoción'};
  const relation = classifyBacklogPair(a, b, {relatedThreshold: 0.20});
  assert.equal(relation.relation, 'RELATED');
  assert.ok(relation.common_terms.length >= 2);
});

test('explicit references survive even when lexical similarity is low', () => {
  const a = {id: 30, title: 'Vista visual', summary: 'Depende de BACKLOG-99 antes de publicar'};
  const b = {id: 99, title: 'Lease fencing', summary: 'Rechazar resultados tardíos'};
  assert.deepEqual(explicitBacklogRefs(a), [99]);
  const relation = classifyBacklogPair(a, b);
  assert.equal(relation.relation, 'EXPLICIT_RELATION');
  assert.equal(relation.explicit_refs.a_to_b, true);
});

test('unrelated items do not create filler relations', () => {
  const a = {id: 1, title: 'Publicar observer', summary: 'Verificar una pagina web'};
  const b = {id: 2, title: 'Rescate de leases', summary: 'Reasignar trabajo vencido'};
  assert.equal(classifyBacklogPair(a, b), null);
});

test('audit is stable, self-free and analysis-only', () => {
  const items = [
    {id: 3, title: 'Versionado de Skills', summary: 'Mantener versiones e historial'},
    {id: 1, title: 'Versiones de Skill', summary: 'Conservar historial y versiones de skills'},
    {id: 2, title: 'Otra cosa', summary: 'Depende de BACKLOG-3'}
  ];
  const report = auditBacklogRelations(items);
  assert.equal(report.schema, 'prometeo.backlog-relation-audit/v1');
  assert.equal(report.authority, 'ANALYSIS_ONLY_NO_AUTO_MERGE_OR_STATUS_CHANGE');
  assert.ok(report.relations.every(x => x.a_id !== x.b_id));
  assert.ok(report.relations.some(x => x.relation === 'DUPLICATE_CANDIDATE'));
  assert.ok(report.relations.some(x => x.relation === 'EXPLICIT_RELATION'));
});

test('pair metrics are deterministic', () => {
  const a = {title: 'Evitar duplicados', summary: 'Detectar similitud y relaciones'};
  const b = {title: 'Detección de duplicados', summary: 'Encontrar similitud y relaciones semánticas'};
  assert.deepEqual(backlogPairMetrics(a, b), backlogPairMetrics(a, b));
});
