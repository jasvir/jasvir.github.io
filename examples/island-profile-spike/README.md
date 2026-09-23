# Around the islands

A small collection of security notes, programming-language experiments, and ideas
worth following. Pick a view below, or [explore the full island](https://jasvir.github.io/).

<details name="island-profile-view" open>
  <summary>🗺️ Around the islands</summary>
  <p align="right">
    <a href="https://jasvir.github.io/">
      <img src="./island.svg?v=2#overview" width="600" alt="A rotating view of Jasvir's Fiji-inspired island portfolio">
    </a>
  </p>
</details>

<details name="island-profile-view">
  <summary>📚 At the library · SecretSeal</summary>
  <p align="right">
    <a href="https://jasvir.github.io/#project-secretseal">
      <img src="./island.svg?v=2#library" width="600" alt="A camera moving toward the library on Jasvir's island">
    </a>
  </p>
  <p>Where can a secret travel in an HTTP request without quietly becoming durable?</p>
  <p><a href="https://jasvir.github.io/secretseal/">Read SecretSeal</a> · <a href="https://github.com/jasvir/secretseal">GitHub</a></p>
</details>

---

This is an export experiment, not the live profile. The island is rendered from
the existing website scene; the embedded SVG runs CSS animation with no JavaScript.
It supports the viewer's reduced-motion preference. Scene time is frozen in this
first prototype, so the camera moves while the train, boat, and people hold still.

To rebuild: run `node examples/island-profile-spike/serve.mjs`, open the printed
local address, and press **Capture both views**. The capture tool imports the same
scene factory and camera presets as the website; it does not rewrite its source.
Generated dimensions and sizes are recorded
in `manifest.json`. The full-site links are destinations for the planned rollout;
the website migration and shared-source refactor are prepared on review branches,
but live deployment has not been switched.

See [the test findings](FINDINGS.md) for compatibility, file size, and limitations.
