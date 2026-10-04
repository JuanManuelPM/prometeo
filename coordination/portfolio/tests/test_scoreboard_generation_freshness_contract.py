#!/usr/bin/env python3
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
SCRIPT = ROOT / 'scripts' / 'build-worker-scoreboard-freshness.mjs'
SHA = '0123456789abcdef0123456789abcdef01234567'


def run(scoreboard, sha=SHA):
    with tempfile.TemporaryDirectory() as td:
        td = pathlib.Path(td)
        src = td / 'scoreboard.json'
        out = td / 'freshness.json'
        src.write_text(json.dumps(scoreboard), encoding='utf-8')
        p = subprocess.run(['node', str(SCRIPT), str(src), str(out), sha, 'refs/heads/main'], capture_output=True, text=True)
        payload = json.loads(out.read_text(encoding='utf-8')) if out.exists() else None
        return p, payload


def main():
    good = {'schema': 'prometeo.worker-scoreboard/v1', 'generated_at': '2026-10-04T16:00:00.000Z'}
    p, payload = run(good)
    assert p.returncode == 0, p.stderr
    assert payload['schema'] == 'prometeo.worker-scoreboard-generation-freshness/v1'
    assert payload['status'] == 'SOURCE_BOUND'
    assert payload['scoreboard_generated_at'] == good['generated_at']
    assert payload['source_sha'] == SHA
    assert payload['source_ref'] == 'refs/heads/main'
    assert payload['producer'] == 'scripts/build-worker-scoreboard.mjs'

    p, payload = run(good, 'not-a-sha')
    assert p.returncode != 0
    assert payload is None

    p, payload = run({'schema': 'prometeo.worker-scoreboard/v1', 'generated_at': 'not-a-date'})
    assert p.returncode != 0
    assert payload is None

    p, payload = run({'schema': 'wrong', 'generated_at': good['generated_at']})
    assert p.returncode != 0
    assert payload is None

    print('PASS scoreboard generation freshness contract')


if __name__ == '__main__':
    main()
