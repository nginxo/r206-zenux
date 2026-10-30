#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>
#include <signal.h>
#include <errno.h>

static volatile sig_atomic_t g_interrupted = 0;

static void sigint_handler(int sig) {
    (void)sig;
    g_interrupted = 1;
    write(STDOUT_FILENO, "\n", 1);
}

int main(int argc, char **argv) {
    // If invoked non-interactively with -c, pass directly to /bin/sh
    if (argc >= 2 && strcmp(argv[1], "-c") == 0) {
        if (argc >= 3) {
            execl("/bin/sh", "sh", "-c", argv[2], (char *)NULL);
        }
        return 0;
    }

    char cwd[1024];
    char oldpwd[1024];
    char line[4096];

    if (!getcwd(cwd, sizeof(cwd))) {
        strcpy(cwd, "/");
    }
    strcpy(oldpwd, cwd);
    setenv("PWD", cwd, 1);
    setenv("OLDPWD", oldpwd, 1);
    setenv("PATH", "/opt/bin:/CDROMISO/bin:/bin:/sbin:/usr/bin:/usr/sbin:/system/bin:/system/sbin:/vendor/bin:/system/xbin:/app/bin", 1);

    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = sigint_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(SIGINT, &sa, NULL);
    signal(SIGQUIT, SIG_IGN);

    while (1) {
        if (g_interrupted) {
            g_interrupted = 0;
        }

        if (!getcwd(cwd, sizeof(cwd))) {
            strcpy(cwd, "?");
        }
        printf("%s $ ", cwd);
        fflush(stdout);

        if (!fgets(line, sizeof(line), stdin)) {
            if (g_interrupted) {
                clearerr(stdin);
                continue;
            }
            printf("\n");
            break;
        }

        // Strip trailing \r and \n
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r')) {
            line[--len] = '\0';
        }

        // Skip leading whitespace
        char *cmd = line;
        while (*cmd == ' ' || *cmd == '\t') cmd++;

        if (*cmd == '\0') continue;

        // Builtin: exit / quit
        if (strcmp(cmd, "exit") == 0 || strcmp(cmd, "quit") == 0) {
            break;
        }

        // Builtin: cd (only simple cd without compound operators)
        if (strncmp(cmd, "cd", 2) == 0 && (cmd[2] == '\0' || cmd[2] == ' ' || cmd[2] == '\t')
            && !strstr(cmd, "&&") && !strstr(cmd, ";") && !strstr(cmd, "||") && !strstr(cmd, "|")) {
            char *target = cmd + 2;
            while (*target == ' ' || *target == '\t') target++;

            char resolved[1024];
            if (*target == '\0') {
                const char *home = getenv("HOME");
                if (!home) home = "/root";
                snprintf(resolved, sizeof(resolved), "%s", home);
            } else if (strcmp(target, "-") == 0) {
                const char *old = getenv("OLDPWD");
                if (!old) {
                    fprintf(stderr, "sh: cd: OLDPWD not set\n");
                    continue;
                }
                snprintf(resolved, sizeof(resolved), "%s", old);
                printf("%s\n", resolved);
            } else if (target[0] == '~' && (target[1] == '/' || target[1] == '\0')) {
                const char *home = getenv("HOME");
                if (!home) home = "/root";
                snprintf(resolved, sizeof(resolved), "%s%s", home, target + 1);
            } else {
                snprintf(resolved, sizeof(resolved), "%s", target);
            }

            char prev_dir[1024];
            if (getcwd(prev_dir, sizeof(prev_dir))) {
                if (chdir(resolved) == 0) {
                    strcpy(oldpwd, prev_dir);
                    setenv("OLDPWD", oldpwd, 1);
                    if (getcwd(cwd, sizeof(cwd))) {
                        setenv("PWD", cwd, 1);
                    }
                } else {
                    fprintf(stderr, "sh: cd: can't cd to %s: %s\n", resolved, strerror(errno));
                }
            }
            continue;
        }

        // Builtin: export VAR=val
        if (strncmp(cmd, "export ", 7) == 0) {
            char *arg = cmd + 7;
            while (*arg == ' ' || *arg == '\t') arg++;
            if (*arg != '\0') {
                putenv(strdup(arg));
            }
            continue;
        }

        // Execute external command via /bin/sh -c
        pid_t pid = fork();
        if (pid == 0) {
            // Restore default signal handling in child
            signal(SIGINT, SIG_DFL);
            signal(SIGQUIT, SIG_DFL);
            execl("/bin/sh", "sh", "-c", cmd, (char *)NULL);
            _exit(127);
        } else if (pid > 0) {
            // Ignore SIGINT while child is running
            struct sigaction sa_ign, sa_old;
            memset(&sa_ign, 0, sizeof(sa_ign));
            sa_ign.sa_handler = SIG_IGN;
            sigaction(SIGINT, &sa_ign, &sa_old);

            int status;
            while (waitpid(pid, &status, 0) < 0 && errno == EINTR) {
                // Keep waiting if interrupted by signal
            }

            // Restore SIGINT handler
            sigaction(SIGINT, &sa_old, NULL);
        } else {
            perror("fork");
        }
    }

    return 0;
}
