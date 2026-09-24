# Prometeo Mobile release discipline

A debug APK is a verification artifact, not an official install.

Before the first official install, provision one stable Android signing identity and keep it outside the repository. GitHub Actions expects these protected secrets:

- `PROMETEO_ANDROID_KEYSTORE_B64`
- `PROMETEO_ANDROID_STORE_PASSWORD`
- `PROMETEO_ANDROID_KEY_ALIAS`
- `PROMETEO_ANDROID_KEY_PASSWORD`

The release workflow runs tests and lint, builds the minified release, verifies the signing certificate with `apksigner`, publishes the SHA-256 digest and creates an immutable GitHub Release.

The server-side `prometeo_mobile_release_channels` row is updated only after a signed release exists. It carries the minimum/recommended version and update URL. The client never receives permission to silently install arbitrary APKs; it opens only allow-listed GitHub or Google Play HTTPS destinations and Android enforces signing continuity.

If distribution later moves to Google Play, keep the same application ID and establish Play App Signing deliberately before changing the release channel.
