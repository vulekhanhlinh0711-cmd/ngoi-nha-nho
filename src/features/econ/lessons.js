// P11.01: bài học kiến thức nền (tự soạn, mang tính phổ thông). Mỗi bài: nội dung ngắn + câu đố.
// Câu hỏi: [câu hỏi, [lựa chọn…], chỉ số đáp án đúng]
export const LESSONS = [
  {
    id: 'cpi', group: 'Vĩ mô', title: 'Lạm phát và chỉ số CPI',
    body: 'Lạm phát là khi mặt bằng giá cả tăng lên theo thời gian, nên cùng một số tiền mua được ít hàng hơn. CPI (chỉ số giá tiêu dùng) đo mức thay đổi giá của một "giỏ hàng" quen thuộc như thực phẩm, nhà ở, đi lại, giáo dục. Ở Việt Nam, cơ quan thống kê công bố CPI hằng tháng. Nếu CPI tăng 4% so với cùng kỳ năm trước, nghĩa là trung bình giá đã tăng khoảng 4% trong một năm.',
    quiz: [
      ['CPI đo điều gì?', ['Giá cổ phiếu', 'Mức thay đổi giá của giỏ hàng tiêu dùng', 'Lương trung bình'], 1],
      ['Lạm phát 4%/năm, lương không đổi thì sức mua của bạn…', ['Tăng', 'Giảm', 'Giữ nguyên'], 1],
    ],
  },
  {
    id: 'policy-rate', group: 'Vĩ mô', title: 'Lãi suất điều hành',
    body: 'Ngân hàng Nhà nước dùng các mức lãi suất điều hành (như lãi suất tái cấp vốn, tái chiết khấu) để định hướng chi phí vay mượn trong nền kinh tế. Khi muốn kiềm chế lạm phát, ngân hàng trung ương thường tăng lãi suất để giảm vay mượn và chi tiêu; khi muốn hỗ trợ tăng trưởng thì thường giảm lãi suất. Lãi suất tiền gửi và cho vay của các ngân hàng thương mại thường thay đổi theo xu hướng này, dù có độ trễ.',
    quiz: [
      ['Khi lạm phát tăng cao, ngân hàng trung ương thường…', ['Tăng lãi suất điều hành', 'Giảm lãi suất điều hành', 'In thêm tiền'], 0],
      ['Lãi suất điều hành giảm thường khiến lãi vay mua nhà…', ['Có xu hướng giảm', 'Chắc chắn tăng', 'Không liên quan'], 0],
    ],
  },
  {
    id: 'fx', group: 'Vĩ mô', title: 'Tỷ giá USD/VND',
    body: 'Tỷ giá cho biết cần bao nhiêu đồng để đổi lấy 1 USD. Khi tỷ giá tăng (VND mất giá), hàng nhập khẩu và đồ công nghệ thường đắt hơn, du lịch nước ngoài tốn hơn, nhưng hàng xuất khẩu của Việt Nam rẻ hơn với người nước ngoài. Ngân hàng Nhà nước công bố tỷ giá trung tâm hằng ngày; ngân hàng thương mại niêm yết giá mua và giá bán với một khoảng chênh.',
    quiz: [
      ['Tỷ giá tăng từ 24.000 lên 25.500 đ/USD nghĩa là…', ['VND mạnh lên', 'VND mất giá', 'USD mất giá'], 1],
      ['Khi VND mất giá, điện thoại nhập khẩu có xu hướng…', ['Rẻ hơn', 'Đắt hơn', 'Không đổi'], 1],
    ],
  },
  {
    id: 'fed', group: 'Vĩ mô', title: 'Fed tác động đến Việt Nam thế nào?',
    body: 'Fed là ngân hàng trung ương Mỹ. Khi Fed tăng lãi suất, đồng USD thường mạnh lên và dòng tiền có xu hướng chảy về Mỹ. Điều đó có thể gây áp lực lên tỷ giá USD/VND và khiến Việt Nam khó giảm lãi suất trong nước. Ngược lại, khi Fed giảm lãi suất, áp lực tỷ giá thường dịu bớt. Đây là xu hướng chung, không phải quy luật chắc chắn, vì còn nhiều yếu tố khác.',
    quiz: [
      ['Fed tăng lãi suất thường làm USD…', ['Yếu đi', 'Mạnh lên', 'Không đổi'], 1],
      ['Tác động của Fed lên tỷ giá Việt Nam là…', ['Chắc chắn 100%', 'Một xu hướng, không chắc chắn', 'Không có'], 1],
    ],
  },
  {
    id: 'supply-demand', group: 'Vi mô', title: 'Cung – cầu: vì sao giá lên xuống?',
    body: 'Giá được quyết định bởi cung (người bán muốn bán bao nhiêu) và cầu (người mua muốn mua bao nhiêu). Khi cầu tăng mà cung không kịp tăng, ví dụ hoa dịp 8/3, giá thường lên. Khi cung dồi dào, ví dụ trái cây chính vụ, giá thường giảm. Hiểu điều này giúp bạn mua đúng lúc: đồ mùa đông thường rẻ vào cuối mùa, vé máy bay đắt vào dịp lễ.',
    quiz: [
      ['Giá hoa tăng dịp 8/3 chủ yếu vì…', ['Cầu tăng mạnh', 'Cung tăng mạnh', 'Lạm phát'], 0],
      ['Muốn mua áo khoác rẻ, thời điểm tốt thường là…', ['Đầu mùa lạnh', 'Cuối mùa lạnh', 'Giữa mùa lạnh'], 1],
    ],
  },
  {
    id: 'ecom-sale', group: 'Vi mô', title: 'Sàn thương mại điện tử định giá khuyến mãi',
    body: 'Các đợt sale lớn (9.9, 11.11…) thật sự có nhiều ưu đãi, nhưng cũng có chiêu "nâng giá rồi giảm": giá niêm yết được đẩy lên vài ngày trước sale, sau đó "giảm 50%" về đúng giá cũ. Cách phòng tránh: ghi lại giá một món trong vài tuần, so với giá thấp nhất từng thấy, cộng thêm phí ship và voucher thật sự dùng được. Đặt câu hỏi: nếu không có sale, mình có mua món này không?',
    quiz: [
      ['"Nâng giá rồi giảm" là…', ['Giảm giá thật', 'Đẩy giá lên trước rồi giảm về giá cũ', 'Giá tăng do lạm phát'], 1],
      ['Cách kiểm tra một đợt giảm giá có thật không?', ['Tin vào % giảm', 'So với lịch sử giá đã ghi', 'Mua ngay kẻo hết'], 1],
    ],
  },
  {
    id: 'compound', group: 'Tài chính cá nhân', title: 'Lãi kép',
    body: 'Lãi kép là khi tiền lãi được cộng vào gốc để tiếp tục sinh lãi. Công thức: Số tiền sau n kỳ = Gốc × (1 + lãi suất mỗi kỳ)^n. Ví dụ gửi 10 triệu với lãi 6%/năm, tái tục cả gốc lẫn lãi: sau 1 năm có 10,6 triệu, sau 10 năm khoảng 17,9 triệu. Thời gian càng dài, lãi kép càng mạnh — nên bắt đầu tiết kiệm sớm quan trọng hơn số tiền lớn.',
    quiz: [
      ['10 triệu, lãi 10%/năm, lãi kép 2 năm được khoảng…', ['12 triệu', '12,1 triệu', '11 triệu'], 1],
      ['Yếu tố làm lãi kép mạnh nhất là…', ['Thời gian', 'Màu thẻ ngân hàng', 'Số lần kiểm tra tài khoản'], 0],
    ],
  },
  {
    id: 'real-rate', group: 'Tài chính cá nhân', title: 'Lãi thực và lãi danh nghĩa',
    body: 'Lãi danh nghĩa là con số ngân hàng niêm yết, ví dụ 5%/năm. Lãi thực là phần sức mua bạn thật sự có thêm sau khi trừ lạm phát: lãi thực ≈ lãi danh nghĩa − lạm phát. Nếu gửi tiết kiệm 5% mà lạm phát 4%, sức mua chỉ tăng khoảng 1%. Nếu lạm phát cao hơn lãi suất, tiền gửi thật ra đang mất dần sức mua.',
    quiz: [
      ['Lãi 6%, lạm phát 4%: lãi thực khoảng…', ['10%', '2%', '6%'], 1],
      ['Lạm phát 7%, lãi gửi 5%: sức mua của tiền gửi…', ['Tăng', 'Giảm', 'Không đổi'], 1],
    ],
  },
  {
    id: 'installment', group: 'Tài chính cá nhân', title: 'Chi phí ẩn của trả góp',
    body: 'Trả góp "0%" chưa chắc miễn phí: có thể có phí chuyển đổi trả góp, phí hồ sơ, bảo hiểm khoản vay bắt buộc, hoặc giá bán khi trả góp cao hơn giá trả thẳng. Ngoài ra, lãi "phẳng" (tính trên số tiền vay ban đầu suốt kỳ hạn) nghe thấp nhưng thực tế đắt gần gấp đôi lãi tính trên dư nợ giảm dần. Hãy hỏi rõ: tổng số tiền phải trả là bao nhiêu?',
    quiz: [
      ['Câu hỏi quan trọng nhất khi trả góp là…', ['Mỗi tháng trả bao nhiêu', 'Tổng số tiền phải trả', 'Quà tặng kèm'], 1],
      ['Lãi phẳng 1%/tháng so với lãi dư nợ giảm dần 1%/tháng thì…', ['Rẻ hơn', 'Đắt hơn', 'Như nhau'], 1],
    ],
  },
  {
    id: 'loan-contract', group: 'Tài chính cá nhân', title: 'Đọc hợp đồng vay',
    body: 'Khi đọc hợp đồng vay, chú ý: lãi suất cố định trong bao lâu, sau đó thả nổi theo công thức nào (thường là lãi suất cơ sở + biên độ); phí trả nợ trước hạn; phí phạt chậm trả; bảo hiểm đi kèm có bắt buộc không; cách tính lãi (dư nợ giảm dần hay phẳng). Lãi ưu đãi thấp 6–12 tháng đầu có thể khiến tổng chi phí cao hơn khoản vay lãi cố định cao hơn một chút.',
    quiz: [
      ['Lãi thả nổi thường được tính bằng…', ['Lãi cơ sở + biên độ', 'Một con số cố định mãi mãi', 'Tùy nhân viên'], 0],
      ['Điều cần hỏi trước khi muốn trả nợ sớm là…', ['Phí trả nợ trước hạn', 'Màu hợp đồng', 'Không cần hỏi'], 0],
    ],
  },
];
export const LESSON_COINS = 10;
