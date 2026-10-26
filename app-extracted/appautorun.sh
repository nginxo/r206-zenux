#!/system/bin/sh

mkdir /var

mkdir /var/run

export LD_LIBRARY_PATH="/vendor/lib:/system/lib:/app/lib"

export PATH="/sbin:/vendor/bin:/system/sbin:/system/bin:/system/xbin:/app/bin"

ln -s /data /app/webroot/data

busybox echo 1 > /proc/sys/net/ipv4/ip_forward

busybox echo 1 > /proc/sys/net/ipv6/conf/all/forwarding

if busybox [ -e /data/coredebug ]
then
	ulimit -c unlimited
	echo "1" > /proc/sys/kernel/core_uses_pid
	echo "/online/log/core-%e-%p-%t" > /proc/sys/kernel/core_pattern
fi

npdaemon &

syswatch &
