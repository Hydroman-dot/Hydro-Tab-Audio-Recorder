# Hydro Tab Audio Recorder – Firefox v0.2.1

Die Datei `Hydro-Tab-Audio-Recorder-Firefox-v0.2.1-unsigned.xpi` ist für die Mozilla-Signierung vorbereitet, aber noch nicht signiert. Erst die von Mozilla zurückgelieferte XPI lässt sich dauerhaft im normalen Firefox installieren.

## Bei Mozilla signieren lassen
1. https://addons.mozilla.org/de/developers/ öffnen und mit deinem Mozilla-Konto anmelden.
2. Ein neues Add-on einreichen. Als Verteilung **„On your own“ / selbst verteilen (Unlisted)** auswählen. Dadurch entsteht kein öffentlicher Store-Eintrag.
3. Die `...-unsigned.xpi` hochladen und Firefox Desktop als Ziel wählen. Die automatische Prüfung abwarten und etwaige Meldungen bearbeiten.
4. Falls Quellcode angefordert wird, das beiliegende `...-Quellcode.zip` hochladen. Es enthält auch die Originalquellen des minifizierten MP3-Encoders und BUILD-README.txt mit den Paketierungsschritten.
5. Einreichung abschließen. Nach Freigabe/Signierung unter deinen Add-ons die Version 0.2.1 öffnen und die **signierte XPI** herunterladen. Eine zusätzliche manuelle Prüfung durch Mozilla ist möglich.

## Dauerhaft installieren
1. Gegebenenfalls die temporäre alte Version unter `about:debugging` entfernen.
2. In Firefox `about:addons` öffnen → Zahnrad → **Add-on aus Datei installieren…**.
3. Die von Mozilla heruntergeladene signierte XPI auswählen und die Installation bestätigen.
4. Sie bleibt nach einem Firefox-Neustart installiert. Dieselbe signierte Datei kannst du deinem Freund geben. Die signierte Datei nicht nachträglich verändern.

## Aufnahme
Webseite öffnen → Add-on-Symbol anklicken → Dateiname und Bitrate wählen → **Start in 3 s** → während des Countdowns auf der Seite Play drücken → **Stop & MP3**.
128, 192, 256 oder 320 kbit/s sind verfügbar; Standard ist 256 kbit/s. Der Encoder ist bereits eingebaut: kein VORBEREITEN.bat, kein zusätzlicher Download und keine about:config-Änderung erforderlich.
Den Tab während der Aufnahme nicht schließen oder neu laden. Erfasst wird ein HTML-Audio-/Videoelement im Hauptdokument, nicht beliebiger Systemton. WebAudio, eingebettete Frames, DRM, Cross-Origin-Schutz und geschützte Firefox-Seiten können die Aufnahme verhindern. Nur Inhalte aufnehmen, für die du die Erlaubnis hast.

## Datenschutz und Updates
Die Erweiterung überträgt keine Aufnahmen oder sonstigen Daten an Server. Die Verarbeitung erfolgt im Browser; die MP3 wird lokal gespeichert. `activeTab` und `scripting` erlauben das Einblenden des Recorders nach einem Klick. Keine zusätzlichen Host-Berechtigungen.
Die bestehende ID `hydro-tab-audio-recorder@local` bleibt stabil. Manifest V3, Firefox Desktop ab 140. Für Updates dieselbe ID verwenden, Versionsnummer erhöhen und bei Mozilla als neue Version desselben Add-ons signieren lassen. Ohne eigenen Update-Server erfolgen Updates manuell durch Installation der neu signierten XPI.

Offizielle Anleitung: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
