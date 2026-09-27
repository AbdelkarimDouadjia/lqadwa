"""Inspect final APK ELF PT_LOAD alignment; no external libraries or device needed.
This binary check is not a substitute for running the APK on a 16 KB emulator.
"""
import struct
import sys
import zipfile

checked = 0
for path in sys.argv[1:]:
    with zipfile.ZipFile(path) as apk:
        for name in apk.namelist():
            if not name.endswith('.so') or not any(abi in name for abi in ('arm64-v8a', 'x86_64')):
                continue
            data = apk.read(name)
            assert data[:4] == b'\x7fELF' and data[4] == 2, name
            endian = '<' if data[5] == 1 else '>'
            phoff = struct.unpack_from(endian + 'Q', data, 32)[0]
            size, count = struct.unpack_from(endian + 'HH', data, 54)
            for i in range(count):
                header = struct.unpack_from(endian + 'IIQQQQQQ', data, phoff + i * size)
                if header[0] == 1:
                    assert header[7] >= 16384, f'{name}: PT_LOAD alignment {header[7]}'
                    assert header[2] % 16384 == header[3] % 16384, f'{name}: offset/vaddr mismatch'
            checked += 1
            print('PASS 16 KB ELF:', name)
assert checked, 'No 64-bit shared libraries checked'
print(f'PASS: {checked} native libraries; physical/emulator runtime testing still required.')
