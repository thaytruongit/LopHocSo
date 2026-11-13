import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClassroomSyncWatcher from "@/components/ClassroomSyncWatcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tin Học Số · Kiến Trúc Multi-Tenant Sư Phạm Chuẩn Hóa",
  description:
    "Hệ sinh thái phòng máy số đa trường học môn Tin học THCS (Khối 6, 7, 8, 9): 116 tiết học, 812 câu hỏi củng cố, kiểm tra định kỳ và sổ điểm Thông tư 22.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="flex flex-col min-h-screen font-sans bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <ClassroomSyncWatcher />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
