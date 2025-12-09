(() => {
  const toArray = (value) => Array.isArray(value) ? value : (value ? [value] : []);

  const htmlEscape = (str) => {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const rangeFromNumbers = (numbers) => {
    const filtered = numbers.filter((n) => !Number.isNaN(n));
    if (!filtered.length) return { start: 0, end: 0 };
    return { start: Math.min(...filtered), end: Math.max(...filtered) };
  };

  const defaultInstructions = (type, start, end, partNumber, group) => {
    const qRange = (start && end) ? `${start}-${end}` : '';
    const passageNo = partNumber || '';
    const subtype = (group?.subtype || '').toLowerCase();
    switch ((type || '').toUpperCase()) {
      case 'TFNG':
        return `Do the following statements agree with the information given in Reading Passage ${passageNo}?` +
          `\nIn boxes ${qRange} on your answer sheet, write` +
          `\nTRUE if the statement agrees with the information` +
          `\nFALSE if the statement contradicts the information` +
          `\nNOT GIVEN if there is no information on this`;
      case 'YNNG':
        return `Do the following statements agree with the views of the writer?` +
          `\nIn boxes ${qRange} on your answer sheet, write` +
          `\nYES if the statement agrees with the writer's views` +
          `\nNO if the statement contradicts the writer's views` +
          `\nNOT GIVEN if it is impossible to say what the writer thinks about this`;
      case 'MATCH_HEADINGS':
        return `Choose the correct heading for each paragraph from the list below.` +
          `\nWrite the correct number i-x in boxes ${qRange} on your answer sheet.`;
      case 'MATCH_OPTIONS':
        return `Use the information in the passage to match the items.` +
          `\nWrite the correct letter in boxes ${qRange} on your answer sheet.`;
      case 'MATCH_ENDINGS':
        return `Complete the sentences below.` +
          `\nChoose the correct ending from the box.` +
          `\nWrite the correct letter in boxes ${qRange} on your answer sheet.`;
      case 'MCQ':
        if (subtype === 'multiple') {
          return `Choose TWO letters (unless stated otherwise).` +
            `\nWrite the correct letters in boxes ${qRange} on your answer sheet.`;
        }
        return `Choose the correct letter A, B, C or D.` +
          `\nWrite the correct letter in boxes ${qRange} on your answer sheet.`;
      case 'SUMMARY_COMPLETION':
        return `Complete the summary below.` +
          `\nWrite NO MORE THAN TWO WORDS from the passage for each answer.` +
          `\nWrite your answers in boxes ${qRange} on your answer sheet.`;
      case 'SUMMARY_COMPLETION_BOX':
        return `Choose the correct words from the box below to complete the summary.` +
          `\nWrite your answers in boxes ${qRange} on your answer sheet.`;
      case 'SENTENCE_COMPLETION':
        return `Complete the sentences below.` +
          `\nWrite NO MORE THAN TWO WORDS from the passage for each answer.` +
          `\nWrite your answers in boxes ${qRange} on your answer sheet.`;
      case 'SHORT_ANSWER':
        return `Answer the questions below.` +
          `\nWrite NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.` +
          `\nWrite your answers in boxes ${qRange} on your answer sheet.`;
      default:
        return qRange ? `Questions ${qRange}` : '';
    }
  };

  const renderInstructionsBlock = (instructions, start, end, type, partNumber, group) => {
    const title = (start && end) ? `<p><strong>Questions ${start}-${end}</strong></p>` : '';
    const userLines = (instructions || '').split(/\n+/).filter(Boolean);
    if (userLines.length === 0 && !title) return '';
    const body = userLines.map((line) => `<p>${htmlEscape(line)}</p>`).join('');
    return `<div class="question-prompt">${title}${body}</div>`;
  };

  const replaceSection = (template, key, content) => {
    const regex = new RegExp(`<!-- ${key}_START -->([\\s\\S]*?)<!-- ${key}_END -->`);
    return template.replace(regex, `<!-- ${key}_START -->\n${content}\n<!-- ${key}_END -->`);
  };

  const injectMetaScript = (template, meta) => {
    const script = `<script>window.testMeta = ${JSON.stringify(meta)};</script>`;
    return template.replace('<!-- TEST_META_SCRIPT -->', script);
  };

  const getGroupNumbers = (group) => {
    const numbers = [];
    if (Array.isArray(group.questions)) {
      group.questions.forEach((q) => {
        if (q && q.number !== undefined) numbers.push(Number(q.number));
      });
    }
    if (Array.isArray(group.answers)) {
      group.answers.forEach((a) => {
        if (a && a.number !== undefined) numbers.push(Number(a.number));
      });
    }
    if (Array.isArray(group.items)) {
      group.items.forEach((item) => {
        if (item && item.number !== undefined) numbers.push(Number(item.number));
      });
    }
    return numbers;
  };

  const recordAnswers = (group, answersMap) => {
    const pushAnswer = (number, answer) => {
      if (number === undefined) return;
      answersMap[String(number)] = answer;
    };

    if (Array.isArray(group.questions)) {
      group.questions.forEach((q) => pushAnswer(q.number, q.answer));
    }
    if (Array.isArray(group.answers)) {
      group.answers.forEach((a) => pushAnswer(a.number, a.answer));
    }
    if (Array.isArray(group.items)) {
      group.items.forEach((item) => pushAnswer(item.number, item.answer));
    }
  };

  const buildMeta = (testData) => {
    const partsMeta = [];
    const correctAnswers = {};
    let maxQuestion = 0;

    (testData.parts || []).forEach((part) => {
      const partNumbers = [];
      (part.question_groups || []).forEach((group) => {
        const numbers = getGroupNumbers(group);
        numbers.forEach((n) => partNumbers.push(n));
        recordAnswers(group, correctAnswers);
      });

      const sorted = partNumbers.sort((a, b) => a - b);
      const start = sorted[0] ?? 1;
      const end = sorted[sorted.length - 1] ?? start;
      maxQuestion = Math.max(maxQuestion, end);
      partsMeta.push({ part: part.part, start, end });
    });

    return {
      totalQuestions: testData.totalQuestions || maxQuestion,
      parts: partsMeta.sort((a, b) => a.part - b.part),
      correctAnswers
    };
  };

  const validateTestData = (test) => {
    const errors = [];
    if (!test || !Array.isArray(test.parts) || test.parts.length === 0) {
      errors.push('parts array is required.');
      return errors;
    }

    const questionSet = new Set();
    test.parts.forEach((part) => {
      if (typeof part.part !== 'number') {
        errors.push('each part needs a numeric "part" field.');
      }
      (part.question_groups || []).forEach((group) => {
        const type = (group.type || '').toUpperCase();
        const supportedTypes = new Set([
          'TFNG',
          'YNNG',
          'MCQ',
          'MATCH_OPTIONS',
          'MATCH_HEADINGS',
          'SUMMARY_COMPLETION',
          'SUMMARY_COMPLETION_BOX',
          'SENTENCE_COMPLETION',
          'SHORT_ANSWER'
        ]);
        if (!supportedTypes.has(type)) {
          errors.push(`unsupported question type: ${group.type}`);
        }
        const nums = getGroupNumbers(group);
        nums.forEach((n) => {
          if (questionSet.has(n)) {
            errors.push(`duplicate question number ${n}`);
          } else {
            questionSet.add(n);
          }
        });
      });
    });

    if (questionSet.size === 0) {
      errors.push('no questions detected.');
    }
    return errors;
  };

  const renderPartHeaders = (parts, metaParts) => {
    const firstPart = metaParts[0]?.part;
    return metaParts.map((meta) => {
      const part = parts.find((p) => p.part === meta.part) || {};
      const title = part.name || `Part ${meta.part}`;
      const instruction = part.instructions || `Read the text and answer questions ${meta.start}-${meta.end}.`;
      const hidden = meta.part === firstPart ? '' : ' hidden';
      return `
                <div id="part-header-${meta.part}" class="part-header${hidden}">
                    <p><strong>${title}</strong></p>
                    <p>${instruction}</p>
                </div>`.trim();
    }).join('\n');
  };

  const renderPassages = (parts) => {
    const firstPart = parts[0]?.part;
    return parts.map((part) => {
      const hidden = part.part === firstPart ? '' : ' hidden';
      const paragraphs = (part.passage?.paragraphs || []).map((p) => `                    <p>${p}</p>`).join('\n');
      const title = part.passage?.title || `Passage ${part.part}`;
      return `
                <div id="passage-text-${part.part}" class="reading-passage${hidden}">
                    <h4 class="text-center">${title}</h4>
${paragraphs}
                </div>`.trim();
    }).join('\n');
  };

  const renderTfGroup = (group, type, partNumber) => {
    const questions = (group.questions || []).map((q) => {
      const options = group.options || (type === 'YNNG' ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN']);
      const optionsHtml = options.map((opt) => `<label class="tf-option"><input type="radio" name="q${q.number}" value="${opt}"> ${opt}</label>`).join('');
      return `
                            <div class="tf-question" data-q-start="${q.number}" data-q-end="${q.number}">
                                <div class="tf-question-line"><span class="tf-question-number">${q.number}</span><span class="tf-question-text">${q.statement}</span></div>
                                <div class="tf-options">${optionsHtml}</div>
                            </div>`.trim();
    }).join('\n');

    const { start, end } = rangeFromNumbers((group.questions || []).map((q) => q.number));
    const prompt = renderInstructionsBlock(group.instructions, start, end, type, partNumber, group);
    return `
                        <div class="question" data-q-start="${start}" data-q-end="${end}">
${prompt}
${questions}
                        </div>`.trim();
  };

  const renderMcqGroup = (group, partNumber) => {
    const questions = (group.questions || []).map((q) => {
      const isMultiple = group.subtype === 'multiple';
      const inputType = isMultiple ? 'checkbox' : 'radio';
      const optionsHtml = (q.options || []).map((opt) => {
        return `<div class="multi-choice-option"><label><input type="${inputType}" name="q${q.number}" value="${opt.label}"> ${opt.text}</label></div>`;
      }).join('\n');
      return `
                            <div class="multi-choice-question" data-q-start="${q.number}" data-q-end="${q.number}">
                                <div class="multi-choice-options">
                                    <p><strong>${q.question_text}</strong></p>
${optionsHtml}
                                </div>
                            </div>`.trim();
    }).join('\n');

    const { start, end } = rangeFromNumbers((group.questions || []).map((q) => q.number));
    const prompt = renderInstructionsBlock(group.instructions, start, end, group.type, partNumber, group);
    return `
                        <div class="question" data-q-start="${start}" data-q-end="${end}">
${prompt}
${questions}
                        </div>`.trim();
  };

  const renderMatchingSelect = (group, partNumber) => {
    const { start, end } = rangeFromNumbers((group.questions || []).map((q) => q.number));

    const optionsList = (group.options || []).map((opt) => `<li>${opt.label} ${opt.text}</li>`).join('\n');
    const optionsBox = group.options ? `
                            <div class="example-box" style="font-size: 15px;">
                                <p><strong>${group.options_title || 'List of Options'}</strong></p>
                                <ul style="list-style-type: ${group.options_list_style || 'upper-alpha'}; margin-left: 20px;">
${optionsList}
                                </ul>
                            </div>` : '';

    const rows = (group.questions || []).map((q) => {
      const opts = (group.options || []).map((opt) => `<option value="${htmlEscape(opt.label)}">${opt.label}</option>`).join('');
      return `
                                <div class="matching-form-row">
                                    <label for="q${q.number}" class="matching-form-label"><strong>${q.number}</strong>&nbsp;&nbsp;${q.prompt}</label>
                                    <select class="answer-input" id="q${q.number}"><option value=""></option>${opts}</select>
                                </div>`.trim();
    }).join('\n');

    const prompt = renderInstructionsBlock(group.instructions, start, end, group.type, partNumber, group);
    return `
                        <div class="question" data-q-start="${start}" data-q-end="${end}">
${prompt}
${optionsBox}
                            <div class="matching-form-container">
${rows}
                            </div>
                        </div>`.trim();
  };

  const injectInputsIntoParagraph = (text, blankRenderer) => {
    return text.replace(/{{\s*(\d+)\s*}}/g, (_match, qNum) => blankRenderer(Number(qNum)));
  };

  const renderSummaryCompletion = (group, useDropZones, partNumber) => {
    const paragraphs = (group.paragraphs || []).map((p) => {
      return `                            <p>${injectInputsIntoParagraph(p, (qNum) => {
        if (useDropZones) {
          const groupId = group.dnd_group || `summary-${group.group_id || 'g'}`;
          return `<span class="summary-drop-zone drop-zone" id="q${qNum}" data-q-start="${qNum}" data-q-end="${qNum}" data-dnd-group="${groupId}">${qNum}</span>`;
        }
        return `<input type="text" class="answer-input" id="q${qNum}" placeholder="${qNum}">`;
      })}</p>`;
    }).join('\n');

    const wordBank = useDropZones ? `
                            <div class="drag-options-container" data-dnd-group="${group.dnd_group || `summary-${group.group_id || 'g'}`}">
${(group.word_bank || []).map((item) => `                                <div class="drag-item" draggable="true" data-value="${htmlEscape(item)}" data-dnd-group="${group.dnd_group || `summary-${group.group_id || 'g'}`}">${item}</div>`).join('\n')}
                            </div>` : '';

    const { start, end } = rangeFromNumbers((group.answers || []).map((a) => a.number));
    const prompt = renderInstructionsBlock(group.instructions, start, end, group.type, partNumber, group);

    return `
                        <div class="question" data-q-start="${start}" data-q-end="${end}">
${prompt}
${wordBank}
${paragraphs}
                        </div>`.trim();
  };

  const renderSentenceCompletion = (group, partNumber) => {
    const questions = (group.questions || []).map((q) => `
                            <p>${q.sentence_before || ''}<input type="text" class="answer-input" id="q${q.number}" placeholder="${q.number}">${q.sentence_after || ''}</p>`.trim()).join('\n');
    const { start, end } = rangeFromNumbers((group.questions || []).map((q) => q.number));
    const prompt = renderInstructionsBlock(group.instructions, start, end, group.type, partNumber, group);
    return `
                        <div class="question" data-q-start="${start}" data-q-end="${end}">
${prompt}
${questions}
                        </div>`.trim();
  };

  const renderQuestionGroup = (group, partNumber) => {
    const type = (group.type || '').toUpperCase();
    if (type === 'TFNG' || type === 'YNNG') return renderTfGroup(group, type, partNumber);
    if (type === 'MCQ') return renderMcqGroup(group, partNumber);
    if (type === 'MATCH_OPTIONS' || type === 'MATCH_HEADINGS') return renderMatchingSelect(group, partNumber);
    if (type === 'SUMMARY_COMPLETION') return renderSummaryCompletion(group, false, partNumber);
    if (type === 'SUMMARY_COMPLETION_BOX') return renderSummaryCompletion(group, true, partNumber);
    if (type === 'SENTENCE_COMPLETION' || type === 'SHORT_ANSWER') return renderSentenceCompletion(group, partNumber);
    throw new Error(`Unsupported question type: ${group.type}`);
  };

  const renderQuestions = (testData) => {
    const firstPart = testData.parts?.[0]?.part;
    return (testData.parts || []).map((part) => {
      const hidden = part.part === firstPart ? '' : ' hidden';
      const groupsHtml = (part.question_groups || []).map((group) => renderQuestionGroup(group, part.part)).join('\n');
      return `
                <div id="questions-${part.part}" class="question-set${hidden}">
                    <div class="questions-container">
${groupsHtml}
                    </div>
                </div>`.trim();
    }).join('\n');
  };

  const renderFooterNav = (partsMeta) => {
    const firstPart = partsMeta[0]?.part;
    const buildPart = (meta) => {
      const questionButtons = [];
      for (let i = meta.start; i <= meta.end; i++) {
        questionButtons.push(`<button class="subQuestion scorable-item" onclick="goToQuestion(${i})"><span class="sr-only">Question ${i}</span><span aria-hidden="true">${i}</span></button>`);
      }
      return `
        <div class="footer__questionWrapper___1tZ46 multiple${meta.part === firstPart ? ' selected' : ''}" role="tablist">
            <button role="tab" class="footer__questionNo___3WNct" onclick="switchToPart(${meta.part})">
                <span>
                    <span aria-hidden="true" class="section-prefix">Part </span>
                    <span class="sectionNr" aria-hidden="true">${meta.part}</span>
                    <span class="attemptedCount" aria-hidden="true">0 of ${meta.end - meta.start + 1}</span>
                </span>
            </button>
            <div class="footer__subquestionWrapper___9GgoP">
${questionButtons.join('\n')}
            </div>
        </div>`.trim();
    };
    const partsHtml = partsMeta.map(buildPart).join('\n        ');
    return `
    <nav class="nav-row perScorableItem" aria-label="Questions">
${partsHtml}
        <button id="deliver-button" aria-label="Review your answers" class="footer__deliverButton___3FM07">
            <i class="fa fa fa-check" aria-hidden="true"></i>
            <span>Check Answers</span>
        </button>
    </nav>`.trim();
  };

  const renderFromJson = (testData, templateHtml) => {
    const validationErrors = validateTestData(testData);
    if (validationErrors.length) {
      throw new Error(`Invalid test data: ${validationErrors.join('; ')}`);
    }

    const meta = buildMeta(testData);
    let html = replaceSection(templateHtml, 'PART_HEADERS', renderPartHeaders(testData.parts, meta.parts));
    html = replaceSection(html, 'PASSAGES', renderPassages(testData.parts));
    html = replaceSection(html, 'QUESTIONS', renderQuestions(testData));
    html = replaceSection(html, 'FOOTER_NAV', renderFooterNav(meta.parts));
    html = injectMetaScript(html, meta);
    return { html, meta };
  };

  const api = {
    buildMeta,
    renderFromJson,
    renderQuestions,
    replaceSection,
    injectMetaScript,
    validateTestData
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (typeof window !== 'undefined') {
    window.IeltsGenerator = api;
  }
})();
