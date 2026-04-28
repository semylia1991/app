/**
 * services/productCache.ts
 *
 * Клиентский слой кэширования: проверяет Supabase product_cache до того,
 * как обращаться к Gemini за полным анализом. Если продукт уже сосканирован
 * любым другим юзером — возвращаем результат мгновенно.
 *
 * personalNote НЕ кэшируется — он зависит от профиля пользователя и должен
 * генериться отдельно (один раз) после получения результата из кэша.
 */

import { supabase } from '../lib/supabase';
import type { AnalysisResult } from './ai';

/**
 * Нормализуем product+brand+lang в стабильный ключ.
 *  - lowercase, trim
 *  - схлопываем множественные пробелы
 *  - убираем небуквенные символы по краям
 */
export function buildCacheKey(productName: string, brand: string, lang: string): string {
  const norm = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/^[^\w]+|[^\w]+$/g, '');
  return `${norm(brand)}|${norm(productName)}|${lang}`;
}

/**
 * Достаём из кэша если есть. Возвращаем `null` если нет (или произошла ошибка).
 * Никогда не кидаем — кэш не должен ломать основной поток.
 */
export async function getCachedAnalysis(
  productName: string,
  brand: string,
  lang: string,
): Promise<AnalysisResult | null> {
  if (!productName || !brand) return null;
  const cacheKey = buildCacheKey(productName, brand, lang);

  try {
    const { data, error } = await supabase
      .from('product_cache')
      .select('result')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;

    // Атомарно увеличиваем hit_count (через RPC, fire-and-forget)
    supabase.rpc('cache_hit', { p_cache_key: cacheKey }).then(
      () => {},
      (e: unknown) => console.warn('[cache] cache_hit failed:', e),
    );

    console.log('[cache] HIT:', cacheKey);
    return data.result as AnalysisResult;
  } catch (e) {
    console.warn('[cache] read error:', e);
    return null;
  }
}

/**
 * Сохраняем в кэш. personalNote и shopLinks вырезаем — они не должны попадать
 * в общий кэш (personalNote зависит от профиля, shopLinks строятся клиентом).
 */
export async function saveToCache(
  productName: string,
  brand: string,
  lang: string,
  result: AnalysisResult,
): Promise<void> {
  if (!productName || !brand) return;
  const cacheKey = buildCacheKey(productName, brand, lang);

  // Стрипаем личное и динамическое
  const { personalNote, shopLinks, ...cacheable } = result;
  void personalNote; void shopLinks;

  try {
    const { error } = await supabase.rpc('cache_product', {
      p_cache_key: cacheKey,
      p_product_name: productName,
      p_brand: brand,
      p_lang: lang,
      p_result: cacheable,
    });
    if (error) console.warn('[cache] write error:', error.message);
    else console.log('[cache] SAVED:', cacheKey);
  } catch (e) {
    console.warn('[cache] write exception:', e);
  }
}
