'use strict';
'require view';
'require rpc';
'require ui';
'require poll';
'require dom';

const callStatus = rpc.declare({
	object: 'luci.cellmgr',
	method: 'status',
	timeout: 25000,
	expect: {}
});

const callSwitch = rpc.declare({
	object: 'luci.cellmgr',
	method: 'switch_slot',
	params: [ 'slot' ],
	timeout: 120000,
	expect: {}
});

const callRat = rpc.declare({
	object: 'luci.cellmgr',
	method: 'set_rat',
	params: [ 'mode' ],
	timeout: 30000,
	expect: {}
});

const callDial = rpc.declare({
	object: 'luci.cellmgr',
	method: 'dial',
	timeout: 30000,
	expect: {}
});

const callHangup = rpc.declare({
	object: 'luci.cellmgr',
	method: 'hangup',
	timeout: 20000,
	expect: {}
});

const callScan = rpc.declare({
	object: 'luci.cellmgr',
	method: 'scan',
	timeout: 120000,
	expect: {}
});

const callSelect = rpc.declare({
	object: 'luci.cellmgr',
	method: 'select_op',
	params: [ 'plmn', 'act' ],
	timeout: 40000,
	expect: {}
});


const callReset = rpc.declare({
	object: 'luci.cellmgr',
	method: 'reset',
	timeout: 20000,
	expect: {}
});

const callSms = rpc.declare({
	object: 'luci.cellmgr',
	method: 'sms_list',
	timeout: 20000,
	expect: {}
});

const callSmsSend = rpc.declare({
	object: 'luci.cellmgr',
	method: 'sms_send',
	params: [ 'number', 'text' ],
	timeout: 40000,
	expect: {}
});

const callUsageReset = rpc.declare({
	object: 'luci.cellmgr',
	method: 'usage_reset',
	expect: {}
});

const callSetcfg = rpc.declare({
	object: 'luci.cellmgr',
	method: 'setcfg',
	params: [ 'key', 'value' ],
	expect: {}
});

const callAt = rpc.declare({
	object: 'luci.cellmgr',
	method: 'at',
	params: [ 'cmd' ],
	timeout: 15000,
	expect: {}
});

const callApn = rpc.declare({
	object: 'luci.cellmgr',
	method: 'apn',
	params: [ 'apn', 'pdp', 'auth', 'username', 'password', 'redial' ],
	timeout: 40000,
	expect: {}
});

const callBand = rpc.declare({
	object: 'luci.cellmgr',
	method: 'band',
	params: [ 'nr', 'lte' ],
	timeout: 90000,
	expect: {}
});

const callCelllock = rpc.declare({
	object: 'luci.cellmgr',
	method: 'celllock',
	params: [ 'action', 'pci', 'arfcn', 'band', 'scs' ],
	timeout: 90000,
	expect: {}
});

const callPin = rpc.declare({
	object: 'luci.cellmgr',
	method: 'pin',
	params: [ 'action', 'pin', 'puk', 'newpin' ],
	timeout: 40000,
	expect: {}
});

const callSpeed = rpc.declare({
	object: 'luci.cellmgr',
	method: 'speed',
	timeout: 45000,
	expect: {}
});

function dash(v) {
	return (v === null || v === undefined || v === '') ? '—' : v;
}

function fmtDb(v, unit) {
	if (v === null || v === undefined || v === '')
		return '—';
	return '%s %s'.format(v, unit);
}

function fmtBytes(n) {
	n = Number(n) || 0;
	if (n < 1024) return '%d B'.format(n);
	if (n < 1048576) return '%.1f KB'.format(n / 1024);
	if (n < 1073741824) return '%.2f MB'.format(n / 1048576);
	return '%.2f GB'.format(n / 1073741824);
}

function fmtRate(bps) {
	if (bps == null || isNaN(bps))
		return '—';
	const n = Math.max(0, bps);
	if (n < 1000) return '%d bps'.format(n);
	if (n < 1000000) return '%.1f Kbps'.format(n / 1000);
	if (n < 1000000000) return '%.2f Mbps'.format(n / 1000000);
	return '%.2f Gbps'.format(n / 1000000000);
}

function bars(n) {
	n = Number(n) || 0;
	const nodes = [];
	for (let i = 1; i <= 5; i++) {
		nodes.push(E('i', { 'class': i <= n ? 'on' : '' }));
	}
	return E('span', { 'class': 'cellmgr-bars', 'title': '%d/5'.format(n) }, nodes);
}

function kv(label, value) {
	return E('div', { 'class': 'cellmgr-kv' }, [
		E('span', {}, [ label ]),
		E('strong', {}, [ dash(value) ])
	]);
}

return view.extend({
	lastTraffic: null,
	rxRate: null,
	txRate: null,
	busy: false,

	load() {
		return L.resolveDefault(callStatus(), {});
	},

	render(data) {
		const v = E('div', { 'class': 'cellmgr' }, [
			E('style', {}, `
.cellmgr h2 { margin-bottom: 8px; }
.cellmgr-desc { color: var(--a-dim, #8aa); margin-bottom: 18px; }
.cellmgr-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 14px; }
.cellmgr-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 12px 0 18px; }
.cellmgr-card, .cellmgr-panel {
  border: 1px solid var(--a-line-soft, rgba(6,222,107,.16));
  border-radius: 8px; background: rgba(7,16,28,.62); padding: 14px 16px;
}
.cellmgr-card { cursor: pointer; text-align: center; }
.cellmgr-card.active { border-color: rgb(6,222,107); box-shadow: 0 0 18px rgba(6,222,107,.18); }
.cellmgr-card .name { font-size: 16px; font-weight: 700; color: var(--a-accent, #06de6b); }
.cellmgr-card .meta { color: var(--a-dim, #8aa); font-size: 12px; margin-top: 6px; }
.cellmgr-hero { display: flex; justify-content: space-between; gap: 18px; align-items: center; margin-bottom: 12px; }
.cellmgr-rat { font-size: 28px; font-weight: 700; color: var(--a-accent, #06de6b); letter-spacing: .08em; }
.cellmgr-carrier { font-size: 18px; }
.cellmgr-bars { display: inline-flex; gap: 3px; align-items: flex-end; height: 22px; }
.cellmgr-bars i { display: block; width: 6px; background: rgba(223,251,255,.18); border-radius: 1px; }
.cellmgr-bars i:nth-child(1){height:6px} .cellmgr-bars i:nth-child(2){height:10px}
.cellmgr-bars i:nth-child(3){height:14px} .cellmgr-bars i:nth-child(4){height:18px}
.cellmgr-bars i:nth-child(5){height:22px} .cellmgr-bars i.on { background: rgb(6,222,107); }
.cellmgr-kvs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.cellmgr-kv { display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--a-line-soft, rgba(6,222,107,.12)); }
.cellmgr-kv span { color: var(--a-muted, #6ce6aa); }
.cellmgr-speed { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.cellmgr-speed div { padding: 10px 12px; border: 1px solid var(--a-line-soft, rgba(6,222,107,.16)); border-radius: 6px; }
.cellmgr-speed strong { display: block; font-size: 22px; color: var(--a-accent, #06de6b); }
.cellmgr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.cellmgr-bands { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 8px 0; }
.cellmgr-bands label { display: inline-flex; align-items: center; gap: 6px; color: var(--a-muted, #6ce6aa); }
.cellmgr input[type=text], .cellmgr input[type=password], .cellmgr select {
  background: rgba(7,16,28,.8); color: inherit; border: 1px solid var(--a-line-soft, rgba(6,222,107,.16));
  border-radius: 6px; padding: 6px 8px; min-width: 120px;
}
@media (max-width: 900px) {
  .cellmgr-grid, .cellmgr-cards, .cellmgr-kvs, .cellmgr-speed { grid-template-columns: 1fr; }
}
			`),
			E('h2', {}, [ _('蜂窝模组') ]),
			E('div', { 'class': 'cellmgr-desc' }, [
				_('管理 C2000-MAX 的 TD Tech MT5700：两张内置 eSIM 与一张外置 SIM、制式、信号与拨号。')
			]),
			E('div', { 'id': 'cellmgr-slots', 'class': 'cellmgr-cards' }),
			E('div', { 'class': 'cellmgr-grid' }, [
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-net' }),
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-mod' })
			]),
			E('div', { 'class': 'cellmgr-panel', 'style': 'margin-top:14px' }, [
				E('h3', {}, [ _('切换运营商 / 制式') ]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleRat', 'auto') }, [ _('自动 4G/5G') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleRat', 'nr') }, [ _('锁定 5G') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleRat', 'lte') }, [ _('锁定 4G') ]),
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleDial') }, [ _('重新拨号') ]),
					E('button', { 'class': 'btn cbi-button-negative', 'click': ui.createHandlerFn(this, 'handleHangup') }, [ _('断开蜂窝') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleScan') }, [ _('扫描运营商') ]),
					E('button', { 'class': 'btn cbi-button-negative', 'click': ui.createHandlerFn(this, 'handleModemReset') }, [ _('复位模组') ])
				]),
				E('div', { 'id': 'cellmgr-ops', 'style': 'margin-top:12px' })
			]),
			E('div', { 'class': 'cellmgr-grid', 'style': 'margin-top:14px' }, [
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-usage' }),
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-watch' })
			]),
			E('div', { 'class': 'cellmgr-panel', 'style': 'margin-top:14px', 'id': 'cellmgr-cloud' }),
			E('div', { 'class': 'cellmgr-grid', 'style': 'margin-top:14px' }, [
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-apn' }),
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-pin' })
			]),
			E('div', { 'class': 'cellmgr-grid', 'style': 'margin-top:14px' }, [
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-band' }),
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-cell' })
			]),
			E('div', { 'class': 'cellmgr-grid', 'style': 'margin-top:14px' }, [
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-sms' }),
				E('div', { 'class': 'cellmgr-panel', 'id': 'cellmgr-adv' })
			])
		]);

		this.update(data || {});
		poll.add(L.bind(function() {
			if (this.busy)
				return Promise.resolve();
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}, this), 8);
		return v;
	},

	update(data) {
		if (!data)
			return;
		if (data.ok === false) {
			const netEl = document.getElementById('cellmgr-net');
			if (netEl)
				dom.content(netEl, [ E('p', {}, [ data.error || _('读取模组状态失败') ]) ]);
			return;
		}
		const sim = data.sim || {};
		const net = data.network || {};
		const sig = data.signal || {};
		const wan = data.wan || {};
		const modem = data.modem || {};
		const tr = data.traffic || {};

		if (this.lastTraffic && tr.ts && tr.ts > this.lastTraffic.ts) {
			const dt = tr.ts - this.lastTraffic.ts;
			if (dt > 0.4) {
				this.rxRate = (tr.rx_bytes - this.lastTraffic.rx_bytes) * 8 / dt;
				this.txRate = (tr.tx_bytes - this.lastTraffic.tx_bytes) * 8 / dt;
			}
		}
		this.lastTraffic = tr;

		const slotsEl = document.getElementById('cellmgr-slots');
		if (slotsEl) {
			const order = [ 'esim1', 'esim2', 'nano' ];
			const labels = sim.slots || { esim1: '内置 eSIM 1', esim2: '内置 eSIM 2', nano: '外置 SIM' };
			dom.content(slotsEl, order.map(id => {
				const active = sim.slot === id;
				return E('div', {
					'class': 'cellmgr-card' + (active ? ' active' : ''),
					'click': ui.createHandlerFn(this, 'handleSwitch', id)
				}, [
					E('div', { 'class': 'name' }, [ labels[id] || id ]),
					E('div', { 'class': 'meta' }, [ active ? _('当前使用') : _('点击切换') ])
				]);
			}));
		}

		const netEl = document.getElementById('cellmgr-net');
		if (netEl) {
			dom.content(netEl, [
				E('div', { 'class': 'cellmgr-hero' }, [
					E('div', {}, [
						E('div', { 'class': 'cellmgr-carrier' }, [ dash(net.carrier) ]),
						E('div', { 'class': 'cellmgr-rat' }, [ dash(net.rat_label), ' ', E('small', {}, [ dash(net.rat) ]) ])
					]),
					E('div', { 'style': 'text-align:right' }, [
						bars(sig.bars),
						E('div', {}, [ fmtDb(sig.rsrp_dbm, 'dBm') ])
					])
				]),
				E('div', { 'class': 'cellmgr-kvs' }, [
					kv(_('运营商'), net.carrier),
					kv(_('制式'), '%s / %s'.format(dash(net.rat_label), dash(net.sysmode))),
					kv(_('频段'), net.band ? '%s  %s MHz / %s MHz'.format(net.band, dash(net.dl_mhz), dash(net.bw_mhz)) : '—'),
					kv(_('RSRP'), fmtDb(sig.rsrp_dbm, 'dBm')),
					kv(_('RSRQ'), fmtDb(sig.rsrq_db, 'dB')),
					kv(_('SINR'), fmtDb(sig.sinr_db, 'dB')),
					kv(_('RSSI'), fmtDb(sig.rssi_dbm, 'dBm')),
					kv(_('连接'), wan.up ? _('已连接') : _('未连接')),
					kv(_('IPv4'), (wan.ipv4 || []).join(', ') || '—'),
					kv(_('网关'), wan.gateway),
					kv(_('DNS'), (wan.dns || []).join(', ') || '—'),
					kv(_('IPv6'), (wan.ipv6 || []).join(', ') || '—'),
					kv(_('PCI / TAC'), '%s / %s'.format(dash(net.pci), dash(net.tac))),
					kv(_('Cell ID'), net.cell_id),
					kv(_('ARFCN'), net.arfcn),
					kv(_('漫游'), net.roaming ? _('是') : _('否'))
				]),
				E('div', { 'class': 'cellmgr-speed' }, [
					E('div', {}, [ E('span', {}, [ _('下行') ]), E('strong', {}, [ fmtRate(this.rxRate) ]), E('small', {}, [ fmtBytes(tr.rx_bytes) ]) ]),
					E('div', {}, [ E('span', {}, [ _('上行') ]), E('strong', {}, [ fmtRate(this.txRate) ]), E('small', {}, [ fmtBytes(tr.tx_bytes) ]) ])
				])
			]);
		}

		const modEl = document.getElementById('cellmgr-mod');
		if (modEl) {
			dom.content(modEl, [
				E('h3', {}, [ _('模组与卡信息') ]),
				E('div', { 'class': 'cellmgr-kvs' }, [
					kv(_('型号'), modem.model),
					kv(_('厂商'), modem.manufacturer),
					kv(_('固件'), modem.revision),
					kv(_('IMEI'), modem.imei),
					kv(_('IMSI'), sim.imsi),
					kv(_('ICCID'), sim.iccid),
					kv(_('PLMN'), sim.plmn),
					kv(_('PIN 状态'), sim.cpin),
					kv(_('当前卡槽'), sim.slot_label),
					kv(_('温度'), modem.temp_c != null ? '%s ℃'.format(modem.temp_c) : '—'),
					kv(_('AT 口'), modem.port),
					kv(_('在线时长'), wan.uptime != null ? '%t'.format(wan.uptime) : '—')
				])
			]);
		}

		const usage = data.usage || {};
		const wd = data.watchdog || {};
		const usageEl = document.getElementById('cellmgr-usage');
		if (usageEl) {
			dom.content(usageEl, [
				E('h3', {}, [ _('流量统计') ]),
				E('div', { 'class': 'cellmgr-kvs' }, [
					kv(_('今日下行'), fmtBytes(usage.today_rx)),
					kv(_('今日上行'), fmtBytes(usage.today_tx)),
					kv(_('本次下行'), fmtBytes(usage.session_rx)),
					kv(_('本次上行'), fmtBytes(usage.session_tx))
				]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleUsageReset') }, [ _('清零统计') ]),
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleSpeed') }, [ _('测速') ])
				])
			]);
		}
		const cloud = data.cloud || {};
		const cloudEl = document.getElementById('cellmgr-cloud');
		if (cloudEl) {
			const on = !!cloud.enabled;
			const stateText = !on ? _('已关闭') :
				(cloud.state === 'connected' ? _('已连接') :
				(cloud.state === 'connecting' || cloud.state === 'retry' ? _('连接中') :
				(cloud.state === 'identity_error' ? _('设备身份无效') : _('未连接'))));
			const idInput = document.getElementById('cellmgr-cloud-id');
			const codeInput = document.getElementById('cellmgr-cloud-code');
			const keepId = idInput ? idInput.value : (cloud.device_id || '');
			const keepCode = codeInput ? codeInput.value : (cloud.device_code || '');
			dom.content(cloudEl, [
				E('h3', {}, [ _('鲲鹏网管上报') ]),
				E('div', { 'class': 'cellmgr-desc' }, [
					_('默认关闭。开启后向官方 App 上报在线和信号，可随时关掉。')
				]),
				E('div', { 'class': 'cellmgr-kvs' }, [
					kv(_('开关'), on ? _('开') : _('关')),
					kv(_('状态'), stateText),
					kv(_('当前设备 ID'), cloud.device_id || '—'),
					kv(_('上次心跳'), cloud.last_presence ? '%t'.format(cloud.last_presence) : '—')
				]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('button', {
						'class': on ? 'btn cbi-button-negative' : 'btn cbi-button-action',
						'click': ui.createHandlerFn(this, 'handleCfg', 'cloud_enable', on ? '0' : '1')
					}, [ on ? _('关闭上报') : _('开启上报') ])
				]),
				E('div', { 'class': 'cellmgr-actions', 'style': 'margin-top:8px' }, [
					E('input', { 'id': 'cellmgr-cloud-id', 'placeholder': _('机身 MAC，不要填 Wi-Fi MAC'), 'value': keepId, 'style': 'min-width:180px' }),
					E('input', { 'id': 'cellmgr-cloud-code', 'placeholder': _('铭牌设备码'), 'value': keepCode, 'style': 'min-width:160px' }),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleCloudIdent') }, [ _('保存身份') ])
				]),
				cloud.message ? E('div', { 'style': 'margin-top:8px;color:var(--a-dim,#8aa);font-size:12px' }, [ cloud.message ]) : E('span')
			]);
		}
		const watchEl = document.getElementById('cellmgr-watch');
		if (watchEl) {
			dom.content(watchEl, [
				E('h3', {}, [ _('断线重拨') ]),
				E('div', { 'class': 'cellmgr-kvs' }, [
					kv(_('看门狗'), wd.enabled ? _('已开启') : _('已关闭')),
					kv(_('故障切卡'), wd.failover ? _('已开启') : _('已关闭')),
					kv(_('探测地址'), wd.ping_host),
					kv(_('连续失败'), wd.fail_count)
				]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleCfg', 'watchdog', wd.enabled ? '0' : '1') }, [ wd.enabled ? _('关闭看门狗') : _('开启看门狗') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleCfg', 'failover', wd.failover ? '0' : '1') }, [ wd.failover ? _('关闭故障切卡') : _('开启故障切卡') ])
				]),
				E('div', { 'id': 'cellmgr-log', 'style': 'margin-top:10px;color:var(--a-dim,#8aa);font-size:12px' },
					((data.events || []).slice().reverse().map(ev => E('div', {}, [ (ev.msg || '') ])))
				)
			]);
		}
		const smsEl = document.getElementById('cellmgr-sms');
		if (smsEl && !smsEl.hasChildNodes()) {
			dom.content(smsEl, [
				E('h3', {}, [ _('短信') ]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('input', { 'id': 'cellmgr-sms-num', 'placeholder': _('号码'), 'style': 'min-width:140px' }),
					E('input', { 'id': 'cellmgr-sms-text', 'placeholder': _('内容'), 'style': 'flex:1;min-width:180px' }),
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleSmsSend') }, [ _('发送') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleSmsList') }, [ _('刷新收件箱') ])
				]),
				E('div', { 'id': 'cellmgr-sms-list', 'style': 'margin-top:10px' }, [ _('点刷新读取 SIM 短信') ])
			]);
		}
		const apn = data.apn || {};
		const lk = data.lock || {};
		const pin = data.sim || {};
		const apnEl = document.getElementById('cellmgr-apn');
		if (apnEl && !apnEl.hasChildNodes()) {
			dom.content(apnEl, [
				E('h3', {}, [ _('APN') ]),
				E('div', { 'class': 'cellmgr-kvs' }, [
					kv(_('模组当前'), apn.modem_apn || _('运营商默认'))
				]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('input', { 'id': 'cellmgr-apn-name', 'placeholder': '3gnet', 'value': apn.apn || '' }),
					E('select', { 'id': 'cellmgr-apn-pdp' }, [
						E('option', { 'value': 'IPV4V6', 'selected': (apn.pdp || 'IPV4V6') === 'IPV4V6' ? 'selected' : null }, [ 'IPv4/IPv6' ]),
						E('option', { 'value': 'IP', 'selected': apn.pdp === 'IP' ? 'selected' : null }, [ 'IPv4' ]),
						E('option', { 'value': 'IPV6', 'selected': apn.pdp === 'IPV6' ? 'selected' : null }, [ 'IPv6' ])
					]),
					E('select', { 'id': 'cellmgr-apn-auth' }, [
						E('option', { 'value': '0', 'selected': (apn.auth || '0') === '0' ? 'selected' : null }, [ _('无认证') ]),
						E('option', { 'value': '1', 'selected': apn.auth === '1' ? 'selected' : null }, [ 'PAP' ]),
						E('option', { 'value': '2', 'selected': apn.auth === '2' ? 'selected' : null }, [ 'CHAP' ])
					]),
					E('input', { 'id': 'cellmgr-apn-user', 'placeholder': _('用户名'), 'value': apn.username || '' }),
					E('input', { 'id': 'cellmgr-apn-pass', 'placeholder': _('密码'), 'type': 'password' })
				]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleApnPreset', '3gnet') }, [ _('联通 3gnet') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleApnPreset', 'cmnet') }, [ _('移动 cmnet') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleApnPreset', 'ctnet') }, [ _('电信 ctnet') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleApn', '0') }, [ _('仅保存') ]),
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleApn', '1') }, [ _('保存并重拨') ])
				])
			]);
		}
		const pinEl = document.getElementById('cellmgr-pin');
		if (pinEl) {
			const statusBox = [
				E('h3', {}, [ _('PIN / PUK') ]),
				E('div', { 'class': 'cellmgr-kvs' }, [
					kv(_('卡状态'), pin.cpin),
					kv(_('PIN 锁'), pin.pin_enabled ? _('已开启') : _('已关闭')),
					kv(_('需要 PIN'), pin.pin_required ? _('是') : _('否')),
					kv(_('需要 PUK'), pin.puk_required ? _('是') : _('否'))
				])
			];
			if (!pinEl.hasChildNodes()) {
				dom.content(pinEl, statusBox.concat([
					E('p', { 'style': 'color:var(--a-dim,#8aa);font-size:12px' }, [
						_('PUK 输错几次会锁死 SIM，请确认后再提交。')
					]),
					E('div', { 'class': 'cellmgr-actions' }, [
						E('input', { 'id': 'cellmgr-pin-val', 'placeholder': 'PIN', 'type': 'password' }),
						E('input', { 'id': 'cellmgr-puk-val', 'placeholder': 'PUK', 'type': 'password' }),
						E('input', { 'id': 'cellmgr-pin-new', 'placeholder': _('新 PIN'), 'type': 'password' })
					]),
					E('div', { 'class': 'cellmgr-actions' }, [
						E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handlePin', 'enter') }, [ _('解锁 PIN') ]),
						E('button', { 'class': 'btn cbi-button-negative', 'click': ui.createHandlerFn(this, 'handlePin', 'puk') }, [ _('PUK 解锁') ]),
						E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handlePin', 'enable') }, [ _('开启 PIN') ]),
						E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handlePin', 'disable') }, [ _('关闭 PIN') ])
					])
				]));
			}
			else {
				const kvs = pinEl.querySelector('.cellmgr-kvs');
				if (kvs)
					dom.content(kvs, [
						kv(_('卡状态'), pin.cpin),
						kv(_('PIN 锁'), pin.pin_enabled ? _('已开启') : _('已关闭')),
						kv(_('需要 PIN'), pin.pin_required ? _('是') : _('否')),
						kv(_('需要 PUK'), pin.puk_required ? _('是') : _('否'))
					]);
			}
		}
		const bandEl = document.getElementById('cellmgr-band');
		if (bandEl && !bandEl.hasChildNodes()) {
			const mk = (prefix, list, selected) => (list || []).map(b => E('label', {}, [
				E('input', {
					'type': 'checkbox',
					'class': 'cellmgr-' + prefix + '-band',
					'value': String(b),
					'checked': (selected || []).map(String).indexOf(String(b)) >= 0 ? 'checked' : null
				}),
				prefix === 'nr' ? 'n%s'.format(b) : 'B%s'.format(b)
			]));
			dom.content(bandEl, [
				E('h3', {}, [ _('频段锁定') ]),
				E('div', { 'id': 'cellmgr-band-status', 'class': 'cellmgr-kvs' }, [
					kv(_('NR'), (lk.nr_locked ? _('已锁定 ') : _('未锁定 ')) + (lk.nr_bands || []).map(b => 'n' + b).join(' ')),
					kv(_('LTE'), (lk.lte_locked ? _('已锁定 ') : _('未锁定 ')) + (lk.lte_bands || []).map(b => 'B' + b).join(' '))
				]),
				E('div', {}, [ E('strong', {}, [ _('5G') ]) ]),
				E('div', { 'class': 'cellmgr-bands' }, mk('nr', lk.available_nr, lk.nr_bands)),
				E('div', {}, [ E('strong', {}, [ _('4G') ]) ]),
				E('div', { 'class': 'cellmgr-bands' }, mk('lte', lk.available_lte, lk.lte_bands)),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleBandApply') }, [ _('应用频段') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleBand', 'current', 'keep') }, [ _('仅当前频段') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleBand', 'unlock', 'unlock') }, [ _('恢复全部') ])
				]),
				E('p', { 'style': 'color:var(--a-dim,#8aa);font-size:12px;margin-top:8px' }, [
					_('应用或仅当前频段会短暂飞行模式并重拨。')
				])
			]);
		}
		else if (bandEl) {
			const st = document.getElementById('cellmgr-band-status');
			if (st)
				dom.content(st, [
					kv(_('NR'), (lk.nr_locked ? _('已锁定 ') : _('未锁定 ')) + (lk.nr_bands || []).map(b => 'n' + b).join(' ')),
					kv(_('LTE'), (lk.lte_locked ? _('已锁定 ') : _('未锁定 ')) + (lk.lte_bands || []).map(b => 'B' + b).join(' '))
				]);
		}
		const cellEl = document.getElementById('cellmgr-cell');
		if (cellEl && !cellEl.hasChildNodes()) {
			dom.content(cellEl, [
				E('h3', {}, [ _('小区锁定 / 测速') ]),
				E('div', { 'id': 'cellmgr-cell-status', 'class': 'cellmgr-kvs' }, [
					kv(_('当前 PCI'), net.pci),
					kv(_('ARFCN'), net.arfcn),
					kv(_('频段'), net.band),
					kv(_('NR 锁'), lk.nr_mode == 2 ? _('小区') : (lk.nr_mode == 1 ? _('频点') : _('未锁小区')))
				]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleCelllock', 'on') }, [ _('锁定当前小区') ]),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleCelllock', 'off') }, [ _('解除小区锁') ]),
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleSpeed') }, [ _('测速') ])
				]),
				E('div', { 'id': 'cellmgr-speed-out', 'style': 'margin-top:8px;color:var(--a-dim,#8aa)' }),
				E('p', { 'style': 'color:var(--a-dim,#8aa);font-size:12px;margin-top:8px' }, [
					_('锁定当前小区会短暂断线；测速走蜂窝口下载约 8MB。')
				])
			]);
		}
		else if (cellEl) {
			const st = document.getElementById('cellmgr-cell-status');
			if (st)
				dom.content(st, [
					kv(_('当前 PCI'), net.pci),
					kv(_('ARFCN'), net.arfcn),
					kv(_('频段'), net.band),
					kv(_('NR 锁'), lk.nr_mode == 2 ? _('小区') : (lk.nr_mode == 1 ? _('频点') : _('未锁小区')))
				]);
		}
		const advEl = document.getElementById('cellmgr-adv');
		if (advEl && !advEl.hasChildNodes()) {
			dom.content(advEl, [
				E('h3', {}, [ _('AT 调试') ]),
				E('div', { 'class': 'cellmgr-actions' }, [
					E('input', { 'id': 'cellmgr-at', 'placeholder': 'AT^HCSQ?', 'style': 'flex:1;min-width:180px' }),
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, 'handleAt') }, [ _('发送') ])
				]),
				E('pre', { 'id': 'cellmgr-at-out', 'style': 'white-space:pre-wrap;min-height:4em;margin-top:10px' }, [ ' ' ])
			]);
		}
	},

	handleSwitch(slot) {
		this.busy = true;
		ui.showModal(_('切换卡槽'), [ E('p', {}, [ _('正在切换到 %s，并重新拨号…').format(slot) ]) ]);
		return callSwitch(slot).then(res => {
			ui.hideModal();
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('切换失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('已切换到 %s').format((res.label || slot)) ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).catch(err => {
			ui.hideModal();
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('切换失败') ]), 'error');
		});
	},

	handleRat(mode) {
		this.busy = true;
		return callRat(mode).then(res => {
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('设置制式失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('制式已更新') ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).catch(err => {
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message ]), 'error');
		});
	},

	handleDial() {
		this.busy = true;
		return callDial().then(res => {
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ res && res.up ? _('蜂窝已拨号') : _('拨号未完成') ]), res && res.up ? 'info' : 'warning');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).finally(() => { this.busy = false; });
	},

	handleHangup() {
		this.busy = true;
		return callHangup().then(() => {
			this.busy = false;
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).finally(() => { this.busy = false; });
	},

	handleScan() {
		this.busy = true;
		ui.showModal(_('扫描运营商'), [ E('p', {}, [ _('正在搜网，可能需要最多一分钟…') ]) ]);
		return callScan().then(res => {
			ui.hideModal();
			this.busy = false;
			const box = document.getElementById('cellmgr-ops');
			if (!box)
				return;
			const ops = (res && res.operators) || [];
			if (!ops.length) {
				dom.content(box, E('p', {}, [ _('没有扫到运营商，或模组正忙。') ]));
				return;
			}
			dom.content(box, E('table', { 'class': 'table' }, [
				E('div', { 'class': 'tr table-titles' }, [
					E('div', { 'class': 'th' }, [ _('运营商') ]),
					E('div', { 'class': 'th' }, [ _('PLMN') ]),
					E('div', { 'class': 'th' }, [ _('制式') ]),
					E('div', { 'class': 'th' }, [ _('操作') ])
				])
			].concat(ops.map(op => E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td' }, [ op.carrier || op.name ]),
				E('div', { 'class': 'td' }, [ op.plmn ]),
				E('div', { 'class': 'td' }, [ op.act_name ]),
				E('div', { 'class': 'td' }, [
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleSelect', op.plmn, String(op.act)) }, [ _('选这个') ])
				])
			])))));
		}).catch(err => {
			ui.hideModal();
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('扫描失败') ]), 'error');
		});
	},

	handleSelect(plmn, act) {
		this.busy = true;
		return callSelect(plmn, act).then(res => {
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && (res.error || res.response)) || _('选择失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('已选择运营商 %s').format(plmn) ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).finally(() => { this.busy = false; });
	},

	handleModemReset() {
		this.busy = true;
		ui.showModal(_('复位模组'), [ E('p', {}, [ _('正在发送 AT^RESET，蜂窝会短暂中断…') ]) ]);
		return callReset().then(res => {
			ui.hideModal();
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('复位失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('已发送复位，约 15 秒后会自动重拨') ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).catch(err => {
			ui.hideModal();
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('复位失败') ]), 'error');
		});
	},

	handleUsageReset() {
		return callUsageReset().then(res => {
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('清零失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('流量统计已清零') ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		});
	},

	handleCfg(key, value) {
		return callSetcfg(key, value).then(res => {
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('设置失败') ]), 'error');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		});
	},

	handleCloudIdent() {
		const id = (document.getElementById('cellmgr-cloud-id') || {}).value || '';
		const code = (document.getElementById('cellmgr-cloud-code') || {}).value || '';
		return callSetcfg('cloud_id', id).then(res => {
			if (!res || res.ok === false) {
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('保存失败') ]), 'error');
				return res;
			}
			return callSetcfg('cloud_code', code);
		}).then(res => {
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('保存失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('设备身份已保存，开关打开后生效') ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		});
	},

	handleSmsSend() {
		const number = (document.getElementById('cellmgr-sms-num') || {}).value || '';
		const text = (document.getElementById('cellmgr-sms-text') || {}).value || '';
		if (!number || !text) {
			ui.addNotification(null, E('p', {}, [ _('请填写号码和内容') ]), 'warning');
			return;
		}
		this.busy = true;
		return callSmsSend(number, text).then(res => {
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('发送失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('短信已发送') ]), 'info');
		}).catch(err => {
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('发送失败') ]), 'error');
		});
	},

	handleSmsList() {
		this.busy = true;
		return callSms().then(res => {
			this.busy = false;
			const box = document.getElementById('cellmgr-sms-list');
			if (!box)
				return;
			const msgs = (res && res.messages) || [];
			if (!msgs.length) {
				dom.content(box, E('p', {}, [ (res && res.error) || _('收件箱为空') ]));
				return;
			}
			dom.content(box, msgs.map(m => E('div', { 'style': 'padding:8px 0;border-bottom:1px solid var(--a-line-soft,rgba(6,222,107,.12))' }, [
				E('div', { 'style': 'color:var(--a-muted,#6ce6aa);font-size:12px' }, [
					'%s  %s'.format(dash(m.from), dash(m.time || m.date))
				]),
				E('div', {}, [ m.text || '' ])
			])));
		}).catch(err => {
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('读取失败') ]), 'error');
		});
	},

	handleAt() {
		const cmd = ((document.getElementById('cellmgr-at') || {}).value || '').trim();
		if (!cmd) {
			ui.addNotification(null, E('p', {}, [ _('请输入 AT 命令') ]), 'warning');
			return;
		}
		this.busy = true;
		return callAt(cmd).then(res => {
			this.busy = false;
			const out = document.getElementById('cellmgr-at-out');
			if (out)
				out.textContent = (res && (res.response || res.error)) || JSON.stringify(res || {}, null, 2);
		}).catch(err => {
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('AT 失败') ]), 'error');
		});
	},

	readApnArgs(redial) {
		return [
			(document.getElementById('cellmgr-apn-name') || {}).value || '',
			(document.getElementById('cellmgr-apn-pdp') || {}).value || 'IPV4V6',
			(document.getElementById('cellmgr-apn-auth') || {}).value || '0',
			(document.getElementById('cellmgr-apn-user') || {}).value || '',
			(document.getElementById('cellmgr-apn-pass') || {}).value || '',
			redial
		];
	},

	handleApnPreset(name) {
		const inp = document.getElementById('cellmgr-apn-name');
		if (inp)
			inp.value = name;
	},

	handleApn(redial) {
		const args = this.readApnArgs(redial);
		if (redial === '1') {
			this.busy = true;
			ui.showModal(_('保存 APN'), [ E('p', {}, [ _('正在写入 APN 并重新拨号…') ]) ]);
		}
		return callApn.apply(null, args).then(res => {
			ui.hideModal();
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('APN 设置失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ redial === '1' ? _('APN 已保存并重拨') : _('APN 已保存') ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).catch(err => {
			ui.hideModal();
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('APN 设置失败') ]), 'error');
		});
	},

	selectedBands(cls) {
		return Array.prototype.map.call(document.querySelectorAll('input.' + cls + ':checked'), el => el.value).join(',');
	},

	handleBandApply() {
		const nr = this.selectedBands('cellmgr-nr-band') || 'unlock';
		const lte = this.selectedBands('cellmgr-lte-band') || 'unlock';
		return this.handleBand(nr, lte);
	},

	handleBand(nr, lte) {
		this.busy = true;
		ui.showModal(_('频段锁定'), [ E('p', {}, [ _('可能进入飞行模式并重拨，请稍候…') ]) ]);
		return callBand(nr, lte).then(res => {
			ui.hideModal();
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && (res.error || (res.nr && res.nr.response) || (res.lte && res.lte.response))) || _('频段设置失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('频段设置已提交') ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).catch(err => {
			ui.hideModal();
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('频段设置失败') ]), 'error');
		});
	},

	handleCelllock(action) {
		this.busy = true;
		ui.showModal(_('小区锁定'), [ E('p', {}, [ action === 'on' ? _('正在锁定当前小区…') : _('正在解除小区锁…') ]) ]);
		return callCelllock(action, '', '', '', '').then(res => {
			ui.hideModal();
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && (res.error || res.response)) || _('小区锁定失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ action === 'on' ? _('已请求锁定当前小区') : _('已解除小区锁') ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).catch(err => {
			ui.hideModal();
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('小区锁定失败') ]), 'error');
		});
	},

	handlePin(action) {
		const pin = (document.getElementById('cellmgr-pin-val') || {}).value || '';
		const puk = (document.getElementById('cellmgr-puk-val') || {}).value || '';
		const newpin = (document.getElementById('cellmgr-pin-new') || {}).value || '';
		this.busy = true;
		return callPin(action, pin, puk, newpin).then(res => {
			this.busy = false;
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && (res.error || res.response)) || _('PIN 操作失败') ]), 'error');
			else
				ui.addNotification(null, E('p', {}, [ _('PIN 操作完成') ]), 'info');
			return L.resolveDefault(callStatus(), {}).then(L.bind(this.update, this));
		}).catch(err => {
			this.busy = false;
			ui.addNotification(null, E('p', {}, [ err.message || _('PIN 操作失败') ]), 'error');
		});
	},

	handleSpeed() {
		this.busy = true;
		const out = document.getElementById('cellmgr-speed-out');
		if (out)
			out.textContent = _('正在通过蜂窝口下载测速…');
		return callSpeed().then(res => {
			this.busy = false;
			if (out) {
				if (!res || res.ok === false)
					out.textContent = (res && res.error) || _('测速失败');
				else
					out.textContent = _('下载 %s Mbps · 用时 %s s · %s').format(
						res.download_mbps, res.seconds, fmtBytes(res.rx_bytes));
			}
			if (!res || res.ok === false)
				ui.addNotification(null, E('p', {}, [ (res && res.error) || _('测速失败') ]), 'error');
		}).catch(err => {
			this.busy = false;
			if (out)
				out.textContent = err.message || _('测速失败');
		});
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
