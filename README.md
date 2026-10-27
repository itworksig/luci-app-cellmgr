# luci-app-cellmgr

鲲鹏 / NRadio C2000-MAX（WT9303）蜂窝管理：TD Tech MT5700，两张内置 eSIM + 一张外置 nano SIM。

LuCI：**网络 → 蜂窝模组**  
版本见 `VERSION` · 许可证：MIT

## 功能

- 三卡槽切换、4G / 5G 制式、拨号、运营商扫描
- RSRP / RSRQ / SINR、PCI / TAC / Cell ID / ARFCN、IMEI / IMSI / ICCID、模组温度
- 实时速率、今日 / 本次流量、断线重拨、可选故障切卡
- APN 编辑、频段锁定、小区锁定、PIN / PUK、短信、AT 调试、测速
- 鲲鹏网管上报（可开关）：在线心跳与信号

## 安装

从 [Releases](https://github.com/itworksig/luci-app-cellmgr/releases) 下载 `luci-app-cellmgr-vX.Y.Z-all.ipk`：

```sh
opkg install luci-app-cellmgr-v0.4.0-all.ipk
```

把 `VERSION` 改掉并推到 `main`，GitHub Actions 会自动再打一包。

## 硬件

| 项目 | 约定 |
| --- | --- |
| AT 口 | `/dev/ttyUSB1` |
| 网卡 / 接口 | `eth2` / `wwan` |
| 电源 / SIM 选择 | GPIO `cpe-pwr`、`cpe-sel0` |
| 切卡 | 海思 `AT^SCICHG` |

面向 C2000-MAX + MT5700M-CN。其它机型需要改 GPIO 与 AT 命令。

切卡、锁频、锁小区、复位模组会短暂中断蜂窝。PUK 输错会锁死 SIM。
