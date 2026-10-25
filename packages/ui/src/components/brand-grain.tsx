import avif from "../assets/brand/texture.avif";
import jpeg from "../assets/brand/texture.jpg";

/** Native format selection with Next's hashed, zone-aware static URLs.
 * No runtime image conversion. Keep both URLs explicit: Turbopack's CSS
 * image-set rewriting does not preserve them through the current minifier.
 */
export function BrandGrain() {
  return (
    <picture>
      <source type="image/avif" srcSet={avif.src} />
      <img
        src={jpeg.src}
        alt=""
        width={jpeg.width}
        height={jpeg.height}
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
    </picture>
  );
}
