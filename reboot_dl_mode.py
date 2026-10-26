#!/usr/bin/env python3
import os
import sys
import termios
import tty
import time

print("exertia Group")
print("Project Zenux -- exertia.it")
print("Copyright(R) Giorgio Gandolfo 2026")

print()
print("You are executing this file AT YOUR OWN RISK. What you")
print("do with this software is under your own liability. This is")
print("intended solely for educational purposes and shouldn't be used'")
print("for any illegal circumstances.")
print()


print("Beginning payload now >>> ")
def send_at_command(port, cmd=b"AT^GODLOAD\r"):
    try:
        fd = os.open(port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    except Exception as e:
        print(f"[{port}] Can't open: {e}")
        return False

    try:
        attrs = termios.tcgetattr(fd)
        tty.cfmakeraw(attrs)
        attrs[4] = termios.B115200  # ispeed
        attrs[5] = termios.B115200  # ospeed
        termios.tcsetattr(fd, termios.TCSANOW, attrs)
        termios.tcflush(fd, termios.TCIOFLUSH)

        os.write(fd, cmd)
        
        resp = b""
        start = time.time()
        while time.time() - start < 2.0:
            try:
                chunk = os.read(fd, 512)
                if chunk:
                    resp += chunk
                    if b"OK" in resp or b"ERROR" in resp:
                        break
            except BlockingIOError:
                pass
            time.sleep(0.1)

        print("A successful reboot to DL mode should have as the answer OK")
        print(f"[{port}] ANSWER: {resp!r}")
        if b"OK" in resp:
            return True
        return False
    finally:
        os.close(fd)

if __name__ == "__main__":
    ports = ["/dev/ttyUSB1", "/dev/ttyUSB0"]
    for p in ports:
        if os.path.exists(p):
            print(f"Feeding AT^GODLOAD to {p}")
            if send_at_command(p):
                print(f"\n>>> SUCCESS {p} The device is rebooting")
                sys.exit(0)
    print("\nNo port replied with OK.")
