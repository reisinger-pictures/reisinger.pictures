#!/usr/bin/env bash
# =============================================================================
# sync.sh — reisinger.pictures via rsync/ssh auf root@reisinger.pictures
# =============================================================================
#
# Ersetzt die frühere rclone-SFTP-Variante (Remote "reisinger.pictures").
# Hintergrund und Migrations-Reihenfolge: strato-vps/README.md
#
# Aufruf:
#   ./sync.sh              echter Deploy
#   ./sync.sh --dry-run    nur anzeigen, nichts aendern (empfohlen zuerst)
#
# Warum rsync und nicht scp: rclone sync war ein MIRROR (inkl. Loeschen). Der
# Build erzeugt content-hashed Assets, jeder Deploy muss den alten Hash
# entfernen — scp -r hat kein --delete und wuerde die Dateien liegen lassen.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

# --- GNU-rsync-Pflicht -------------------------------------------------------
# macOS liefert per Default /usr/bin/rsync = openrsync (Protokoll 29), das weder
# --chown noch --chmod im benoetigten Umfang unterstuetzt.
# WICHTIG: nicht per `rsync --version | grep -q ...` pruefen. Unter `set -o
# pipefail` beendet `grep -q` den Upstream vorzeitig per SIGPIPE, die Pipeline
# gilt dann als fehlgeschlagen und der Guard schlaegt IMMER an. Deshalb die
# Ausgabe zuerst in eine Variable ziehen.
RSYNC_BIN="${RSYNC_BIN:-$(command -v rsync || true)}"
_rsync_version="$("$RSYNC_BIN" --version 2>/dev/null | head -1 || true)"
if [[ "$_rsync_version" != "rsync  version"* ]]; then
  echo "FEHLER: GNU-rsync benoetigt (macOS-Default ist openrsync)." >&2
  echo "       Install:  brew install rsync" >&2
  echo "       Oder:     RSYNC_BIN=/opt/homebrew/bin/rsync ./sync.sh" >&2
  exit 1
fi
unset _rsync_version

# --- Konfiguration ----------------------------------------------------------
# Achtung: der SFTP-Chroot ist weg, daher die vollen Pfade.
SITES="/home/webadmin/websites"
IMAGES_DEST="root@reisinger.pictures:${SITES}/images.reisinger.pictures/"
DIST_DEST="root@reisinger.pictures:${SITES}/reisinger.pictures/"

# Connection-Reuse: bei 13.358 Bilddateien sonst ein SSH-Handshake pro Datei.
SSH_OPTS="-o ControlMaster=auto -o ControlPath=/tmp/ssh-sync-%r@%h:%p -o ControlPersist=60"

# --chown/--chmod: Rechte-Modell der Sites ist 1002:webgroup, Dateien 666,
# Verzeichnisse 2777 (setgid). Ein reines -a wuerde die LOKALEN Rechte des
# Build-Outputs (644/755) durchdruecken und das Modell zerstoeren.
# D2777 = Verzeichnisse rwxrwsrwx, F666 = Dateien rw-rw-rw-.

# Argumente durchreichen, damit ./sync.sh --dry-run funktioniert.
RSYNC_EXTRA=("$@")

# --- 1. Bild-CDN ------------------------------------------------------------
echo "Synchronisiere .imagedist (Bild-CDN) via rsync/ssh..."
"$RSYNC_BIN" .imagedist/ "$IMAGES_DEST" \
  --archive \
  --delete \
  --chown=1002:webgroup \
  --chmod=D2777,F666 \
  --info=progress2 \
  --rsh="ssh $SSH_OPTS" \
  "${RSYNC_EXTRA[@]}"

# --- 2. Website -------------------------------------------------------------
echo "Synchronisiere reisinger.pictures via rsync/ssh..."
"$RSYNC_BIN" dist/ "$DIST_DEST" \
  --archive \
  --delete \
  --chown=1002:webgroup \
  --chmod=D2777,F666 \
  --info=progress2 \
  --rsh="ssh $SSH_OPTS" \
  "${RSYNC_EXTRA[@]}"

echo "Upload fuer reisinger.pictures erfolgreich abgeschlossen!"
