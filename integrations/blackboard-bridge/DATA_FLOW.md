# Blackboard / Drive -> Reader data flow

```text
Drive provider ----------------------┐
                                    ├-> SOURCE RECORD / SOURCE ARTIFACT
Blackboard authenticated bridge -----┘        |
                                             v
                                  shared MIME extractor
                          PDF / DOCX / PPTX / HTML / text
                                             |
                                             v
                         prometeo.canonical-document/v1
                                             |
                                  canonical-to-reader.mjs
                                             v
                            prometeo.reader-payload/v1
                                             |
                                  projectTtsChunks()
                                             v
                           prometeo.tts-chunk-set/v1
                                             |
                             existing TTS backend/cache
```

Provider identity and provenance stop before the Reader. Provider observations with identical bytes share the same `source_version_id`; provenance remains distinct.

Blackboard rendered pages can provide captured source text directly. Blackboard binary files enter the same `document-default` file path as Drive files only after a private byte reference exists.

## Derived academic events

Blackboard calendar, syllabus/cronograma, announcements and assignments remain source-preserving inputs. Explicit dates may create `prometeo.study-derived-event/v1` rows. Competing dates from different source IDs receive a shared `conflict_group_id` and status `conflict`; ingestion never silently chooses a winner.
