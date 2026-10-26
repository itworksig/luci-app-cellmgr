include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-cellmgr
PKG_VERSION:=$(shell cat $(CURDIR)/VERSION)
PKG_RELEASE:=1

LUCI_TITLE:=C2000-MAX cellular / eSIM manager
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
