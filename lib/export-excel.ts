import { OfficialGradeRow, Student } from './domain/types';

export function exportStudentsToExcel(
  students: Student[],
  fileName = 'Danh_Sach_Hoc_Sinh.xls',
  schoolName = 'Trường THCS Mão Điền',
  teacherName = 'Thầy Đỗ Mạnh Trường'
) {
  if (!students || students.length === 0) return;

  let tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        th { background-color: #1d4ed8; color: #ffffff; font-weight: bold; border: 0.5pt solid #000000; text-align: center; }
        td { border: 0.5pt solid #cbd5e1; vertical-align: middle; }
        .title { font-size: 14pt; font-weight: bold; text-align: center; color: #1e3a8a; }
        .subtitle { font-size: 10pt; font-style: italic; text-align: center; color: #475569; }
        .num { text-align: center; }
        .score { text-align: right; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="8" class="title">${schoolName.toUpperCase()}</td></tr>
        <tr><td colspan="8" class="title">DANH SÁCH TÀI KHOẢN HỌC SINH MÔN TIN HỌC</td></tr>
        <tr><td colspan="8" class="subtitle">Giáo viên phụ trách: ${teacherName} | Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}</td></tr>
        <tr><td></td></tr>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã Học Sinh</th>
            <th>Họ và Tên</th>
            <th>Lớp</th>
            <th>Ngày Sinh</th>
            <th>Điểm TB</th>
            <th>XP Tích Lũy</th>
            <th>Cấp Độ</th>
          </tr>
        </thead>
        <tbody>
  `;

  students.forEach((st, idx) => {
    tableHtml += `
      <tr>
        <td class="num">${idx + 1}</td>
        <td class="num" style="mso-number-format:'\\@';">${st.studentCode}</td>
        <td>${st.fullName}</td>
        <td class="num">${st.className}</td>
        <td class="num">${st.dob || ''}</td>
        <td class="score">${st.averageGrade}</td>
        <td class="score">${st.totalXp}</td>
        <td class="num">Cấp ${st.level || 1}</td>
      </tr>
    `;
  });

  tableHtml += `</tbody></table></body></html>`;
  triggerExcelDownload(tableHtml, fileName);
}

export function exportGradebookToExcel(
  rows: OfficialGradeRow[],
  fileName = 'So_Diem_TT22.xls',
  schoolName = 'Trường THCS Mão Điền',
  teacherName = 'Thầy Đỗ Mạnh Trường',
  className = 'Lớp 7A11'
) {
  if (!rows || rows.length === 0) return;

  let tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        th { background-color: #0f766e; color: #ffffff; font-weight: bold; border: 0.5pt solid #000000; text-align: center; }
        td { border: 0.5pt solid #cbd5e1; vertical-align: middle; }
        .title { font-size: 14pt; font-weight: bold; text-align: center; color: #134e4a; }
        .subtitle { font-size: 10pt; font-style: italic; text-align: center; color: #475569; }
        .num { text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="12" class="title">${schoolName.toUpperCase()} — SỔ ĐIỂM CHUẨN THÔNG TƯ 22</td></tr>
        <tr><td colspan="12" class="subtitle">${className} | Giáo viên: ${teacherName} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</td></tr>
        <tr><td></td></tr>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã HS</th>
            <th>Họ và Tên</th>
            <th>TX1</th>
            <th>TX2</th>
            <th>TX3</th>
            <th>TX4</th>
            <th>Giữa kỳ (x2)</th>
            <th>Cuối kỳ (x3)</th>
            <th>ĐTBmhk</th>
            <th>Xếp loại</th>
            <th>Nhận xét</th>
          </tr>
        </thead>
        <tbody>
  `;

  rows.forEach((r, idx) => {
    tableHtml += `
      <tr>
        <td class="num">${idx + 1}</td>
        <td class="num" style="mso-number-format:'\\@';">${r.studentCode}</td>
        <td>${r.fullName}</td>
        <td class="num">${r.tx1}</td>
        <td class="num">${r.tx2}</td>
        <td class="num">${r.tx3}</td>
        <td class="num">${r.tx4}</td>
        <td class="num">${r.gk}</td>
        <td class="num">${r.ck}</td>
        <td class="num"><b>${r.dtb}</b></td>
        <td class="num"><b>${r.rank}</b></td>
        <td>${r.comment}</td>
      </tr>
    `;
  });

  tableHtml += `</tbody></table></body></html>`;
  triggerExcelDownload(tableHtml, fileName);
}

function triggerExcelDownload(html: string, fileName: string) {
  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
