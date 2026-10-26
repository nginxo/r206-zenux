#!/system/bin/busybox sh

echo "------------ wifi reload ---------------"

rmmod bcm43362
if [ "$?" = "0" ]
then
    echo "rmmod wifi module  successfully!"
fi

insmod /system/bin/wifi_brcm/driver/bcm43362.ko firmware_path=/system/bin/wifi_brcm/firmware/firmware_apsta.bin nvram_path=/system/bin/wifi_brcm/nv/nv.txt


if [ "$?" = "0" ]
then
    echo "Download wifi firmware successfully!"
    exit 0	
else
    echo "Download wifi firmware failed!!!!!!!"
    exit 1
fi


