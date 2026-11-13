import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# Styles
header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
header_fill_blue = PatternFill(start_color='1E40AF', end_color='1E40AF', fill_type='solid')
header_fill_emerald = PatternFill(start_color='065F46', end_color='065F46', fill_type='solid')
header_fill_amber = PatternFill(start_color='92400E', end_color='92400E', fill_type='solid')
title_font = Font(name='Calibri', size=14, bold=True, color='1E3A8A')
sub_font = Font(name='Calibri', size=10, italic=True, color='4B5563')
thin_border = Border(
    left=Side(style='thin', color='D1D5DB'),
    right=Side(style='thin', color='D1D5DB'),
    top=Side(style='thin', color='D1D5DB'),
    bottom=Side(style='thin', color='D1D5DB')
)

# Sheet 1: Ham_IF
ws1 = wb.active
ws1.title = 'Ham_IF'
ws1['A1'] = 'BÀI TẬP THỰC HÀNH: SỬ DỤNG HÀM IF ĐÁNH GIÁ KẾT QUẢ HỌC TẬP'
ws1['A1'].font = title_font
ws1['A2'] = 'Yêu cầu: Sử dụng hàm IF(logical_test, [value_if_true], [value_if_false]) để điền cột Kết quả và Xếp loại.'
ws1['A2'].font = sub_font

headers_if = ['STT', 'Mã HS', 'Họ và tên', 'Lớp', 'Điểm Toán', 'Điểm Tin học', 'Điểm TB', 'Kết quả (>=5: Đạt)', 'Xếp loại']
for col_idx, text in enumerate(headers_if, 1):
    c = ws1.cell(row=4, column=col_idx, value=text)
    c.font = header_font
    c.fill = header_fill_blue
    c.alignment = Alignment(horizontal='center', vertical='center')

students_data = [
    [1, 'HS01', 'Nguyễn Văn An', '7A1', 8.5, 9.0],
    [2, 'HS02', 'Trần Thị Bình', '7A1', 6.0, 7.5],
    [3, 'HS03', 'Lê Hoàng Cường', '7A1', 4.0, 4.5],
    [4, 'HS04', 'Phạm Minh Đức', '7A1', 9.0, 9.5],
    [5, 'HS05', 'Vũ Hồng Hạnh', '7A1', 7.0, 6.5],
    [6, 'HS06', 'Đỗ Gia Huy', '7A1', 4.5, 5.0],
    [7, 'HS07', 'Ngô Thuỳ Linh', '7A1', 8.0, 8.5],
    [8, 'HS08', 'Hoàng Văn Nam', '7A1', 3.5, 4.0]
]

for r_idx, row_val in enumerate(students_data, 5):
    for c_idx, val in enumerate(row_val, 1):
        cell = ws1.cell(row=r_idx, column=c_idx, value=val)
        cell.border = thin_border
        if c_idx in [1, 2, 4]:
            cell.alignment = Alignment(horizontal='center')
    # Điểm TB công thức
    cell_tb = ws1.cell(row=r_idx, column=7, value=f'=AVERAGE(E{r_idx}:F{r_idx})')
    cell_tb.border = thin_border
    cell_tb.number_format = '0.0'
    cell_tb.alignment = Alignment(horizontal='center')

    # Điểm Kết quả công thức IF
    cell_kq = ws1.cell(row=r_idx, column=8, value=f'=IF(G{r_idx}>=5, "Đạt", "Chưa đạt")')
    cell_kq.border = thin_border
    cell_kq.alignment = Alignment(horizontal='center')

    # Điểm Xếp loại công thức IF lồng
    cell_xl = ws1.cell(row=r_idx, column=9, value=f'=IF(G{r_idx}>=8, "Giỏi", IF(G{r_idx}>=6.5, "Khá", IF(G{r_idx}>=5, "Trung bình", "Yếu")))')
    cell_xl.border = thin_border
    cell_xl.alignment = Alignment(horizontal='center')

# Sheet 2: Ham_COUNTIF
ws2 = wb.create_sheet(title='Ham_COUNTIF')
ws2['A1'] = 'BÀI TẬP THỰC HÀNH: SỬ DỤNG HÀM COUNTIF THỐNG KÊ SỐ LƯỢNG'
ws2['A1'].font = title_font
ws2['A2'] = 'Cú pháp: =COUNTIF(range, criteria)'
ws2['A2'].font = sub_font

headers_countif = ['STT', 'Tiêu chí thống kê', 'Công thức thực hiện', 'Số lượng']
for col_idx, text in enumerate(headers_countif, 1):
    c = ws2.cell(row=4, column=col_idx, value=text)
    c.font = header_font
    c.fill = header_fill_emerald
    c.alignment = Alignment(horizontal='center')

count_rows = [
    [1, 'Số học sinh Đạt kết quả (>= 5)', '=COUNTIF(Ham_IF!H5:H12, "Đạt")'],
    [2, 'Số học sinh Chưa đạt (< 5)', '=COUNTIF(Ham_IF!H5:H12, "Chưa đạt")'],
    [3, 'Số học sinh xếp loại Giỏi', '=COUNTIF(Ham_IF!I5:I12, "Giỏi")'],
    [4, 'Số học sinh có điểm Tin học >= 8.0', '=COUNTIF(Ham_IF!F5:F12, ">=8.0")']
]

for r_idx, (stt, tc, fml) in enumerate(count_rows, 5):
    c1 = ws2.cell(row=r_idx, column=1, value=stt)
    c2 = ws2.cell(row=r_idx, column=2, value=tc)
    c3 = ws2.cell(row=r_idx, column=3, value=fml)
    c4 = ws2.cell(row=r_idx, column=4, value=fml)
    for c in [c1, c2, c3, c4]:
        c.border = thin_border
    c1.alignment = Alignment(horizontal='center')
    c4.alignment = Alignment(horizontal='center')

# Sheet 3: Ham_SUMIF
ws3 = wb.create_sheet(title='Ham_SUMIF')
ws3['A1'] = 'BÀI TẬP THỰC HÀNH: SỬ DỤNG HÀM SUMIF TÍNH TỔNG THEO ĐIỀU KIỆN'
ws3['A1'].font = title_font
ws3['A2'] = 'Cú pháp: =SUMIF(range, criteria, [sum_range])'
ws3['A2'].font = sub_font

headers_sumif = ['STT', 'Phòng thực hành', 'Thiết bị mua sắm', 'Số lượng', 'Đơn giá (VNĐ)', 'Thành tiền (VNĐ)']
for col_idx, text in enumerate(headers_sumif, 1):
    c = ws3.cell(row=4, column=col_idx, value=text)
    c.font = header_font
    c.fill = header_fill_amber
    c.alignment = Alignment(horizontal='center')

items = [
    [1, 'Phòng máy 1', 'Bàn phím cơ', 15, 250000],
    [2, 'Phòng máy 2', 'Chuột quang', 20, 120000],
    [3, 'Phòng máy 1', 'Màn hình 24 inch', 10, 2200000],
    [4, 'Phòng máy 3', 'Bàn phím cơ', 12, 250000],
    [5, 'Phòng máy 2', 'Dây mạng đúc sẵn', 30, 35000],
    [6, 'Phòng máy 1', 'Chuột quang', 15, 120000]
]

for r_idx, row in enumerate(items, 5):
    for c_idx, val in enumerate(row, 1):
        c = ws3.cell(row=r_idx, column=c_idx, value=val)
        c.border = thin_border
        if c_idx in [1, 4]:
            c.alignment = Alignment(horizontal='center')
        elif c_idx == 5:
            c.number_format = '#,##0'
    c_tt = ws3.cell(row=r_idx, column=6, value=f'=D{r_idx}*E{r_idx}')
    c_tt.border = thin_border
    c_tt.number_format = '#,##0'

# Thống kê tổng tiền theo từng phòng
ws3.cell(row=13, column=2, value='Thống kê tổng kinh phí Phòng máy 1:').font = Font(bold=True)
c_sum1 = ws3.cell(row=13, column=6, value='=SUMIF(B5:B10, "Phòng máy 1", F5:F10)')
c_sum1.number_format = '#,##0'
c_sum1.font = Font(bold=True, color='1E40AF')

# Auto fit columns
for ws in [ws1, ws2, ws3]:
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

wb.save(r'C:\Users\manht\teacher\public\practice-files\BTTH_Ham_IF_SUMIF_COUNTIF.xlsx')
print('Successfully generated BTTH_Ham_IF_SUMIF_COUNTIF.xlsx')
