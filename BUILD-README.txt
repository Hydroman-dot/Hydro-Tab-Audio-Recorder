Hydro v0.2.1 build / reviewer notes

No compilation or dependency installation is required. The first-party JavaScript is readable source.
The extension/lame.min.js file is byte-identical to the published npm lamejs 1.2.1 distribution; vendor/lamejs-1.2.1 contains that complete upstream package, including src, lame.all.js and upstream build scripts. The library has not been modified.
To reproduce the extension contents, ZIP all files INSIDE extension/ (manifest.json must be at archive root), then rename .zip to .xpi. Do not package the enclosing extension folder or vendor folder into the XPI. ZIP timestamps/compression may differ.

Test using a normal HTTP(S) page with an audio/video element: click the toolbar icon, Start in 3 s, play audio, then Stop & MP3. Encoding is local; no telemetry or remote code.
Changes from v0.1.1: version/description and no-data-collection metadata, bundled verified encoder, updated missing-encoder messages and documentation. Existing Gecko ID and recording logic preserved.
