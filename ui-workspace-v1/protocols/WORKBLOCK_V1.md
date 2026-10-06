# WORKBLOCK_V1

Unidad autosuficiente de trabajo para workers fungibles.

Campos mínimos:
- block_id
- objective
- base_hash/base_version
- inputs
- read_scope
- write_scope
- do_not_touch
- dependencies
- expected_output
- tests
- return_contract

Objetivo económico:
`claim -> 1 fetch -> trabajo local -> 1 return`.

La inteligencia puede ser abundante; I/O, coordinación y conflictos son recursos a minimizar.
