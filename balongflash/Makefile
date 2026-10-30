CC       ?= gcc
BUILDNO  = $(shell cat build 2>/dev/null || echo 290)

# Check if host system has zlib.h
HAVE_ZLIB := $(shell test -f /usr/include/zlib.h || test -f /usr/local/include/zlib.h || pkg-config --exists zlib 2>/dev/null && echo 1 || echo 0)

ifeq ($(HAVE_ZLIB),1)
CFLAGS   = -O2 -Wunused -Wno-unused-result -D BUILDNO=$(BUILDNO) -D_7ZIP_ST
LIBS     = -lz
ZLIB_OBJS =
else
CFLAGS   = -O2 -Wunused -Wno-unused-result -D BUILDNO=$(BUILDNO) -D_7ZIP_ST -Iwinbuild/zlib
LIBS     =
ZLIB_OBJS = winbuild/zlib/adler32.o winbuild/zlib/crc32.o winbuild/zlib/inffast.o winbuild/zlib/inflate.o winbuild/zlib/inftrees.o winbuild/zlib/trees.o winbuild/zlib/uncompr.o winbuild/zlib/zutil.o
endif

.PHONY: all clean

all:    balong_flash

clean: 
	rm -f *.o lzma/*.o winbuild/zlib/*.o
	rm -f balong_flash

balong_flash: balong_flash.o hdlcio_linux.o ptable.o flasher.o util.o signver.o lzma/Alloc.o lzma/LzmaDec.o $(ZLIB_OBJS)
	@$(CC) $^ -o $@ $(LIBS) 
	@echo Current build: $(BUILDNO)
	@echo $$((`cat build 2>/dev/null || echo 290`+1)) >build

	
