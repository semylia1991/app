/**
 * Fetches a product image from Open Beauty Facts (free, no API key).
 * Returns the image URL or null if nothing found.
 */
export async function fetchProductImage(name: string, brand: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${brand} ${name}`.trim());
    const url =
      `https://world.openbeautyfacts.org/cgi/search.pl` +
      `?search_terms=${query}&search_simple=1&action=process&json=1&page_size=5`;
 
    const res = await fetch(url);
    if (!res.ok) return null;
 
    const data = await res.json();
    const products: any[] = data.products ?? [];
 
    for (const p of products) {
      const img: string | undefined =
        p.image_front_small_url ||
        p.image_front_url ||
        p.image_small_url ||
        p.image_url;
      if (img) return img;
    }
    return null;
  } catch {
    return null;
  }
}
