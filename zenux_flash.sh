#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [ "$EUID" -ne 0 ]; then
    echo "This script must be executed with superuser rights"
    exit 1
fi

echo "exertia Group"
echo "Project Zenux -- exertia.it"
echo "Copyright(R) Giorgio Gandolfo 2026"
echo ""
echo "You are executing this file AT YOUR OWN RISK. What you"
echo "do with this software is under your own liability. This is"
echo "intended solely for educational purposes and shouldn't be used'"
echo "for any illegal circumstances."
echo ""

chmod 0600 "$DIR/r206-root-ed25519" 2>/dev/null || true

for tool in python3 cpio gzip; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "Error: '$tool' is required but not installed."
        echo "Please install it with your package manager (e.g. sudo apt install $tool or sudo dnf install $tool)"
        exit 1
    fi
done

echo "Kernel and bootimage building starts from here >>>"
./build_kernel_and_bootimg.sh

# dl mode payload
echo ""
echo "Feeding AT^GODLOAD to ttyUSB2 >>>"
python3 reboot_dl_mode.py

echo ""
echo "Waiting for the connection of the bootloader >>>"
found=0
for i in {1..30}; do
    if [ -e "/dev/ttyUSB2" ]; then
        found=1
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

if [ "$found" -ne 1 ]; then
    echo "/dev/ttyUSB2 seems to not be present."
    echo "check the USB connection and retry"
    exit 1
fi

echo "/dev/ttyUSB2 is present"
sleep 2

# kernel flashing
echo ""
echo "Kernel flashing starts from here >>>"
if [ ! -x "./balongflash/balong_flash" ]; then
    echo "Building balong_flash utility >>>"
    make -C balongflash
fi
./balongflash/balong_flash -n -p /dev/ttyUSB2 kernel-ssh-preview-pty

echo ""
echo "SUCCESS! The device is rebooting."
echo "Please wait whilst the R206 boots >>>"

for i in {1..35}; do
    if [ -e "/dev/ttyUSB0" ] && [ -e "/dev/ttyUSB1" ]; then
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# network interface allocation
IFACE=""
for i in {1..15}; do
    IFACE=$(ip -o link show | grep -E "wwp[0-9]+s|wwx[0-9a-f]+" | awk -F': ' '{print $2}' | head -n 1)
    if [ -n "$IFACE" ]; then
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

if [ -n "$IFACE" ]; then
    echo "Network interface detected: $IFACE"
    echo "the IP 192.168.0.100/24 will now be assigned >>>"
    ip link set "$IFACE" up || true
    ip addr replace 192.168.0.100/24 dev "$IFACE" || true
    ping -c 3 -W 2 192.168.0.1 || true
else
    echo "for some reason the allocation didn't work, execute these commands to manually assign the IP:"
    echo "  sudo ip link set wwp13s0u4 up"
    echo "  sudo ip addr replace 192.168.0.100/24 dev wwp13s0u4"
fi

# Fastfetch installation
if [ -f "$DIR/tools/fastfetch" ]; then
    echo ""
    echo "Installing fastfetch to /opt/bin/fastfetch >>>"
    chmod 0600 "$DIR/r206-root-ed25519" 2>/dev/null || true
    for i in {1..25}; do
        if ssh -i "$DIR/r206-root-ed25519" -p 2222 -o StrictHostKeyChecking=no -o ConnectTimeout=1 root@192.168.0.1 "true" 2>/dev/null; then
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
    ssh -i "$DIR/r206-root-ed25519" -p 2222 -o StrictHostKeyChecking=no root@192.168.0.1 "mkdir -p /opt/bin" 2>/dev/null || true
    ssh -i "$DIR/r206-root-ed25519" -p 2222 -o StrictHostKeyChecking=no root@192.168.0.1 "cat > /opt/bin/fastfetch" < "$DIR/tools/fastfetch"
    ssh -i "$DIR/r206-root-ed25519" -p 2222 -o StrictHostKeyChecking=no root@192.168.0.1 "chmod 755 /opt/bin/fastfetch; /bin/busybox ln -sf /opt/bin/fastfetch /bin/fastfetch" 2>/dev/null || true
    echo "SUCCESS"
fi

echo ""
echo "All set!"
echo "to connect via SSH, use this >>>"
echo "ssh -i r206-root-ed25519 -p 2222 root@192.168.0.1"
