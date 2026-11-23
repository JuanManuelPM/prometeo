#!/usr/bin/env python3
"""One reviewed local action: audit ONLY capabilities, publish redacted report privately.

Does NOT add persistent service, execute remote commands, read messages/contacts
or copy device files. Requires explicit local approval in Prometeo Actions.
"""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

REPO = "JuanManuelPM/pruebas"
RESULT_PATH = "relay/tank-mini-1/capabilities/latest.json"
CODE_URL = ("https://raw.githubusercontent.com/JuanManuelPM/prometeo/"
            "74533e0fcc4c14230a9ecb1ecee612d746fdb112/"
            "tooling/phone-control-lab/probe.py")
CODE_SHA = "79ee83f3509dbf8f775ed0b411f115cbcf4cdc262d16da6457e86da5e45750b1"

def safe_payload(report):
    allowed={"schema","inspection_mode","environment","tools","known_apps",
             "permissions_and_actions","claims"}
    if set(report)!=allowed or report.get("schema")!="prometeo.android-capabilities/v1":
        raise ValueError("Unexpected diagnostic shape")
    if report.get("inspection_mode")!="READ_ONLY_NO_PERSONAL_DATA":
        raise ValueError("Content-collecting probe refused")
    data=json.dumps(report,ensure_ascii=False,sort_keys=True)
    if len(data)>16000:
        raise ValueError("Report too large")
    return data + "\n"

def github_api(args, input_data=None):
    p=subprocess.run(["gh","api",*args],input=input_data,text=True,
                     capture_output=True,timeout=25,check=False)
    if p.returncode:
        raise RuntimeError("GitHub API request failed (no credentials exposed)")
    try:
        return json.loads(p.stdout)
    except ValueError:
        raise RuntimeError("GitHub returned unreadable response")

def publish(report):
    info=github_api([f"repos/{REPO}"])
    if info.get("private") is not True or info.get("permissions",{}).get("push") is not True:
        raise RuntimeError("Private GitHub repository with write permission required")
    sha=None
    try:
        old=github_api([f"repos/{REPO}/contents/{RESULT_PATH}"])
        sha=old.get("sha")
    except RuntimeError:
        # On a missing path the next PUT can create a new file; on other errors
        # the PUT is still scoped and fails closed without overwriting.
        pass
    report_bytes=safe_payload(report).encode("utf-8")
    payload={"message":"Prometeo Tank: redacted device capabilities (read-only)",
             "branch":"main", "content":base64.b64encode(report_bytes).decode("ascii")}
    if sha: payload["sha"]=sha
    created=github_api(["-X","PUT",f"repos/{REPO}/contents/{RESULT_PATH}",
                        "--input","-"],json.dumps(payload))
    if not created.get("content",{}).get("sha"):
        raise RuntimeError("Missing GitHub commit confirmation")
    return RESULT_PATH

def main():
    if os.environ.get("PREFIX")!="/data/data/com.termux/files/usr":
        raise RuntimeError("Only the real Android Termux environment is supported")
    with urllib.request.urlopen(CODE_URL,timeout=25) as response:
        code=response.read(12_000)
    if hashlib.sha256(code).hexdigest()!=CODE_SHA:
        raise RuntimeError("Code integrity mismatch. Nothing executed.")
    filename=Path.home()/".local/share/prometeo/updates/capability-probe.py"
    filename.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    filename.write_bytes(code)
    filename.chmod(0o600)
    spec=importlib.util.spec_from_file_location("prometeo_phone_probe",filename)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result=module.audit()
    safe_payload(result)
    path=publish(result)
    print("CAPABILITIES_REPORTED_PRIVATE",path)
    print("No messages, notifications, contacts, screen data or credentials were captured")

if __name__=="__main__":
    try: main()
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as exc:
        print("CAPABILITIES_NOT_PUBLISHED",str(exc),file=sys.stderr)
        sys.exit(1)
