#!/usr/bin/env bash
# CI-only runner. Device data and screenshots must remain synthetic.
set -euo pipefail
cd "$(dirname "$0")/.."
lqadwa_sdk="${ANDROID_HOME:?Android SDK is required}"
lqadwa_reports="${LQADWA_ANDROID_REPORT_DIR:-$PWD/.cloudflare/android-instrumentation}"
lqadwa_boot_limit="${LQADWA_ANDROID_BOOT_SECONDS:-240}"
if ! [[ "$lqadwa_boot_limit" =~ ^[0-9]+$ ]] || ((lqadwa_boot_limit<1 || lqadwa_boot_limit>240)); then
  printf 'Boot timeout must be between 1 and 240 seconds.\n' >&2; exit 1
fi
mkdir -p "$lqadwa_reports"
lqadwa_serial=emulator-5554
lqadwa_emulator_pid=""
cleanup(){
  lqadwa_status=$?
  trap - EXIT
  if [[ -n "$lqadwa_emulator_pid" ]]; then
    timeout 10s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" logcat -d -v time > "$lqadwa_reports/logcat.log" 2>&1 || true
    timeout 10s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" emu kill >/dev/null 2>&1 || true
    kill "$lqadwa_emulator_pid" 2>/dev/null || true
  fi
  for lqadwa_log in emulator.log instrumentation.log; do
    if [[ -f "$lqadwa_reports/$lqadwa_log" ]]; then tail -n 100 "$lqadwa_reports/$lqadwa_log"; fi
  done
  exit "$lqadwa_status"
}
trap cleanup EXIT
test -x "$lqadwa_sdk/emulator/emulator"
test -x "$lqadwa_sdk/platform-tools/adb"
timeout 15s "$lqadwa_sdk/emulator/emulator" -version > "$lqadwa_reports/environment.txt" 2>&1
timeout 15s "$lqadwa_sdk/emulator/emulator" -accel-check >> "$lqadwa_reports/environment.txt" 2>&1
timeout 15s "$lqadwa_sdk/platform-tools/adb" start-server
"$lqadwa_sdk/emulator/emulator" -avd lqadwa-ci -port 5554 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > "$lqadwa_reports/emulator.log" 2>&1 &
lqadwa_emulator_pid=$!
lqadwa_deadline=$((SECONDS+lqadwa_boot_limit))
lqadwa_ready=false
while ((SECONDS<lqadwa_deadline)); do
  if ! kill -0 "$lqadwa_emulator_pid" 2>/dev/null; then
    printf 'Emulator exited before connecting to adb. See emulator.log.\n' >&2
    exit 1
  fi
  if [[ "$(timeout 5s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" get-state 2>/dev/null || true)" == device ]] &&
     [[ "$(timeout 5s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)" == 1 ]]; then
    lqadwa_ready=true; break
  fi
  sleep 2
done
if [[ "$lqadwa_ready" != true ]]; then
  if ! kill -0 "$lqadwa_emulator_pid" 2>/dev/null; then printf 'Emulator exited before connecting to adb. See emulator.log.\n' >&2;
  else printf 'Emulator did not complete boot within %s seconds.\n' "$lqadwa_boot_limit" >&2; fi
  exit 1
fi
timeout 10s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" shell getprop > "$lqadwa_reports/device.txt"
timeout 10s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" shell input keyevent 82
timeout 90s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" install -r android/app/build/outputs/apk/debug/app-x86_64-debug.apk
timeout 90s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" install -r android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
timeout 180s "$lqadwa_sdk/platform-tools/adb" -s "$lqadwa_serial" shell am instrument -r -w dz.lqidwa.pilot.design.test/dz.lqidwa.pilot.NativeDesignTest > "$lqadwa_reports/instrumentation.log" 2>&1
grep -q 'PASS: native screens' "$lqadwa_reports/instrumentation.log"
grep -q 'INSTRUMENTATION_CODE: -1' "$lqadwa_reports/instrumentation.log"
if grep -q 'FAIL:' "$lqadwa_reports/instrumentation.log"; then exit 1; fi
