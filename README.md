# IELTS Reading HTML Generator

A local-only tool that turns structured JSON into a fully interactive IELTS Reading HTML file. It reuses the behaviour and styling from `template/base-reading.html`, so the generated pages match the working sample (timer, navigation, highlights, answer checking, band score modal, drag/drop blanks, etc.).

## Project layout

- `template/base-reading.html` – master template (with placeholders and default fallback content).
- `scripts/generator.js` – rendering helpers (works in Node or the browser).
- `scripts/generate-reading.js` – CLI wrapper to build an output HTML file.
- `data/sample-reading.json` – example input covering all supported question types.
- `tool.html` – lightweight UI to paste JSON and download the generated HTML.

## Using the CLI (Node)

```
node scripts/generate-reading.js data/sample-reading.json dist/demo.html
```

- Input: JSON following the shape shown in `data/sample-reading.json`.
- Output: HTML saved to `dist/` (or a custom path if you pass a second argument).
- The script injects `window.testMeta` (answers + part ranges) and replaces template markers for passages, questions, and navigation.

## Using the browser UI

1. Serve the repo locally so the browser can fetch the template file (for example):
   - `python -m http.server 8000` (Python 3), then open `http://localhost:8000/tool.html`
   - or `npx serve` from the repo root if you already have Node.
2. Open `tool.html`.
3. Paste JSON or click **Load sample**.
4. Hit **Generate file** to download the ready-to-use HTML (preview is shown inline).

## JSON shape (essentials)

- Top-level: `test_id`, `title`, `parts` (array).
- Each `part`: `part` (number), optional `name`/`instructions`, `passage` with `title` + `paragraphs` array, `question_groups` array.
- Supported `question_groups.type` values:
  - `TFNG`, `YNNG` (statements + TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN)
  - `MCQ` (`subtype`: `single` | `multiple`)
  - `MATCH_OPTIONS`, `MATCH_HEADINGS` (select dropdowns with an options list)
  - `SUMMARY_COMPLETION` (use `{{number}}` placeholders inside `paragraphs`)
  - `SUMMARY_COMPLETION_BOX` (same placeholders + `word_bank` for drag/drop)
  - `SENTENCE_COMPLETION` / `SHORT_ANSWER`
- Answers:
  - For most groups: each question needs `number` and `answer` (string or array).
  - For summary groups: provide an `answers` array with `number` + `answer`.
- Keep question numbers unique and sequential across all parts; the generator builds navigation and `correctAnswers` from them.

## Tips for creating JSON with ChatGPT

- Ask ChatGPT to extract plain text from the PDF first.
- Provide the question schema above and request raw JSON (no Markdown).
- Remind it to keep numbering continuous from 1–40 and include an `answers` array for summary/box blanks.

## Notes

- The template still contains the original sample content as a fallback; generated files replace the marked sections and inject fresh metadata.
- Drag/drop blanks share a `data-dnd-group` value per group so options only snap to their own blanks.
- The generator stays offline; no API calls are used at runtime.
