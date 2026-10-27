#!/usr/bin/env bash
# Pack an architecture-independent OpenWrt IPK from this tree.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_NAME="luci-app-cellmgr"
ARCH="all"
PKG_RELEASE="${PKG_RELEASE:-1}"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
	echo "Invalid VERSION: '$VERSION' (want x.y.z)" >&2
	exit 1
}
PKG_VER="${VERSION}-${PKG_RELEASE}"
OUT_DIR="${ROOT}/dist"
IPK_NAME="${PKG_NAME}-v${VERSION}-${ARCH}.ipk"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

DATA="$STAGING/data"
CTRL="$STAGING/control"
mkdir -p "$DATA" "$CTRL" "$OUT_DIR"

rsync -a --exclude '__pycache__' --exclude '*.pyc' --exclude '*.pyo' \
	--exclude '.DS_Store' --exclude '._*' \
	"$ROOT/root/" "$DATA/"
mkdir -p "$DATA/www"
rsync -a --exclude '.DS_Store' --exclude '._*' "$ROOT/htdocs/" "$DATA/www/"

chmod 755 \
	"$DATA/usr/sbin/cellmgr" \
	"$DATA/usr/sbin/cellmgr-watch" \
	"$DATA/usr/sbin/cellmgr-cloud" \
	"$DATA/etc/init.d/cellmgr" \
	"$DATA/etc/uci-defaults/80-luci-app-cellmgr"

if du -sb "$DATA" >/dev/null 2>&1; then
	INSTALLED_SIZE="$(du -sb "$DATA" | awk '{print $1}')"
else
	INSTALLED_SIZE="$(du -sk "$DATA" | awk '{print $1 * 1024}')"
fi

cat > "$CTRL/control" <<EOF
Package: ${PKG_NAME}
Version: ${PKG_VER}
Depends: luci-base
Source: https://github.com/itworksig/luci-app-cellmgr
SourceName: ${PKG_NAME}
License: MIT
Section: luci
Architecture: ${ARCH}
Installed-Size: ${INSTALLED_SIZE}
Description: C2000-MAX cellular / eSIM manager for TD Tech MT5700.
EOF

printf '%s\n' '/etc/config/cellmgr' > "$CTRL/conffiles"

cat > "$CTRL/postinst" <<'EOF'
#!/bin/sh
[ -n "${IPKG_INSTROOT}" ] && exit 0
[ -f /etc/uci-defaults/80-luci-app-cellmgr ] && {
	sh /etc/uci-defaults/80-luci-app-cellmgr
	rm -f /etc/uci-defaults/80-luci-app-cellmgr
}
[ -x /etc/init.d/cellmgr ] && /etc/init.d/cellmgr enable
[ -x /etc/init.d/cellmgr ] && /etc/init.d/cellmgr restart
/etc/init.d/rpcd restart >/dev/null 2>&1 || true
exit 0
EOF

cat > "$CTRL/prerm" <<'EOF'
#!/bin/sh
[ -n "${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/cellmgr stop >/dev/null 2>&1 || true
/etc/init.d/cellmgr disable >/dev/null 2>&1 || true
exit 0
EOF

chmod 755 "$CTRL/postinst" "$CTRL/prerm"

tar_gz() {
	local out="$1"
	shift
	if tar --version 2>&1 | grep -qi 'gnu tar'; then
		tar --format=gnu --sort=name --numeric-owner --owner=0 --group=0 \
			--mtime='UTC 1970-01-01' -czf "$out" "$@"
	else
		COPYFILE_DISABLE=1 tar --numeric-owner -czf "$out" "$@"
	fi
}

(
	cd "$DATA"
	tar_gz "$STAGING/data.tar.gz" .
)
(
	cd "$CTRL"
	tar_gz "$STAGING/control.tar.gz" .
)
printf '2.0\n' > "$STAGING/debian-binary"

# OpenWrt IPK is a gzipped tar of debian-binary + control + data (not ar).
(
	cd "$STAGING"
	tar_gz "$OUT_DIR/$IPK_NAME" ./debian-binary ./data.tar.gz ./control.tar.gz
)

echo "$OUT_DIR/$IPK_NAME"
ls -l "$OUT_DIR/$IPK_NAME"
