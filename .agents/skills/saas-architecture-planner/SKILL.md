---
name: saas-architecture-planner
description: >-
  Use this skill whenever starting a new SaaS project from scratch, planning a major architectural 
  refactoring, choosing tech stacks, designing database schemas, or organizing repository structures.
---

# SaaS Architecture & System Design Playbook

This skill defines the canonical architecture for production-ready, scalable SaaS applications.

---

## 1. CẤU TRÚC THƯ MỤC TIÊU CHUẨN (NEXT.JS APP ROUTER)
```text
src/
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── (auth)/           # Route group cho login, register, 2fa
│   ├── (dashboard)/      # Route group cho người dùng cuối
│   ├── admin/            # Standalone Cockpit dành cho Ban Điều Hành
│   └── api/              # Serverless API Endpoints (Webhooks, Verify, Internal)
├── components/           # Tái sử dụng linh hoạt
│   ├── ui/               # Nguyên tử (Buttons, Inputs, Badges, Modals)
│   ├── dashboard/        # Thẻ KPI, Biểu đồ PnL, Bảng giao dịch
│   └── admin/            # Bento grid, Sổ cái kế toán, Ngăn kéo trượt
├── lib/                  # Tầng nghiệp vụ & Tích hợp dịch vụ
│   ├── db/               # Kết nối Database (Firestore/Postgres/Prisma)
│   ├── auth/             # Mật mã học, xác thực HMAC, Session
│   ├── payment/          # Bộ tính phí, đối soát On-Chain, Stripe
│   └── utils/            # Hàm định dạng tiền tệ, ngày tháng
├── contexts/             # State toàn cục (LanguageContext, AuthContext)
└── types/                # Định nghĩa kiểu dữ liệu TypeScript nghiêm ngặt
```

---

## 2. NGUYÊN TẮC THIẾT KẾ ĐA NGƯỜI DÙNG (MULTI-TENANT ISOLATION)
- Mọi bản ghi trong cơ sở dữ liệu BẮT BUỘC phải gắn liền với `userId` hoặc `tenantId`.
- Mọi câu truy vấn dữ liệu từ API phải có mệnh đề lọc: `where('userId', '==', authenticatedUserId)`. Cấm tuyệt đối truy vấn toàn bộ dữ liệu mà không có bộ lọc quyền sở hữu.

---

## 3. CHECKLIST KHỞI TẠO DỰ ÁN MỚI
1. [ ] Khởi tạo dự án Next.js 14+ với TypeScript strict mode (`strict: true`).
2. [ ] Thiết lập Tailwind CSS với bảng màu Dark Luxury & Font chữ số Monospace (`JetBrains Mono`).
3. [ ] Cấu hình `.env.example` liệt kê đầy đủ các biến môi trường cần thiết.
4. [ ] Tạo `GEMINI.md` quy định các luật bất biến về code quality và test build.
