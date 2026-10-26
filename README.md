# luci-app-cellmgr

鲲鹏 / NRadio C2000-MAX（WT9303）蜂窝管理：TD Tech MT5700，两张内置 eSIM + 一张外置 nano SIM。

LuCI：**网络 → 蜂窝模组**  
版本：**0.3.0** · 许可证：MIT

## 功能

- 三卡槽切换、4G / 5G 制式、拨号、运营商扫描
- RSRP / RSRQ / SINR、PCI / TAC / Cell ID / ARFCN、IMEI / IMSI / ICCID、模组温度
- 实时速率、今日 / 本次流量、断线重拨、可选故障切卡
- APN 编辑、频段锁定、小区锁定、PIN / PUK、短信、AT 调试、测速

## 安装

把仓库里的 `root/` 和 `htdocs/` 同步到路由器对应路径：

```sh
chmod +x /usr/sbin/cellmgr /usr/sbin/cellmgr-watch /etc/init.d/cellmgr
/etc/init.d/cellmgr enable
/etc/init.d/cellmgr start
/etc/init.d/rpcd restart
```

刷新 LuCI 后打开 **网络 → 蜂窝模组**。

## 硬件

| 项目 | 约定 |
| --- | --- |
| AT 口 | `/dev/ttyUSB1` |
| 网卡 / 接口 | `eth2` / `wwan` |
| 电源 / SIM 选择 | GPIO `cpe-pwr`、`cpe-sel0` |
| 切卡 | 海思 `AT^SCICHG` |

面向 C2000-MAX + MT5700M-CN。其它机型需要改 GPIO 与 AT 命令。

切卡、锁频、锁小区、复位模组会短暂中断蜂窝。PUK 输错会锁死 SIM。
