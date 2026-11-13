'use client';

// ============================================================================
// BỘ TIỆN ÍCH NÉN ẢNH THÔNG MINH PHÍA CLIENT (SMART IMAGE COMPRESSOR)
// Tự động tối ưu dung lượng ảnh chụp bài tập của học sinh từ 3-6MB xuống ~300-600KB
// Giữ nguyên độ sắc nét từng nét chữ viết tay, công thức và bảng biểu
// Tăng tốc độ nộp bài lên Google Drive Online gấp 5-10 lần, tiết kiệm băng thông 4G/Wifi
// ============================================================================

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (mặc định 0.8)
  mimeType?: 'image/jpeg' | 'image/webp';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  reductionPercent: number;
  dataUrl: string;
  width: number;
  height: number;
  isCompressed: boolean;
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Nén ảnh thông minh phía Client bằng HTML5 Canvas
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  const originalSize = file.size;

  // Nếu không phải định dạng ảnh, giữ nguyên tệp gốc
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name);
  if (!isImage || typeof window === 'undefined') {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savedBytes: 0,
      reductionPercent: 0,
      dataUrl: '',
      width: 0,
      height: 0,
      isCompressed: false,
    };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Tính tỉ lệ co giãn kích thước
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // Tạo Canvas để render và nén
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback nếu không có context 2D
        resolve({
          file,
          originalSize,
          compressedSize: originalSize,
          savedBytes: 0,
          reductionPercent: 0,
          dataUrl: '',
          width,
          height,
          isCompressed: false,
        });
        return;
      }

      // Nền trắng cho ảnh JPG (tránh bị đen nếu PNG có nền trong suốt)
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      // Làm mượt hình ảnh khi scale
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Chuyển sang Blob và DataUrl
      const dataUrl = canvas.toDataURL(mimeType, quality);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              file,
              originalSize,
              compressedSize: originalSize,
              savedBytes: 0,
              reductionPercent: 0,
              dataUrl,
              width,
              height,
              isCompressed: false,
            });
            return;
          }

          const compressedSize = blob.size;

          // Nếu ảnh nén thực sự nhỏ hơn tệp gốc
          if (compressedSize < originalSize) {
            const savedBytes = originalSize - compressedSize;
            const reductionPercent = Math.round((savedBytes / originalSize) * 100);

            // Đổi đuôi tệp thành .jpg
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newFileName = `${baseName}_compressed.jpg`;
            const compressedFile = new File([blob], newFileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              savedBytes,
              reductionPercent,
              dataUrl,
              width,
              height,
              isCompressed: true,
            });
          } else {
            // Tệp gốc đã rất nhỏ rồi, không cần nén thêm
            resolve({
              file,
              originalSize,
              compressedSize: originalSize,
              savedBytes: 0,
              reductionPercent: 0,
              dataUrl,
              width,
              height,
              isCompressed: false,
            });
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        originalSize,
        compressedSize: originalSize,
        savedBytes: 0,
        reductionPercent: 0,
        dataUrl: '',
        width: 0,
        height: 0,
        isCompressed: false,
      });
    };

    img.src = objectUrl;
  });
}
