#include <fcntl.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <sys/mount.h>
#include <sys/stat.h>
#include <string.h>
#include <stdio.h>

typedef struct {
    int led_state;      // 0 = ON, 1 = OFF, 2 = BLINK
    int led_id;         // 0 = NET, 1 = WiFi, 2 = BATT, 3 = SM
    int led_color;      // 0 = RED, 1 = GREEN, 2 = YELLOW, 3 = BLUE
    int second_led_color;
    unsigned int duration;
    unsigned int second_duration;
    int led_current;    // 2 = LEVEL2
    int sleep_mode;     // 0 = NORMAL
} LED_IOCTL_ARG;

static void patch_app_led_file(void) {
    int fd = open("/app/bin/led", O_RDWR);
    if (fd < 0) return;

    // Offsets in .data:
    // 0x6320: wifion
    // 0x63a0: smsunread
    // 0x63c0: smsnormal
    // 0x63e0: smsfull
    // 0x64e0: restore_sms
    const unsigned int offsets[] = { 0x6320, 0x63a0, 0x63c0, 0x63e0, 0x64e0 };
    int state_on = 0;
    int color_blue = 3;

    for (int i = 0; i < 5; i++) {
        if (lseek(fd, offsets[i] + 12, SEEK_SET) != (off_t)-1) {
            write(fd, &state_on, sizeof(int));
        }
        if (lseek(fd, offsets[i] + 16, SEEK_SET) != (off_t)-1) {
            write(fd, &color_blue, sizeof(int));
        }
    }
    close(fd);
}

static int is_ssh_active(void) {
    FILE *f = fopen("/proc/net/tcp", "r");
    if (!f) return 0;

    char line[256];
    int active = 0;
    while (fgets(line, sizeof(line), f)) {
        int sl, state;
        unsigned int local_ip, local_port, rem_ip, rem_port;
        if (sscanf(line, "%d: %x:%x %x:%x %x", &sl, &local_ip, &local_port, &rem_ip, &rem_port, &state) == 6) {
            // Port 2222 (0x08AE) or 22 (0x0016), state 1 = TCP_ESTABLISHED
            if ((local_port == 0x08AE || local_port == 0x0016) && state == 1) {
                active = 1;
                break;
            }
        }
    }
    fclose(f);
    return active;
}

int main(void) {
    LED_IOCTL_ARG arg_wifi;
    memset(&arg_wifi, 0, sizeof(arg_wifi));
    arg_wifi.led_state = 0;   // ON
    arg_wifi.led_id = 1;      // WiFi
    arg_wifi.led_color = 3;   // BLUE
    arg_wifi.second_led_color = 3;
    arg_wifi.duration = 0;
    arg_wifi.second_duration = 0;
    arg_wifi.led_current = 2; // LEVEL2

    LED_IOCTL_ARG arg_sm;
    memset(&arg_sm, 0, sizeof(arg_sm));
    arg_sm.led_state = 0;   // ON
    arg_sm.led_id = 3;      // SM (Posta)
    arg_sm.led_color = 3;   // BLUE
    arg_sm.led_current = 2; // LEVEL2

    int fd = -1;
    for (int i = 0; i < 50; i++) {
        fd = open("/dev/led", O_RDWR);
        if (fd >= 0) break;
        usleep(100000);
    }

    if (fd >= 0) {
        ioctl(fd, 0, &arg_wifi);
        ioctl(fd, 0, &arg_sm);
    }

    int app_setup_done = 0;
    int last_ssh_state = -1;
    int loop_count = 0;

    while (1) {
        struct stat st;
        if (!app_setup_done && stat("/app/bin/led", &st) == 0) {
            patch_app_led_file();
            if (stat("/sbin/led", &st) == 0) {
                mount("/sbin/led", "/app/bin/led", NULL, MS_BIND, NULL);
            }
            app_setup_done = 1;
        }

        if (fd < 0) {
            fd = open("/dev/led", O_RDWR);
        }

        int ssh_now = is_ssh_active();
        if (ssh_now != last_ssh_state) {
            last_ssh_state = ssh_now;
            if (ssh_now) {
                // SSH is active: WiFi LED blinks blue
                arg_wifi.led_state = 2; // BLINK
                arg_wifi.duration = 500;
                arg_wifi.second_duration = 500;
            } else {
                // SSH is inactive: WiFi LED solid blue
                arg_wifi.led_state = 0; // ON
                arg_wifi.duration = 0;
                arg_wifi.second_duration = 0;
            }
            if (fd >= 0) {
                ioctl(fd, 0, &arg_wifi);
            }
        } else if (ssh_now == 0 && (loop_count % 5 == 0)) {
            // Periodically refresh solid blue if not in SSH
            if (fd >= 0) {
                ioctl(fd, 0, &arg_wifi);
            }
        }

        // Keep Posta LED solid blue
        if (fd >= 0) {
            ioctl(fd, 0, &arg_sm);
        }

        loop_count++;
        sleep(1);
    }

    if (fd >= 0) close(fd);
    return 0;
}
