# luci-app-cellmgr

OpenWrt LuCI 应用，用于 NRadio / 鲲鹏 C2000-MAX（WT9303）上的 **TD Tech MT5700** 蜂窝模组：两张内置 eSIM + 一张外置 nano SIM。

LuCI 菜单：**网络 → 蜂窝模组**

当前版本：**0.3.0**

## 功能

- 三卡槽切换（eSIM1 / eSIM2 / 外置 SIM）、4G/5G 制式、拨号与运营商扫描
- 信号（RSRP / RSRQ / SINR）、PCI / TAC / Cell ID / ARFCN、IMEI / IMSI / ICCID、模组温度
- 实时上下行速率、今日/本次流量、断线重拨与可选故障切卡
- APN 编辑、频段锁定、小区锁定、PIN / PUK、短信、AT 调试、一键测速

## 目录

```
Makefile
htdocs/luci-static/resources/view/cellmgr/overview.js
root/usr/sbin/cellmgr
root/usr/sbin/cellmgr-watch
root/etc/init.d/cellmgr
root/etc/config/cellmgr
root/usr/share/rpcd/ucode/cellmgr
root/usr/share/rpcd/acl.d/luci-app-cellmgr.json
root/usr/share/luci/menu.d/luci-app-cellmgr.json
```

## 安装（已在运行的 OpenWrt 25）

把 `root/` 与 `htdocs/` 同步到路由器对应路径后：

```sh
chmod +x /usr/sbin/cellmgr /usr/sbin/cellmgr-watch /etc/init.d/cellmgr
/etc/init.d/cellmgr enable
/etc/init.d/cellmgr start
/etc/init.d/rpcd restart
```

硬件约定：AT 口 `/dev/ttyUSB1`，网卡 `eth2` / 接口 `wwan`，GPIO `cpe-pwr` 与 `cpe-sel0`，海思 `AT^SCICHG` 切卡。

## 注意

- 切卡、锁频、锁小区、复位模组会短暂中断蜂窝
- PUK 输错会锁死 SIM，请确认后再提交
- 源码面向 C2000-MAX + MT5700M-CN，其它机型需要改 GPIO 与 AT 命令
