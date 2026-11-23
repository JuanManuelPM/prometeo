#!/usr/bin/env python3
"""Prometeo Tank Mini 1: privacy-preserving, READ-ONLY capability audit.

Reports feature availability, never notifications, contact details, messages,
screen contents, clipboard contents, account identifiers, tokens or locations.
No remote shell. No external network. No state changes.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

SCHEMA = "prometeo.android-capabilities/v1"
# Only ask Android whether these *known* apps are present, not for any user data.
APPS = {
    "whatsapp": "com.whatsapp",
    "youtube": "com.google.android.youtube",
    "pinterest": "com.pinterest",
    "github_mobile": "com.github.android",
}
COMMANDS = {
    "notifications_plugin": "termux-notification-list",
    "notification_create": "termux-notification",
    "battery": "termux-battery-status",
    "media_local": "termux-media-player",
    "microphone_record": "termux-microphone-record",
    "camera_photo": "termux-camera-photo",
    "sms_send": "termux-sms-send",
    "clipboard": "termux-clipboard-get",
    "android_intents": "am",
    "adb_client": "adb",
    "gh_client": "gh",
    "python": "python",
    "node": "node",
}
POLICY = {
    "read_private_messages": "REQUIRES_OFFICIAL_PROVIDER_OR_EXPLICIT_APP_PERMISSION",
    "send_whatsapp_message": "REQUIRES_SUPPORTED_PROVIDER_OR_ON_DEVICE_USER_APPROVAL",
    "android_screen_read": "REQUIRES_MEDIA_PROJECTION_OR_ACCESSIBILITY_CONSENT",
    "tap_other_apps": "REQUIRES_ACCESSIBILITY_SERVICE_OR_APPROVED_ADB_CAPABILITY",
    "global_media_control": "REQUIRES_ANDROID_MEDIA_SESSION_ACCESS",
    "read_notifications": "REQUIRES_NOTIFICATION_LISTENER_CONSENT",
    "send_sms": "REQUIRES_ANDROID_PERMISSION_AND_PER_ACTION_APPROVAL",
    "read_clipboard": "FOREGROUND_OS_RESTRICTIONS_APPLY",
    "perform_payments": "NOT_SUPPORTED_AUTONOMOUSLY",
    "chatgpt_work_autostart": "NOT_ATTESTED",
    "root_access": "NOT_REQUESTED",
}
def run_readonly(argv, timeout=3):
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, check=False)
        return p.returncode, p.stdout[:256]
    except (OSError, subprocess.TimeoutExpired):
        return None, ""

def app_presence(package, runner=run_readonly):
    # A negative result may indicate Android package-visibility restrictions.
    rc, out = runner(["pm", "path", package])
    return "PRESENT" if rc == 0 and out.lstrip().startswith("package:") else "UNVERIFIED"

def audit(which=shutil.which, runner=run_readonly, environ=None):
    env = os.environ if environ is None else environ
    termux = env.get("PREFIX") == "/data/data/com.termux/files/usr"
    tools = {k: ("COMMAND_FOUND_NOT_PERMISSION_VERIFIED" if which(v) else "COMMAND_MISSING")
             for k, v in COMMANDS.items()}
    apps = {name: app_presence(package, runner) for name, package in APPS.items()} if termux else {
        name: "NOT_TESTED_OUTSIDE_ANDROID" for name in APPS
    }
    return {
        "schema": SCHEMA,
        "inspection_mode": "READ_ONLY_NO_PERSONAL_DATA",
        "environment": {"termux_detected": termux, "local_server_status": "NOT_CHECKED",
                        "cloud_status": "NOT_CHECKED"},
        "tools": tools,
        "known_apps": apps,
        "permissions_and_actions": POLICY.copy(),
        "claims": {
            "installed_cli_is_not_android_permission": True,
            "package_not_found_is_not_proof_of_absence": True,
            "no_notification_content_read": True,
            "no_messages_read": True,
            "no_location_access": True,
            "no_network_access": True,
            "no_external_commands_received": True,
            "no_device_state_changed": True
        },
    }

def main():
    parser=argparse.ArgumentParser(description="Read-only feature inventory (no private content)")
    parser.add_argument("--json", action="store_true")
    args=parser.parse_args()
    result=audit()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
