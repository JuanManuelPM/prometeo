import importlib.util
import json
from pathlib import Path
import unittest

f=Path(__file__).with_name("probe.py")
spec=importlib.util.spec_from_file_location("phone_probe",f)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CapabilityAuditTests(unittest.TestCase):
    def test_non_android_is_honestly_unverified(self):
        x=module.audit(which=lambda name:None, environ={})
        self.assertFalse(x["environment"]["termux_detected"])
        self.assertEqual(x["known_apps"]["whatsapp"],"NOT_TESTED_OUTSIDE_ANDROID")
        self.assertEqual(x["tools"]["gh_client"],"COMMAND_MISSING")
    def test_commands_are_only_presence_not_permission(self):
        x=module.audit(which=lambda name:"/usr/bin/"+name, environ={})
        self.assertEqual(x["tools"]["notifications_plugin"],"COMMAND_FOUND_NOT_PERMISSION_VERIFIED")
        self.assertEqual(x["permissions_and_actions"]["read_notifications"],"REQUIRES_NOTIFICATION_LISTENER_CONSENT")
    def test_android_app_probe_has_allowlist(self):
        calls=[]
        def runner(argv):
            calls.append(argv)
            return (0,"package:/data/app/base.apk") if argv[-1]=="com.whatsapp" else (1,"")
        x=module.audit(which=lambda v:None,runner=runner,environ={"PREFIX":"/data/data/com.termux/files/usr"})
        self.assertEqual(x["known_apps"]["whatsapp"],"PRESENT")
        self.assertEqual(x["known_apps"]["youtube"],"UNVERIFIED")
        self.assertEqual(len(calls),len(module.APPS))
        self.assertTrue(all(a[:2]==["pm","path"] for a in calls))
    def test_negative_app_result_is_not_absence(self):
        self.assertEqual(module.app_presence("com.whatsapp",runner=lambda argv:(1,"SecurityException")),"UNVERIFIED")
    def test_do_not_store_private_content(self):
        private="private@email.test SECRET_PERSONAL_MESSAGE 3425-token"
        result=module.audit(which=lambda name:None, runner=lambda argv:(1,private),
                            environ={"PREFIX":"/data/data/com.termux/files/usr","GH_TOKEN":private})
        dumped=json.dumps(result)
        self.assertNotIn(private,dumped)
        self.assertNotIn("GH_TOKEN",dumped)
        self.assertNotIn("SECRET_PERSONAL",dumped)
    def test_no_write_or_privileged_actions(self):
        x=module.audit(which=lambda name:None,environ={})
        self.assertTrue(x["claims"]["no_device_state_changed"])
        self.assertTrue(x["claims"]["no_external_commands_received"])
        self.assertEqual(x["permissions_and_actions"]["perform_payments"],"NOT_SUPPORTED_AUTONOMOUSLY")
    def test_schema_and_no_provider_claim(self):
        x=module.audit(which=lambda name:None,environ={})
        self.assertEqual(x["schema"],"prometeo.android-capabilities/v1")
        self.assertEqual(x["environment"]["cloud_status"],"NOT_CHECKED")
        self.assertEqual(x["permissions_and_actions"]["chatgpt_work_autostart"],"NOT_ATTESTED")

if __name__=="__main__":
    unittest.main()
