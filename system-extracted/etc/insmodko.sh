#!/system/bin/sh

board=`getprop ro.product.board`

case "$board" in
    "p500bbit") insmod /system/bin/GUPS.ko
    ;;
    "v3r2es")
    charge=$(cat /proc/power_on)
    echo "StartupMode = "
    echo $charge
    case "$charge" in
        "#StartupMode:0!") echo "StartupMode : Invalid!"
        ;;
        "#StartupMode:2!") echo "StartupMode : Charge!"
        ;;
        "#StartupMode:1!") echo "Normal mode. Insert /system/bin/GUPS.ko"
        insmod /system/bin/GUPS.ko 
        ;;
        *) echo "Default mode: Insert /system/bin/GUPS.ko"
        insmod /system/bin/GUPS.ko 
        ;; 
    esac
    ;;
    "v3r2es_stick") insmod /system/bin/GUPS.ko 
    ;;
    "v3r2sft") insmod /system/bin/GUPS.ko 
    ;;
    "v3r2cs") insmod /system/bin/GUPS.ko 
    ;;
    "v7r1asic") insmod /system/bin/v7r1_app.ko 
    ;;
    "hi6920es_udpe5") insmod /system/bin/v7r1_app.ko 
    ;;
    "hi6920csp500") insmod /system/bin/v7r1_app.ko 
    ;;
    "p500fpga") insmod /system/bin/v7r1_app.ko 
    ;;
esac
#move mount data partition to this shell script
#mount -t yaffs2 /dev/block/mtdblock10 /data
