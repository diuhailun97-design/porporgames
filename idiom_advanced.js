/* ========================================================
   3. 成語猜猜（升級版）模組 - 4 字全選挑戰
   ======================================================== */
let idiomAdvSets = [];
let currentAdvSetIdx = 0;
let currentAdvIdiomInSet = 0;
let userSelectedAdvChars = ['', '', '', '']; // 4 個空格填入的字
let userSelectedCandidateIndices = [-1, -1, -1, -1]; // 對應候選字索引
let activeAdvSlotIndex = 0; // 目前游標所在的格子 (0..3)
let currentAdvCandidates = []; // 目前題目的 8 個候選字

const fallbackAdvIdioms = [
  [
    { text: '龍精虎猛', meaning: '比喻精力充沛，神采飛揚，身體健壯。', options: ['德', '終', '尊', '安'] },
    { text: '身體健康', meaning: '祝願生活平安無病無痛，身體強健安泰。', options: ['大', '樂', '平', '福'] },
    { text: '出入平安', meaning: '出門同返屋企都平平安安，順順利利。', options: ['康', '定', '祥', '吉'] },
    { text: '開開心心', meaning: '心情舒暢愉快，每日滿臉笑容。', options: ['放', '歡', '喜', '樂'] },
    { text: '萬事勝意', meaning: '所有事情都稱心如意，比想像中更好。', options: ['如', '稱', '吉', '順'] },
    { text: '長命百歲', meaning: '祝願長者長壽健康，福壽雙全。', options: ['生', '年', '樂', '富'] },
    { text: '福如東海', meaning: '比喻福氣如同東海之水一樣浩大無窮。', options: ['壽', '吉', '春', '祥'] },
    { text: '壽比南山', meaning: '祝願壽命如同南山一樣長久不衰。', options: ['福', '山', '天', '海'] },
    { text: '吉祥如意', meaning: '吉祥幸運，萬事都能符合心意。', options: ['星', '慶', '順', '和'] },
    { text: '四季平安', meaning: '一年四季春夏秋冬都平平安安。', options: ['長', '大', '順', '利'] }
  ]
];

const distractorCharPool = "天地人和福壽康寧吉祥如意春夏秋冬山明水秀心平氣和風調雨順富貴雙全喜氣洋洋吉星高照長長久久步步高陞金玉滿堂笑口常開";

async function fetchIdiomsAdvXML() {
  try {
    const res = await fetch('chinesewords.xml');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const setNodes = xmlDoc.getElementsByTagName('set');

    const loadedSets = [];
    for (let s = 0; s < setNodes.length; s++) {
      const qNodes = setNodes[s].getElementsByTagName('question');
      const setList = [];
      for (let q = 0; q < qNodes.length; q++) {
        const text = qNodes[q].getElementsByTagName('text')[0]?.textContent.trim() || '';
        const meaning = qNodes[q].getElementsByTagName('meaning')[0]?.textContent.trim() || '';
        const optNodes = qNodes[q].getElementsByTagName('option');
        const options = [];
        for (let o = 0; o < optNodes.length; o++) {
          options.push(optNodes[o].textContent.trim());
        }
        if (text.length === 4) {
          setList.push({ text, meaning, options });
        }
      }
      if (setList.length > 0) loadedSets.push(setList);
    }

    if (loadedSets.length > 0) {
      idiomAdvSets = loadedSets;
    } else {
      idiomAdvSets = fallbackAdvIdioms;
    }
  } catch (err) {
    console.warn('載入升級版成語題庫失敗，使用備用題庫:', err);
    idiomAdvSets = fallbackAdvIdioms;
  }

  initAdvSetDropdown();
  loadCurrentAdvQuestion();
}

function initAdvSetDropdown() {
  const select = document.getElementById('adv-set-dropdown');
  if (!select) return;
  select.innerHTML = '';
  try {
    const saved = localStorage.getItem('grandma_idiom_adv_set');
    if (saved !== null) {
      currentAdvSetIdx = parseInt(saved, 10) || 0;
      if (currentAdvSetIdx >= idiomAdvSets.length) currentAdvSetIdx = 0;
    }
  } catch (e) {}

  for (let i = 0; i < idiomAdvSets.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `第 ${i + 1} 組 (題 ${i * 10 + 1}-${i * 10 + 10})`;
    if (i === currentAdvSetIdx) opt.selected = true;
    select.appendChild(opt);
  }
}

function onSelectAdvSet(idx) {
  currentAdvSetIdx = parseInt(idx, 10);
  currentAdvIdiomInSet = 0;
  saveAdvIdiomProgress();
  loadCurrentAdvQuestion();
}

function saveAdvIdiomProgress() {
  try {
    localStorage.setItem('grandma_idiom_adv_set', currentAdvSetIdx);
  } catch (e) {}
}

function loadCurrentAdvQuestion() {
  if (!idiomAdvSets[currentAdvSetIdx]) return;
  const curSet = idiomAdvSets[currentAdvSetIdx];
  const cur = curSet[currentAdvIdiomInSet];

  userSelectedAdvChars = ['', '', '', ''];
  userSelectedCandidateIndices = [-1, -1, -1, -1];
  activeAdvSlotIndex = 0;

  // 產生 8 個候選字：包含成語全部 4 字 + 4 個干擾字
  const fullChars = cur.text.split('');
  const distractors = [];

  // 先從 XML 自帶選項中抓不屬於成語的字
  (cur.options || []).forEach(opt => {
    if (!fullChars.includes(opt) && !distractors.includes(opt) && opt.length === 1) {
      distractors.push(opt);
    }
  });

  // 若不足 4 個，自干擾庫補齊
  let poolIdx = 0;
  while (distractors.length < 4 && poolIdx < distractorCharPool.length) {
    const char = distractorCharPool[poolIdx++];
    if (!fullChars.includes(char) && !distractors.includes(char)) {
      distractors.push(char);
    }
  }

  // 混合並打亂 8 個字
  const candidatePool = [...fullChars, ...distractors.slice(0, 4)];
  // Fisher-Yates 洗牌
  for (let i = candidatePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidatePool[i], candidatePool[j]] = [candidatePool[j], candidatePool[i]];
  }
  currentAdvCandidates = candidatePool;

  renderAdvIdiom();
}

function renderAdvIdiom() {
  if (!idiomAdvSets[currentAdvSetIdx]) return;
  const curSet = idiomAdvSets[currentAdvSetIdx];
  const cur = curSet[currentAdvIdiomInSet];

  const progressLabel = document.getElementById('adv-progress-label');
  if (progressLabel) {
    progressLabel.innerText = `第 ${currentAdvSetIdx + 1} 組 ・ 第 ${currentAdvIdiomInSet + 1} / ${curSet.length} 題`;
  }
  const setDropdown = document.getElementById('adv-set-dropdown');
  if (setDropdown) {
    setDropdown.value = currentAdvSetIdx;
  }
  const meaningEl = document.getElementById('adv-meaning');
  if (meaningEl) {
    meaningEl.innerText = '💡 提示：' + cur.meaning;
  }

  // 渲染 4 個字槽
  const displayBox = document.getElementById('adv-display');
  if (displayBox) {
    displayBox.innerHTML = '';
    for (let slot = 0; slot < 4; slot++) {
      const char = userSelectedAdvChars[slot];
      const slotBox = document.createElement('div');
      slotBox.className = 'char-box adv-slot';
      if (slot === activeAdvSlotIndex) {
        slotBox.classList.add('active-slot');
      }
      if (!char) {
        slotBox.classList.add('blank');
        slotBox.innerText = `(${slot + 1})`;
        slotBox.style.color = '#B0A898';
        slotBox.style.fontSize = '32px';
      } else {
        slotBox.innerText = char;
        slotBox.style.color = 'var(--text-main)';
        slotBox.style.fontSize = '48px';
      }
      slotBox.onclick = () => onSlotClick(slot);
      displayBox.appendChild(slotBox);
    }
  }

  // 渲染 8 個候選字按鈕
  const optionsBox = document.getElementById('adv-options');
  if (optionsBox) {
    optionsBox.innerHTML = '';
    currentAdvCandidates.forEach((char, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn adv-opt-btn';
      btn.innerText = char;
      const isUsed = userSelectedCandidateIndices.includes(idx);
      if (isUsed) {
        btn.classList.add('used');
        btn.disabled = true;
      } else {
        btn.onclick = () => onSelectCandidate(char, idx);
      }
      optionsBox.appendChild(btn);
    });
  }
}

// 點擊字槽：選取該字槽或清除該字槽
function onSlotClick(slot) {
  if (userSelectedAdvChars[slot]) {
    // 若該格已有字，點擊即清除該格
    userSelectedAdvChars[slot] = '';
    userSelectedCandidateIndices[slot] = -1;
    activeAdvSlotIndex = slot;
  } else {
    activeAdvSlotIndex = slot;
  }
  renderAdvIdiom();
}

// 點擊候選字：填入目前的字槽
function onSelectCandidate(char, candIdx) {
  userSelectedAdvChars[activeAdvSlotIndex] = char;
  userSelectedCandidateIndices[activeAdvSlotIndex] = candIdx;

  // 自動尋找下一個未填寫的格子
  let nextEmpty = -1;
  for (let i = 0; i < 4; i++) {
    if (!userSelectedAdvChars[i]) {
      nextEmpty = i;
      break;
    }
  }
  if (nextEmpty !== -1) {
    activeAdvSlotIndex = nextEmpty;
  }

  renderAdvIdiom();

  // 若 4 個字槽都填妥，立即進行整句核對
  if (userSelectedAdvChars.every(c => c !== '')) {
    setTimeout(checkAdvAnswer, 150);
  }
}

// 清除目前 4 格重選
function clearAdvSelection() {
  userSelectedAdvChars = ['', '', '', ''];
  userSelectedCandidateIndices = [-1, -1, -1, -1];
  activeAdvSlotIndex = 0;
  renderAdvIdiom();
}

// 核對 4 字成語
function checkAdvAnswer() {
  const curSet = idiomAdvSets[currentAdvSetIdx];
  const cur = curSet[currentAdvIdiomInSet];
  const answer = userSelectedAdvChars.join('');

  if (answer === cur.text) {
    // 答對全 4 字！
    if (currentAdvIdiomInSet === curSet.length - 1) {
      playFanfare();
      setTimeout(showAdvSetCompletionPopup, 450);
    } else {
      playChime(true);
      showFeedback(
        "太犀利喇！🎉",
        `4 個字全部答啱晒：「${cur.text}」！婆婆記性真係一流！`,
        true,
        () => {
          if (currentAdvIdiomInSet < curSet.length - 1) {
            currentAdvIdiomInSet++;
            loadCurrentAdvQuestion();
          }
        }
      );
    }
  } else {
    // 答錯
    playChime(false);
    showFeedback(
      "差少少，再試試！🌸",
      `您選了「${answer}」，同謎底有少少出入。點擊格子可重選字詞，再諗諗提示！`,
      false
    );
  }
}

function prevAdvIdiom() {
  if (currentAdvIdiomInSet > 0) {
    currentAdvIdiomInSet--;
    loadCurrentAdvQuestion();
  }
}

function nextAdvIdiom() {
  const curSet = idiomAdvSets[currentAdvSetIdx];
  if (currentAdvIdiomInSet < curSet.length - 1) {
    currentAdvIdiomInSet++;
    loadCurrentAdvQuestion();
  } else {
    showAdvSetCompletionPopup();
  }
}

function showAdvSetCompletionPopup() {
  const popupTitle = document.getElementById('set-popup-title');
  const popupBody = document.getElementById('set-popup-body');
  const nextBtn = document.getElementById('next-set-btn');
  const popup = document.getElementById('set-popup');

  if (popupTitle) popupTitle.innerText = `太叻喇！第 ${currentAdvSetIdx + 1} 組（升級版）通關！🎉`;
  const nextIdx = currentAdvSetIdx + 1;

  if (popupBody && nextBtn) {
    if (nextIdx < idiomAdvSets.length) {
      popupBody.innerText = `婆婆真係好聰明！第 ${currentAdvSetIdx + 1} 組 10 題成語（每題 4 字全猜）全部大功告成！`;
      nextBtn.innerText = `挑戰第 ${nextIdx + 1} 組 ➡️`;
      nextBtn.onclick = () => goToNextAdvSet();
    } else {
      popupBody.innerText = `恭喜婆婆！全部升級版成語全破！頭腦極之靈活！`;
      nextBtn.innerText = `從第 1 組重新挑戰 🔄`;
      nextBtn.onclick = () => goToNextAdvSet();
    }
  }

  if (popup) popup.classList.add('show');
}

function goToNextAdvSet() {
  const popup = document.getElementById('set-popup');
  if (popup) popup.classList.remove('show');
  if (currentAdvSetIdx < idiomAdvSets.length - 1) {
    currentAdvSetIdx++;
  } else {
    currentAdvSetIdx = 0;
  }
  currentAdvIdiomInSet = 0;
  saveAdvIdiomProgress();
  loadCurrentAdvQuestion();
  playChime(true);
}

function replayCurrentAdvSet() {
  const popup = document.getElementById('set-popup');
  if (popup) popup.classList.remove('show');
  currentAdvIdiomInSet = 0;
  loadCurrentAdvQuestion();
}

// 初始化升級版成語題目
fetchIdiomsAdvXML();