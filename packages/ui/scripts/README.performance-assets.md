The checked-in assets keep normal builds offline and eliminate cold image
conversions for decorative media. Originals remain available at existing URLs.
Next hashes the imported picture/CSS assets and serves them as immutable files on both
Vercel and Composer. The AVIF grain has a JPEG fallback; artwork keeps its
existing dimensions, layout, crop and animation.

Regenerate images with the workspace installed:

```sh
node packages/ui/scripts/generate-brand-media.mjs
```

The encoder is the Sharp version pinned by Next in the lockfile. The manifest
records source/output SHA-256 digests, encoder version, dimensions and quality.

Regenerate Inter subsets with Python and `fonttools[woff]==4.60.2` installed:

```sh
python packages/eclipse/scripts/subset-inter.py
```

The generator verifies every original Unicode point remains represented, checks
variable axes and advance widths, and retains OpenType features and font/license
metadata. Unicode-range CSS selects Latin, extended Latin, Greek, Cyrillic or
symbol files as needed. Combining glyphs remain in each binary for shaping.
The original full font files and package font exports are retained. Old Next
release chunks still require the deployment retention described in the CDN
findings.

After regeneration, run the Composer build/smoke, app tests/type checks and
browser checks for non-Latin/italic text, image fallbacks, viewport-triggered
video, reduced motion and initial resource budgets.
