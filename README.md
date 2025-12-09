# Tổng quan

Tool sinh HTML IELTS Reading chạy hoàn toàn offline. Bạn cung cấp 1 file JSON, tool sẽ ghép vào template `template/base-reading.html` để tạo trang luyện tập đầy đủ tính năng (timer, navigation, highlight, check answer, band score, drag & drop…).

# Cấu trúc thư mục chính
- `template/base-reading.html`: template gốc (giữ nguyên CSS/JS, có marker để chèn nội dung).
- `scripts/generator.js`: thư viện render (dùng cho CLI và browser UI).
- `scripts/generate-reading.js`: CLI sinh HTML từ JSON.
- `data/sample-reading.json`: JSON mẫu đủ các dạng câu hỏi.
- `tool.html`: giao diện web local (paste JSON, preview, tải HTML).
- `dist/`: nơi lưu file HTML đầu ra (khi dùng CLI).
- `test/`: chỗ lưu thử JSON/PDF của bạn.

# Chuẩn bị JSON đầu vào (bắt buộc)
## Nếu sử dụng chatgpt, prompt ở /project_guide/chetgpt_promtp_tp.../

- Số câu: đúng 40 câu, đánh số liên tục 1–40 (không trùng, không thiếu).
- Cấu trúc tối thiểu:
  ```json
  {
    "test_id": "reading-YYYY-MM-DD-XX",
    "title": "Tên đề",
    "parts": [
      {
        "part": 1,
        "name": "Part 1",
        "instructions": "Read the passage and answer Questions 1-13.",
        "passage": { "title": "Tiêu đề passage", "paragraphs": ["đoạn 1", "đoạn 2", "..."] },
        "question_groups": [
          {
            "type": "TFNG",
            "instructions": "Do the following statements agree with the information given in Reading Passage 1?\nIn boxes 1-5 on your answer sheet, write\nTRUE...\nFALSE...\nNOT GIVEN...",
            "questions": [
              { "number": 1, "statement": "...", "answer": "TRUE" }
            ]
          }
        ]
      }
    ]
  }
  ```
- Các `type` hỗ trợ: `TFNG`, `YNNG`, `MCQ` (`subtype`: `single` | `multiple`), `MATCH_OPTIONS`, `MATCH_HEADINGS`, `SUMMARY_COMPLETION` (dùng `{{number}}` trong text), `SUMMARY_COMPLETION_BOX` (có `word_bank` + `{{number}}`), `SENTENCE_COMPLETION`, `SHORT_ANSWER`.
- Với summary/table có blank: thêm `answers` (mỗi item: `number`, `answer` string hoặc array).
- MCQ/matching: `options[{label,text}]`, `answer` khớp label.
- Passage và câu hỏi là plain text (không HTML). Instruction phải tự cung cấp trong JSON; tool không tự suy diễn.

# Quy trình dùng nhanh
1) Chuẩn bị JSON đúng schema (xem `data/sample-reading.json`).
2) Chọn 1 trong 2 cách sinh HTML:
   - Dùng `tool.html` (UI, không cần Node).
   - Dùng CLI `node scripts/generate-reading.js input.json output.html` (cần Node).
3) Mở file HTML đầu ra trong trình duyệt, kiểm tra timer, navigation, highlight, check answer.

# Dùng giao diện `tool.html`
## Cách A: Mở trực tiếp (file://, offline)
1) Double-click `tool.html`.
2) Nếu template chưa load, dùng nút chọn file để trỏ tới `template/base-reading.html`.
3) Paste JSON hoặc nhấn **Load sample** để xem thử.
4) Nhấn **Generate file** → xem preview ngay trong khung, và tải HTML về.

## Cách B: Chạy server tĩnh (tránh lỗi CORS)
1) Mở terminal tại thư mục repo, chạy:
   - Python 3: `python -m http.server 8000`
   - hoặc `npx serve` (nếu có Node).
2) Mở trình duyệt vào `http://localhost:8000/tool.html`.
3) Paste JSON hoặc **Load sample**, nhấn **Generate file**.

# Dùng CLI (cần Node)
```
node scripts/generate-reading.js data/sample-reading.json dist/demo.html
```
- Tham số 1: đường dẫn JSON đầu vào.
- Tham số 2 (tùy chọn): đường dẫn HTML đầu ra (mặc định dist/<test_id>.html).
- Script sẽ thay marker trong template, inject đáp án và ranges vào `window.testMeta`.

# Kiểm tra sau khi sinh HTML
- Mở file HTML vừa sinh, duyệt đủ 3 part, thử navigation, timer, highlight, drag/drop, và nút **Check Answers**.
- Nếu instruction hoặc nội dung thiếu: kiểm tra lại JSON (đặc biệt `instructions`, `options`, `answers`).
- Nếu bị nhảy màn hình khi click đáp án, chắc chắn đã lấy template mới trong repo (đã fix phần click trên input không gọi navigate).

# Mẹo tạo JSON bằng ChatGPT
- Nhờ ChatGPT trích plain text từ PDF trước, sau đó tạo JSON theo schema trên.
- Nhắc rõ: không Markdown, không giải thích; 40 câu liên tục; có `answers` cho blank/summary.
- Với MCQ: đảm bảo label A/B/C/D khớp `answer`.

# Ghi nhớ
- Tool hoàn toàn offline, không gọi API.
- Template `template/base-reading.html` giữ nguyên JS/CSS gốc; chỉ thay nội dung bằng generator.
- Nếu đổi template, giữ nguyên các marker `PASSAGES_START`, `QUESTIONS_START`, `FOOTER_NAV`, `TEST_META_SCRIPT` để generator thay đúng chỗ.
