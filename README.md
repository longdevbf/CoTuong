# Web CoTuongOffline

Đây là dự án game Cờ Tướng được phát triển bằng **Next.js**. Người chơi có thể trải nghiệm đấu với AI hoặc đối kháng với người khác trên cùng một thiết bị, với giao diện bàn cờ trực quan và sống động.
## 🚀 Tính năng chính
* **Chế độ chơi:** Hỗ trợ đấu với AI hoặc người chơi khác.
* **Giao diện:** Đồ họa đẹp mắt, bàn cờ chuẩn, âm thanh hỗ trợ khi di chuyển quân và ăn quân.
* **Hướng dẫn:** Tích hợp màn hình luật chơi chi tiết cho người mới bắt đầu.
* **Công nghệ:** Next.js, React, Tailwind CSS, TypeScript.

## 🧠 Thuật toán AI
Dự án sử dụng AI mạnh mẽ để tạo trải nghiệm thách thức cho người chơi thông qua các kỹ thuật:
* **Thuật toán cốt lõi:** **NegaMax** kết hợp với **Alpha-Beta Pruning** để tìm kiếm nước đi tối ưu bằng cách cắt tỉa các nhánh không cần thiết.
* **Tối ưu hóa tìm kiếm:**
    * **Transposition Table (TT):** Sử dụng Hash Zobrist để lưu trữ và tái sử dụng kết quả các trạng thái bàn cờ đã tính toán.
    * **Move Ordering:** Ưu tiên xét các nước đi tiềm năng (ăn quân, các nước đi mạnh) để tối ưu hóa hiệu quả cắt tỉa.
    * **Quiescence Search:** Tìm kiếm sâu hơn ở các trạng thái "nóng" (đang ăn quân) để tránh sai lầm chiến thuật.
* **Đánh giá:** Sử dụng hàm đánh giá kết hợp giữa **giá trị quân cờ (Material)** và **bảng điểm vị trí (Piece-Square Tables)**.

## 🛠️ Cách cài đặt và chạy chương trình

### Yêu cầu hệ thống
* [Node.js](https://nodejs.org/) (phiên bản LTS).

### Các bước thực hiện
1. **Clone dự án:**
   git clone [https://github.com/longdevbf/CoTuong.git](https://github.com/longdevbf/CoTuong.git)
   cd CoTuong
2. **Cài đặt các gói phụ thuộc**
   npm install
3. **Chạy dự án**
   npm run dev
4. **Truy cập**
   Mở trình duyệt tại "http://localhost:8081"
Or you can play at: https://co-tuong-pi.vercel.app/?fbclid=IwY2xjawRUWzRleHRuA2FlbQIxMQBzcnRjBmFwcF9pZAEwAAEeq98NT8a6W1BNlnvGUhyZIFYAqF69x9VMSVkVBa4fYE5OmKCX5m2ky-ke2LU_aem_2-RZCSJpMs2vl2egs5h_bA
