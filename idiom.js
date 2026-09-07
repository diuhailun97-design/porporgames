/* ========================================================
   1. 成語猜猜模組 (載入自 chinesewords.xml)
   ======================================================== */
let idiomSets = [];
let currentSetIdx = 0;
let currentIdiomInSet = 0;
let isLastAnswerCorrect = false;

// 內建備用題庫 (若未連伺服器或本地file://無法fetch時自動啟用)
const fallbackIdioms = [
  [
    { chars: ['龍', '精', '虎', '猛'], blankIndex: 1, meaning: '比喻精力充沛，神采飛揚，身體健壯。', options: ['精', '心', '生', '真'] },
    { chars: ['身', '體', '健', '康'], blankIndex: 2, meaning: '祝願生活平安無病無痛，身體強健安泰。', options: ['健', '大', '樂', '安'] },
    { chars: ['出', '入', '平', '安'], blankIndex: 3, meaning: '出門同返屋企都平平安安，順順利利。', options: ['安', '康', '定', '祥'] },
    { chars: ['開', '開', '心', '心'], blankIndex: 0, meaning: '心情舒暢愉快，每日滿臉笑容。', options: ['開', '放', '歡', '喜'] },
    { chars: ['萬', '事', '勝', '意'], blankIndex: 2, meaning: '所有事情都稱心如意，比想像中更好。', options: ['勝', '如', '稱', '吉'] },
    { chars: ['長', '命', '百', '歲'], blankIndex: 1, meaning: '祝願長者長壽健康，福壽雙全。', options: ['命', '生', '年', '樂'] },
    { chars: ['福', '如', '東', '海'], blankIndex: 0, meaning: '比喻福氣如同東海之水一樣浩大無窮。', options: ['福', '壽', '吉', '春'] },
    { chars: ['壽', '比', '南', '山'], blankIndex: 0, meaning: '祝願壽命如同南山一樣長久不衰。', options: ['壽', '福', '山', '天'] },
    { chars: ['吉', '祥', '如', '意'], blankIndex: 1, meaning: '吉祥幸運，萬事都能符合心意。', options: ['祥', '星', '慶', '順'] },
    { chars: ['四', '季', '平', '安'], blankIndex: 2, meaning: '一年四季春夏秋冬都平平安安。', options: ['平', '長', '大', '順'] }
  ]
];

async function fetchIdiomsXML() {
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
        const text = qNodes[q].getElementsByTagName('text')[0]?.textContent || '';
        const blankIndex = parseInt(qNodes[q].getElementsByTagName('blankIndex')[0]?.textContent || '0', 10);
        const meaning = qNodes[q].getElementsByTagName('meaning')[0]?.textContent || '';
        const optNodes = qNodes[q].getElementsByTagName('option');
        const options = [];
        for (let o = 0; o < optNodes.length; o++) {
          options.push(optNodes[o].textContent.trim());
        }
        setList.push({
          chars: text.split(''),
          blankIndex: blankIndex,
          meaning: meaning,
          options: options
        });
      }
      if (setList.length > 0) loadedSets.push(setList);
    }

    if (loadedSets.length > 0) {
      idiomSets = loadedSets;
    } else {
      idiomSets = fallbackIdioms;
    }
  } catch (err) {
    console.warn('載入 chinesewords.xml 失敗，使用預設備用題庫:', err);
    idiomSets = fallbackIdioms;
  }

  initSetDropdown();
  renderIdiom();
}

function initSetDropdown() {
  const select = document.getElementById('set-dropdown');
  if (!select) return;
  select.innerHTML = '';
  try {
    const saved = localStorage.getItem('grandma_idiom_set');
    if (saved !== null) {
      currentSetIdx = parseInt(saved, 10) || 0;
      if (currentSetIdx >= idiomSets.length) currentSetIdx = 0;
    }
  } catch (e) {}

  for (let i = 0; i < idiomSets.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `第 ${i + 1} 組 (題 ${i * 10 + 1}-${i * 10 + 10})`;
    if (i === currentSetIdx) opt.selected = true;
    select.appendChild(opt);
  }
}

function onSelectSet(idx) {
  currentSetIdx = parseInt(idx, 10);
  currentIdiomInSet = 0;
  saveIdiomProgress();
  renderIdiom();
}

function saveIdiomProgress() {
  try {
    localStorage.setItem('grandma_idiom_set', currentSetIdx);
  } catch (e) {}
}

function renderIdiom() {
  if (!idiomSets[currentSetIdx]) return;
  const curSet = idiomSets[currentSetIdx];
  const cur = curSet[currentIdiomInSet];

  const progressLabel = document.getElementById('idiom-progress-label');
  if (progressLabel) {
    progressLabel.innerText = `第 ${currentSetIdx + 1} 組 ・ 第 ${currentIdiomInSet + 1} / ${curSet.length} 題`;
  }
  const setDropdown = document.getElementById('set-dropdown');
  if (setDropdown) {
    setDropdown.value = currentSetIdx;
  }
  const meaningEl = document.getElementById('idiom-meaning');
  if (meaningEl) {
    meaningEl.innerText = '💡 提示：' + cur.meaning;
  }

  const displayBox = document.getElementById('idiom-display');
  if (displayBox) {
    displayBox.innerHTML = '';
    cur.chars.forEach((c, idx) => {
      const div = document.createElement('div');
      div.className = 'char-box' + (idx === cur.blankIndex ? ' blank' : '');
      div.innerText = idx === cur.blankIndex ? '？' : c;
      div.id = `char-pos-${idx}`;
      displayBox.appendChild(div);
    });
  }

  const optionsBox = document.getElementById('idiom-options');
  if (optionsBox) {
    optionsBox.innerHTML = '';
    cur.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerText = opt;
      btn.onclick = () => chooseOption(opt);
      optionsBox.appendChild(btn);
    });
  }
}

function chooseOption(char) {
  const curSet = idiomSets[currentSetIdx];
  const cur = curSet[currentIdiomInSet];
  const targetChar = cur.chars[cur.blankIndex];
  const targetBox = document.getElementById(`char-pos-${cur.blankIndex}`);

  if (char === targetChar) {
    if (targetBox) {
      targetBox.innerText = char;
      targetBox.style.color = 'var(--secondary)';
    }
    isLastAnswerCorrect = true;

    // 如果是本組最後一題 (第 10 題)
    if (currentIdiomInSet === curSet.length - 1) {
      playFanfare();
      setTimeout(() => {
        showSetCompletionPopup();
      }, 450);
    } else {
      playChime(true);
      // 彈出確認訊息：婆婆點確認就直接進入下一題
      showFeedback("好叻呀！🎉", `答啱喇！「${cur.chars.join('')}」！`, true, () => {
        const curSet = idiomSets[currentSetIdx];
        if (currentIdiomInSet < curSet.length - 1) {
          currentIdiomInSet++;
          renderIdiom();
        }
      });
    }
  } else {
    isLastAnswerCorrect = false;
    playChime(false);
    showFeedback("差少少，再試試！🌸", `選了「${char}」，睇睇提示再諗一諗！`, false);
  }
}

function prevIdiom() {
  if (currentIdiomInSet > 0) {
    currentIdiomInSet--;
    renderIdiom();
  }
}

function nextIdiom() {
  const curSet = idiomSets[currentSetIdx];
  if (currentIdiomInSet < curSet.length - 1) {
    currentIdiomInSet++;
    renderIdiom();
  } else {
    showSetCompletionPopup();
  }
}

function showSetCompletionPopup() {
  const popupTitle = document.getElementById('set-popup-title');
  const popupBody = document.getElementById('set-popup-body');
  const nextBtn = document.getElementById('next-set-btn');
  const popup = document.getElementById('set-popup');

  if (popupTitle) popupTitle.innerText = `太叻喇！第 ${currentSetIdx + 1} 組完成！🎉`;
  const nextIdx = currentSetIdx + 1;

  if (popupBody && nextBtn) {
    if (nextIdx < idiomSets.length) {
      popupBody.innerText = `婆婆真係好精明，第 ${currentSetIdx + 1} 組 10 題成語全部順利過關！每日動動腦，越玩越精神！`;
      nextBtn.innerText = `挑戰第 ${nextIdx + 1} 組 ➡️`;
    } else {
      popupBody.innerText = `恭喜婆婆！全部成語大功告成！頭腦非常清晰靈活！`;
      nextBtn.innerText = `從第 1 組重新挑戰 🔄`;
    }
  }

  if (popup) popup.classList.add('show');
}

function goToNextSet() {
  const popup = document.getElementById('set-popup');
  if (popup) popup.classList.remove('show');
  if (currentSetIdx < idiomSets.length - 1) {
    currentSetIdx++;
  } else {
    currentSetIdx = 0;
  }
  currentIdiomInSet = 0;
  saveIdiomProgress();
  renderIdiom();
  playChime(true);
}

function replayCurrentSet() {
  const popup = document.getElementById('set-popup');
  if (popup) popup.classList.remove('show');
  currentIdiomInSet = 0;
  renderIdiom();
}

// 初始化成語題目
fetchIdiomsXML();