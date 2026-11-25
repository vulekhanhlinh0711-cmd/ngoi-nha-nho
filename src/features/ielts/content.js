// P9: nội dung học khởi đầu (tự soạn). Bạn có thể thêm từ của mình trong app.
// [từ, loại từ, nghĩa, ví dụ]
export const STARTER_WORDS = [
  ['analyse', 'v', 'phân tích', 'The report analyses changes in energy use.'],
  ['approach', 'n', 'cách tiếp cận', 'A new approach to teaching reading.'],
  ['assess', 'v', 'đánh giá', 'Teachers assess students in many ways.'],
  ['benefit', 'n', 'lợi ích', 'Regular exercise has many benefits.'],
  ['challenge', 'n', 'thách thức', 'Climate change is a global challenge.'],
  ['consequence', 'n', 'hậu quả', 'Pollution has serious consequences for health.'],
  ['considerable', 'adj', 'đáng kể', 'There was a considerable rise in prices.'],
  ['contribute', 'v', 'đóng góp', 'Tourism contributes to the local economy.'],
  ['crucial', 'adj', 'cực kỳ quan trọng', 'Sleep is crucial for memory.'],
  ['decline', 'v/n', 'giảm; sự suy giảm', 'Sales declined sharply in 2020.'],
  ['demonstrate', 'v', 'chứng minh, cho thấy', 'The data demonstrate a clear trend.'],
  ['dramatically', 'adv', 'một cách đột ngột, mạnh', 'The number of users rose dramatically.'],
  ['efficient', 'adj', 'hiệu quả (ít lãng phí)', 'Public transport is more efficient.'],
  ['emerge', 'v', 'nổi lên, xuất hiện', 'New problems emerged during the project.'],
  ['enhance', 'v', 'nâng cao', 'Technology can enhance learning.'],
  ['essential', 'adj', 'thiết yếu', 'Water is essential for life.'],
  ['estimate', 'v/n', 'ước tính', 'It is estimated that 2 million people visited.'],
  ['evidence', 'n', 'bằng chứng', 'There is little evidence for this claim.'],
  ['factor', 'n', 'yếu tố', 'Cost is an important factor.'],
  ['fluctuate', 'v', 'dao động', 'Temperatures fluctuated throughout the year.'],
  ['fundamental', 'adj', 'cơ bản, nền tảng', 'Education is a fundamental right.'],
  ['generate', 'v', 'tạo ra', 'Wind farms generate electricity.'],
  ['impact', 'n', 'tác động', 'Social media has a big impact on teenagers.'],
  ['implement', 'v', 'thực hiện, triển khai', 'The government implemented a new policy.'],
  ['indicate', 'v', 'chỉ ra, cho thấy', 'The graph indicates a steady increase.'],
  ['inevitable', 'adj', 'không thể tránh khỏi', 'Some changes are inevitable.'],
  ['issue', 'n', 'vấn đề', 'Housing is a major issue in big cities.'],
  ['maintain', 'v', 'duy trì', 'It is hard to maintain a healthy diet.'],
  ['majority', 'n', 'đa số', 'The majority of students agreed.'],
  ['moderate', 'adj', 'vừa phải', 'A moderate amount of coffee is fine.'],
  ['obtain', 'v', 'đạt được, có được', 'Data were obtained from a survey.'],
  ['peak', 'n/v', 'đỉnh; đạt đỉnh', 'Visitor numbers peaked in July.'],
  ['perspective', 'n', 'góc nhìn', 'From an economic perspective, it makes sense.'],
  ['potential', 'adj/n', 'tiềm năng', 'Solar power has great potential.'],
  ['proportion', 'n', 'tỷ lệ', 'A large proportion of income goes on rent.'],
  ['rapid', 'adj', 'nhanh chóng', 'Cities saw rapid growth.'],
  ['rely on', 'v', 'dựa vào', 'Many families rely on one income.'],
  ['significant', 'adj', 'đáng kể, quan trọng', 'There was a significant drop in crime.'],
  ['steady', 'adj', 'ổn định, đều', 'Prices showed a steady rise.'],
  ['sustainable', 'adj', 'bền vững', 'We need sustainable farming.'],
  ['tendency', 'n', 'xu hướng', 'People have a tendency to overspend.'],
  ['therefore', 'adv', 'vì vậy', 'It was raining; therefore, the match was cancelled.'],
  ['whereas', 'conj', 'trong khi đó', 'Men preferred sport, whereas women preferred music.'],
  ['widespread', 'adj', 'phổ biến, lan rộng', 'Smartphone use is widespread.'],
  ['address', 'v', 'giải quyết (vấn đề)', 'Governments must address unemployment.'],
  ['access', 'n/v', 'sự tiếp cận; truy cập', 'Not everyone has access to clean water.'],
  ['alternative', 'n', 'lựa chọn thay thế', 'Cycling is a healthy alternative to driving.'],
  ['beneficial', 'adj', 'có lợi', 'Reading is beneficial for children.'],
  ['controversial', 'adj', 'gây tranh cãi', 'Animal testing is controversial.'],
  ['detrimental', 'adj', 'có hại', 'Stress is detrimental to health.'],
];

export const SKILLS = [['listening', '🎧 Listening'], ['reading', '📖 Reading'], ['writing', '✍️ Writing'], ['speaking', '🗣️ Speaking']];

// Nghe chép chính tả (đọc bằng giọng đọc của trình duyệt).
export const DICTATION = [
  'The library is open from nine in the morning until eight in the evening.',
  'Please remember to bring your student card on the first day.',
  'The number of tourists visiting the island has doubled since last year.',
  'Most participants said they preferred online classes to traditional ones.',
  'The new sports centre will be built next to the train station.',
  'Researchers found that sleep plays a key role in memory.',
  'The deadline for the assignment has been moved to next Friday.',
  'Recycling bins are located at the end of each corridor.',
];

// Bài đọc ngắn (tự soạn). Câu hỏi True / False / Not Given.
export const READINGS = [
  {
    title: 'Urban gardens',
    text: 'In many large cities, residents are turning empty rooftops and unused land into small gardens. Supporters argue that urban gardens reduce summer temperatures, provide fresh vegetables and bring neighbours together. A survey in one European city found that 60 percent of gardeners met new friends through their garden. However, critics point out that soil in former industrial areas may contain harmful chemicals, so testing is necessary before planting food crops. Local governments have started offering free soil tests to encourage safe gardening.',
    questions: [
      ['Urban gardens can help lower temperatures in summer.', 'T'],
      ['Most gardeners in the survey grew only flowers.', 'NG'],
      ['More than half of the gardeners surveyed made new friends.', 'T'],
      ['Soil testing is unnecessary in former industrial areas.', 'F'],
    ],
  },
  {
    title: 'The four-day week',
    text: 'Several companies have experimented with a four-day working week without reducing pay. In a trial involving about 60 firms, most employers reported that productivity stayed the same or improved, while staff reported less stress and better sleep. Around 90 percent of the companies chose to continue the policy after the trial. Some managers, though, said that the change was difficult in customer-facing roles, where staff must be available every day.',
    questions: [
      ['Workers in the trial were paid less.', 'F'],
      ['Employees said they slept better.', 'T'],
      ['All companies kept the four-day week after the trial.', 'F'],
      ['The trial took place only in technology companies.', 'NG'],
    ],
  },
];

export const WRITING_TASKS = [
  ['Task 2', 'Some people think that university education should be free for everyone. To what extent do you agree or disagree?', 250, 40],
  ['Task 2', 'In many cities, people spend more time commuting than before. What are the causes of this, and what can be done to solve the problem?', 250, 40],
  ['Task 2', 'Some believe children should learn practical skills like cooking and managing money at school. Discuss both views and give your opinion.', 250, 40],
  ['Task 1', 'Describe a line graph that shows the number of visitors to three museums between 2010 and 2020 (imagine the data). Summarise the main features and make comparisons.', 150, 20],
];
export const WRITING_CHECK = ['Trả lời đúng và đủ đề bài', 'Có mở bài, thân bài, kết luận rõ ràng', 'Dùng từ nối (however, therefore…)', 'Đa dạng từ vựng, tránh lặp từ', 'Câu phức và ngữ pháp chính xác', 'Đủ số từ tối thiểu'];

export const CUE_CARDS = [
  ['Describe a place you like to visit to relax.', ['Where it is', 'How often you go there', 'What you do there', 'Why it helps you relax']],
  ['Describe a skill you learned recently.', ['What the skill is', 'How you learned it', 'How long it took', 'How you feel about it']],
  ['Describe a person who has influenced you.', ['Who the person is', 'How you know them', 'What they did', 'Why they influenced you']],
  ['Describe a book or film that made you think.', ['What it was', 'When you read/watched it', 'What it was about', 'Why it made you think']],
];
