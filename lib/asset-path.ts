/**
 * Trợ thủ chuẩn hóa đường dẫn tài nguyên tĩnh trên GitHub Pages và Localhost
 */
export function getAssetUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  if (!path) return '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (basePath && cleanPath.startsWith(basePath)) {
    return cleanPath;
  }
  return `${basePath}${cleanPath}`;
}

