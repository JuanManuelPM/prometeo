#!/usr/bin/env python3
import argparse
import datetime
import json
import os
import pathlib
import re
import sys
import urllib.request

ENDPOINT = 'https://worker-lab.vercel.app/api/prometeo-ingress'
ORIGIN = 'https://juanmanuelpm.github.io'
PROJECT_ROOT = 'coordination/portfolio/derived/prometeo-autonomous-growth'
SCHEMA = 'prometeo.primary-chat-public-canary-submit/v1'
RESULT_SCHEMA = 'prometeo.ingress-transport-result/v1'


def safe_request_id(raw: str) -> str:
    value = re.sub(r'[^a-z0-9-]+', '-', raw.strip().lower())
    value = re.sub(r'-+', '-', value).strip('-')
    if not value or len(value) > 120:
        raise ValueError('REQUEST_ID_INVALID')
    return value


def build_payload(request_id: str) -> dict:
    created_at = datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
    text = f'CANARY: ingress regression {request_id}; public sanitized test only.'
    return {
        'schema': SCHEMA,
        'public_canary': True,
        'public_envelope': {
            'schema': 'prometeo.browser-ingress-request/v1',
            'request_id': request_id,
            'created_at': created_at,
            'kind': 'CHAT_CANARY_HUMAN_MESSAGE_V1',
            'page': {
                'page_id': 'control-v11-chat-canary',
                'title': 'Prometeo · Primary Chat canary regression',
                'href': 'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/chat-canary/',
                'surface_id': 'current-tree-control-v11-chat-canary',
                'project_id': 'prometeo-autonomous-growth',
            },
            'privacy': {
                'raw_text_public': False,
                'credentials_public': False,
                'public_payload_class': 'EXPLICIT_PUBLIC_CANARY_FALLBACK_AUTHORIZED',
                'explicit_public_canary_fallback_allowed': True,
                'explicit_public_canary_may_publish_raw_text': True,
            },
        },
        'private_payload': {'text': text},
    }


def expected_ref(request_id: str) -> str:
    return f'{PROJECT_ROOT}/portfolio-primary-chat-canary-{request_id}.json'


def validate_response(status: int, body: dict, request_id: str) -> dict:
    expected = expected_ref(request_id)
    checks = {
        'http_200': status == 200,
        'result_schema': body.get('schema') == RESULT_SCHEMA,
        'queued_true': body.get('queued') is True,
        'durable_ref_exact': body.get('ref') == expected,
        'privacy_public_sanitized': body.get('privacy') == 'PUBLIC_SANITIZED_CANARY',
        'status_allowed': body.get('status') == 'QUEUED_PUBLIC_CANARY_FALLBACK',
    }
    if not all(checks.values()):
        raise RuntimeError('CANARY_VALIDATION_FAILED ' + json.dumps(checks, sort_keys=True))
    return {
        'schema': 'prometeo.ingress-canary-regression-result/v1',
        'verified_at': datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
        'request_id': request_id,
        'endpoint': ENDPOINT,
        'http_status': status,
        'result_schema': body.get('schema'),
        'result_status': body.get('status'),
        'queued': body.get('queued'),
        'ref': body.get('ref'),
        'privacy': body.get('privacy'),
        'projection': body.get('projection'),
        'checks': checks,
        'truth_boundary': 'Canary enqueue verification only; does not prove worker claim/completion or grant Current/Human Accepted/Served authority.',
    }


def run(request_id: str, output: pathlib.Path, dry_run: bool) -> dict:
    payload = build_payload(request_id)
    if dry_run:
        result = {
            'schema': 'prometeo.ingress-canary-regression-dry-run/v1',
            'request_id': request_id,
            'expected_ref': expected_ref(request_id),
            'endpoint': ENDPOINT,
            'origin': ORIGIN,
            'public_canary': payload['public_canary'],
            'kind': payload['public_envelope']['kind'],
            'privacy_class': payload['public_envelope']['privacy']['public_payload_class'],
        }
    else:
        request = urllib.request.Request(
            ENDPOINT,
            data=json.dumps(payload, separators=(',', ':')).encode('utf-8'),
            method='POST',
            headers={
                'Content-Type': 'application/json',
                'Origin': ORIGIN,
                'User-Agent': 'prometeo-primary-chat-ingress-canary-regression-v1',
            },
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            status = response.status
            body = json.loads(response.read().decode('utf-8'))
        result = validate_response(status, body, request_id)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps(result, sort_keys=True))
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--request-id', default=os.environ.get('REQUEST_ID', ''))
    parser.add_argument('--output', default='ingress-canary-regression-result.json')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    try:
        request_id = safe_request_id(args.request_id)
        run(request_id, pathlib.Path(args.output), args.dry_run)
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
