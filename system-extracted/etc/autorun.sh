#!/system/bin/busybox sh

/system/bin/wifi_brcm/exe/getWifiStartUpFlag

if [  "$?" = "1" ]
then
    echo "NV36 == 0, getinto manufature mode"
    exit 0
fi

export LD_LIBRARY_PATH="/vendor/lib:/system/lib:/app/lib"

export PATH="/sbin:/vendor/bin:/system/sbin:/system/bin:/system/xbin:/app/bin"

mkdir bin

ln -s /system/bin/sh /bin/sh

/system/sbin/NwInquire &

busybox echo 1 > /proc/sys/net/ipv4/ip_forward

busybox echo 1 > /proc/sys/net/ipv6/conf/all/forwarding

busybox echo 0 > /proc/sys/net/netfilter/nf_conntrack_checksum

/app/appautorun.sh