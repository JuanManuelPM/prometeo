import assert from 'node:assert/strict';
import {
  adaptBlackboardItem,
  blackboardCalendarEventToDerivedEvent,
  deriveScheduleCandidates,
  markScheduleConflicts
} from '../shared/study-ingestion/blackboard-canonical-adapter-v1.mjs';

const captured = '2026-09-19T15:00:00.000Z';
const item = {
  item_key: 'synthetic-item-1',
  course_key: 'synthetic-course-1',
  item_type: 'page',
  title: 'Cronograma de práctica',
  body_text: 'Primer parcial — 23/09/2026\nRecuperatorio — 18/11/2026',
  href: 'https://palermo.blackboard.com/synthetic-visible-page',
  source_page: 'https://palermo.blackboard.com/synthetic-visible-page',
  last_seen_at: captured,
  raw: {synthetic: true, dom_kind: 'rendered'}
};

const adapted = adaptBlackboardItem(item, {course_id: 'synthetic-course', captured_at: captured, bridge_version: '0.5.0'});
assert.equal(adapted.source_record.source_id, 'bb:item:synthetic-item-1');
assert.equal(adapted.source_record.provider_course_id, 'synthetic-course-1');
assert.equal(adapted.source_record.course_id, 'synthetic-course');
assert.equal(adapted.source_record.body_text, item.body_text);
assert.deepEqual(adapted.source_record.raw_metadata, item.raw);
assert.equal(adapted.document.document_id, 'doc:bb:item:synthetic-item-1');
assert.equal(adapted.document.canonical_status, 'source-text');
assert.equal(adapted.document.raw_metadata.synthetic, true);
assert.equal(Object.hasOwn(adapted.document.raw_metadata, 'body_text'), false, 'derived/raw metadata must not absorb source text');
assert.equal(adapted.text_version.text_kind, 'source_text');
assert.equal(adapted.extraction_request, null, 'rendered page text does not need a binary parser');

const file = adaptBlackboardItem({
  item_key: 'synthetic-file-1', course_key: 'synthetic-course-1', item_type: 'file',
  title: 'Programa.pdf', file_name: 'Programa.pdf', href: 'https://palermo.blackboard.com/synthetic-file'
}, {
  course_id: 'synthetic-course', captured_at: captured,
  mirrored_file: {storage_path: 'synthetic/course/file.pdf', mime_type: 'application/pdf', sha256: 'abc123', size_bytes: 1234}
});
assert.equal(file.document.canonical_status, 'binary-ready');
assert.equal(file.extraction_request.provider, 'blackboard');
assert.equal(file.extraction_request.parser_profile, 'document-default', 'parser choice must not be Blackboard-specific');
assert.match(file.extraction_request.input_ref, /^storage:study-blackboard-files\//);

const candidates = deriveScheduleCandidates(item.body_text, {
  source_id: adapted.source_record.source_id,
  document_id: adapted.document.document_id,
  course_id: 'synthetic-course',
  provider: 'blackboard'
});
assert.equal(candidates.length, 2);
assert.equal(candidates[0].event_type, 'exam');
assert.equal(candidates[1].event_type, 'makeup_exam');
assert.equal(candidates[0].starts_at, '2026-09-23T00:00:00.000Z');
assert.equal(candidates[0].source_locator.line, 1);
assert.equal(deriveScheduleCandidates('Parcial: fecha a confirmar', {
  source_id: 'bb:item:no-date', course_id: 'synthetic-course', provider: 'blackboard'
}).length, 0, 'missing dates must never be invented');

const calendar = blackboardCalendarEventToDerivedEvent({
  uid: 'synthetic-calendar-1', title: 'Entrega TP', starts_at: '2026-10-01T12:00:00Z', all_day: false
}, {course_id: 'synthetic-course'});
assert.equal(calendar.event_type, 'assignment_due');
assert.equal(calendar.extraction_confidence, 'direct-source-date');

const conflict = markScheduleConflicts([
  {...candidates[0], source_id: 'bb:item:syllabus', title: 'Primer parcial'},
  {...candidates[0], source_id: 'bb:calendar:exam', title: 'Primer parcial', starts_at: '2026-09-24T00:00:00.000Z'}
]);
assert.equal(conflict.length, 2);
assert.equal(conflict[0].extraction_status, 'conflict');
assert.equal(conflict[1].extraction_status, 'conflict');
assert.equal(conflict[0].conflict_group_id, conflict[1].conflict_group_id);
assert.notEqual(conflict[0].starts_at, conflict[1].starts_at, 'conflicts preserve both source dates');

console.log('study-blackboard-canonical-ingestion-v1: PASS');
