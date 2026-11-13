'use client';

import { compressImageFile } from './image-compressor';
import { getActiveTenantContext } from './auth';

export interface DriveUploadResult {
  status: 'ok' | 'error' | 'skipped';
  fileUrl?: string;
  downloadUrl?: string;
  fileId?: string;
  folderPath?: string;
  message: string;
}

const DEFAULT_GAS_URL = process.env.NEXT_PUBLIC_GAS_WEB_APP_URL || '';

function gasKey(tenantId: string): string {
  return `thso_gas_url:${tenantId}`;
}

export function getGasWebAppUrl(tenantId?: string): string {
  if (typeof window === 'undefined') return DEFAULT_GAS_URL;
  const tId = tenantId || getActiveTenantContext().tenantId;
  return localStorage.getItem(gasKey(tId)) || DEFAULT_GAS_URL;
}

export function setGasWebAppUrl(url: string, tenantId?: string): void {
  if (typeof window === 'undefined') return;
  const tId = tenantId || getActiveTenantContext().tenantId;
  localStorage.setItem(gasKey(tId), url.trim());
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

async function maybeCompressImage(file: File): Promise<File> {
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name)) {
    try {
      const comp = await compressImageFile(file, {
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.78,
        mimeType: 'image/webp',
      });
      if (comp.isCompressed) return comp.file;
    } catch {
      // Keep original file if canvas compression fails
    }
  }
  return file;
}

export async function uploadHomeworkToDriveOnline(params: {
  file: File;
  grade: number;
  period: number;
  className: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  note?: string;
  tenantId?: string;
}): Promise<DriveUploadResult> {
  const ctx = getActiveTenantContext();
  const tenantId = params.tenantId || ctx.tenantId;
  const gasUrl = getGasWebAppUrl(tenantId);

  if (!gasUrl || !gasUrl.startsWith('http')) {
    return {
      status: 'skipped',
      message: 'Lưu thành công vào CSDL cục bộ IndexedDB (chưa gắn Google Apps Script Drive).',
    };
  }

  try {
    const prepared = await maybeCompressImage(params.file);
    const fileBase64 = await fileToBase64(prepared);
    const ext = prepared.name.split('.').pop() || 'dat';
    const cleanName = params.studentName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_');

    const standardizedFileName = `${tenantId}_${params.className}_${params.studentId}_${cleanName}_Tiet${String(
      params.period
    ).padStart(2, '0')}_BTVN.${ext}`;

    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'uploadHomeworkFile',
        tenantId,
        schoolName: ctx.tenantName,
        grade: params.grade,
        period: params.period,
        className: params.className,
        studentId: params.studentId,
        studentName: params.studentName,
        assignmentTitle: params.assignmentTitle,
        fileName: prepared.name,
        standardizedFileName,
        base64Data: fileBase64,
        mimeType: prepared.type || 'application/octet-stream',
        note: params.note || '',
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === 'ok') {
      return {
        status: 'ok',
        fileUrl: data.fileUrl,
        downloadUrl: data.downloadUrl,
        fileId: data.fileId,
        folderPath: data.folderPath,
        message: 'Đã lưu lên Google Drive thành công.',
      };
    }
    return { status: 'error', message: data.message || 'Lỗi lưu Drive' };
  } catch (err: any) {
    return { status: 'error', message: `Lỗi kết nối Drive: ${err.message}` };
  }
}

export async function uploadPracticalToDriveOnline(params: {
  file: File;
  grade: number;
  period: number;
  className: string;
  studentId: string;
  studentName: string;
  taskTitle: string;
  tenantId?: string;
}): Promise<DriveUploadResult> {
  const ctx = getActiveTenantContext();
  const tenantId = params.tenantId || ctx.tenantId;
  const gasUrl = getGasWebAppUrl(tenantId);

  if (!gasUrl || !gasUrl.startsWith('http')) {
    return {
      status: 'skipped',
      message: 'Đã lưu vào CSDL cục bộ IndexedDB (chưa gắn Google Apps Script Drive).',
    };
  }

  try {
    const prepared = await maybeCompressImage(params.file);
    const fileBase64 = await fileToBase64(prepared);
    const ext = prepared.name.split('.').pop() || 'dat';
    const cleanName = params.studentName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_');

    const standardizedFileName = `${tenantId}_${params.className}_${params.studentId}_${cleanName}_Tiet${String(
      params.period
    ).padStart(2, '0')}_ThucHanh.${ext}`;

    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'uploadPracticalFile',
        tenantId,
        schoolName: ctx.tenantName,
        grade: params.grade,
        period: params.period,
        className: params.className,
        studentId: params.studentId,
        studentName: params.studentName,
        taskTitle: params.taskTitle,
        fileName: prepared.name,
        standardizedFileName,
        base64Data: fileBase64,
        mimeType: prepared.type || 'application/octet-stream',
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === 'ok') {
      return {
        status: 'ok',
        fileUrl: data.fileUrl,
        downloadUrl: data.downloadUrl,
        fileId: data.fileId,
        folderPath: data.folderPath,
        message: 'Đã tải lên Google Drive thực hành.',
      };
    }
    return { status: 'error', message: data.message || 'Lỗi lưu Drive' };
  } catch (err: any) {
    return { status: 'error', message: `Lỗi kết nối Drive: ${err.message}` };
  }
}

export async function testDriveOnlineConnection(
  url: string
): Promise<{ success: boolean; message: string; version?: string }> {
  if (!url || !url.startsWith('http')) {
    return { success: false, message: 'URL phải bắt đầu bằng https://script.google.com/macros/s/...' };
  }
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return { success: false, message: `Mã lỗi HTTP ${res.status}` };
    const data = await res.json();
    if (data.status === 'ok') {
      return { success: true, version: data.version, message: data.message || 'Kết nối thành công!' };
    }
    return { success: false, message: data.message || 'Phản hồi không hợp lệ' };
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối: ${err.message}` };
  }
}
