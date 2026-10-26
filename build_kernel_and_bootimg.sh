#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

RECOMPILE_KERNEL=0
if [ "$1" == "--recompile-kernel" ]; then
    RECOMPILE_KERNEL=1
fi

if [ "$RECOMPILE_KERNEL" -eq 1 ]; then
    echo "Kernel will be compiled now >>>"
    NDK_BIN="$DIR/source/android-ndk-r9d/toolchains/arm-linux-androideabi-4.6/prebuilt/linux-x86_64/bin"
    CROSS_COMPILE="$NDK_BIN/arm-linux-androideabi-"

    make -j$(nproc) -C "$DIR/source/r206_r208/android-2.6.35" \
      O="$DIR/build-kernel-pty" \
      ARCH=arm \
      CROSS_COMPILE="$CROSS_COMPILE" \
      BOARD_TYPE=BOARD_ASIC \
      VERSION_TYPE=VERSION_V3R2 \
      CHIP_TYPE=CHIP_BB_6756CS \
      BALONG_COMPILE_TYPE=SEPATARE \
      PRODUCT_CFG_BUILD_TYPE=SEPARATE \
      FEATURE_WIFI=FEATURE_ON \
      zImage
    KERNEL_PATH="build-kernel-pty/arch/arm/boot/zImage"
else
    KERNEL_PATH="partitions/kernel-extracted.bin"
fi

echo "Packing initramfs >>>"
cd "$DIR/custom-rootfs-ssh"
find . | cpio -H newc -o -R root:root | gzip -9 > "$DIR/ramdisk-ssh-pty.gz"
cd "$DIR"

echo "Bootimg will be compiled now >>>"
python3 - << PY
import struct, hashlib

kernel_path = '$KERNEL_PATH'
ramdisk_path = 'ramdisk-ssh-pty.gz'
out_path = 'r206-ssh-boot-pty.img'
preview_path = 'kernel-ssh-preview-pty/00-00000105-Kernel_R1.bin'

with open(kernel_path, 'rb') as f:
    kernel_data = f.read()

with open(ramdisk_path, 'rb') as f:
    ramdisk_data = f.read()

kernel_size = len(kernel_data)
ramdisk_size = len(ramdisk_data)
page_size = 2048

kernel_addr = 0x30008000
ramdisk_addr = 0x31000000
second_size = 0
second_addr = 0x30f00000
tags_addr = 0x30000100
name = b''
cmdline = b'root=/dev/ram0 rw console=ttyAMA0,115200 console=uw_tty0,9600 rdinit=/init mem=28m loglevel=0'

ctx = hashlib.sha1()
ctx.update(kernel_data)
ctx.update(struct.pack('<I', kernel_size))
ctx.update(ramdisk_data)
ctx.update(struct.pack('<I', ramdisk_size))
ctx.update(b'')
ctx.update(struct.pack('<I', 0))
img_id = ctx.digest() + b'\x00' * 12

hdr = struct.pack(
    '<8s10I16s512s32s1024s416s',
    b'ANDROID!',
    kernel_size, kernel_addr,
    ramdisk_size, ramdisk_addr,
    second_size, second_addr,
    tags_addr, page_size,
    0, 0,
    name.ljust(16, b'\x00'),
    cmdline.ljust(512, b'\x00'),
    img_id,
    b'\x00' * 1024,
    b'\x00' * 416
)

def pad(data, page_size):
    p = (page_size - (len(data) % page_size)) % page_size
    return data + b'\x00' * p

img_data = hdr + pad(kernel_data, page_size) + pad(ramdisk_data, page_size)

with open(out_path, 'wb') as f:
    f.write(img_data)

with open(preview_path, 'wb') as f:
    f.write(img_data)

print(f"Boot image ready: {out_path} ({len(img_data)} bytes)")
PY

echo "End"
