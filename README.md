# OTelBin for air-gapped environments

An independently maintained fork of [Dash0's OTelBin](https://github.com/dash0hq/otelbin) for networks without internet access at runtime. Maintained by [Amine Amanzou](https://github.com/amineamanzou). For official OTelBin documentation and support, see the [upstream repository](https://github.com/dash0hq/otelbin) and its [issue tracker](https://github.com/dash0hq/otelbin/issues).

Edit Collector YAML, visualize its pipelines, and validate it against an installed OpenTelemetry Collector distribution and release. The browser editor and its local schema work with bundled assets. Distribution-specific validation runs the selected Collector executable on the same instance.

## Docker

Prepare the images on a build host with access to the dependencies.

```sh
docker compose build
docker compose pull gateway
```

Start with the prepared images.

```sh
docker compose up -d --no-build --pull never
```

Open [http://localhost:3180](http://localhost:3180). Under **Validation**, pick a distribution and release, then click **Validate against this version**. **Browser-only** uses the bundled editor schema and checks pipeline references without calling the server-side validator.

## Bundled Collectors

The Linux image includes OpenTelemetry Collector **Core, Contrib, and Kubernetes**, each at releases **0.134.1** and **0.160.0**. The picker lists the binaries installed in the instance. Native macOS builds offer Core and Contrib. The [catalog](packages/otelbin/src/lib/collector-catalog.json) pins the release assets and SHA-256 checksums for `arm64` and `amd64`. To add a release or another distribution, update the catalog with the archive metadata and a binary that supports `validate`.

The picker shows the publication tag. The Contrib binary shipped in the `0.134.1` archive reports `0.134.0` with `--version`.

## Build dependencies

- Node 22 base image and an unprivileged Nginx image. Set `NODE_IMAGE` and `PROXY_IMAGE` to use an internal registry.
- npm packages. Set `NPM_REGISTRY` to use an internal npm mirror.
- [Collector release archives](https://github.com/open-telemetry/opentelemetry-collector-releases/releases). Set `COLLECTOR_RELEASES_URL` to use a mirror that preserves the `vVERSION/NAME_VERSION_linux_ARCH.tar.gz` layout and archive contents.

## Runtime behavior

Compose places the app and validator on an internal Docker network. Nginx publishes the UI on the host loopback only and proxies requests to the app. The page serves its editor assets and API from the same origin. The editor schema compiles at build time, and the browser policy restricts connections to the local origin. The share link carries the YAML in its URL fragment. Handle it like the YAML it contains.

The validator creates a temporary file per request and cleans it up after validation. It supports environment values provided in the editor and defaults in the YAML. It restricts configuration inputs to the submitted YAML and rejects external configuration providers. Use placeholder values for variables that normally hold secrets.

## Native development on macOS

Run from `packages/otelbin` with Node 22.

```sh
npm ci
npm run collectors:install
npm run build
npm start
```

The app listens on [http://localhost:3180](http://localhost:3180).

## License

[Apache 2.0](LICENSE). OTelBin is originally developed by [Dash0](https://github.com/dash0hq).
