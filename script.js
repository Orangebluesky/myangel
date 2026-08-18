// ------------------------------------------------------
// 말씀길잡이 · 설교 준비 도우미
// 이 스크립트는 브라우저에서 직접 Anthropic API를 호출합니다.
// API 키는 이 기기의 브라우저(localStorage)에만 저장되며,
// Anthropic 서버 외 다른 곳으로 전송되지 않습니다.
// ------------------------------------------------------

const SYSTEM_PROMPT = `당신은 목회자의 설교 준비를 돕는 신학 조교입니다.

배경:
- 개혁주의 신학, 합동 교단의 틀 안에서 답변하십시오.
- 성경 본문에 대한 정확한 주해를 바탕으로, 성도들의 실제 삶에
  적용 가능한 자료를 제공하십시오.
- 청중은 중학생부터 노년층까지 다양합니다. 특히 70대 이상 성도가
  많은 점을 고려해 쉬운 언어를 함께 제안하십시오.

답변 방식:
1. 먼저 질문 자체가 신학적으로/논리적으로 타당한 질문인지 짚어주십시오.
2. 하나의 정답만 제시하지 말고, 상황에 맞게 선택할 수 있는 몇 가지
   예시나 관점을 제시하십시오.
3. 실제로 검증 가능한 예화만 사용하고, 출처가 불확실하면 그렇다고
   밝히십시오.
4. 설교 원고 분량을 물으면, 발화 속도 1분당 약 150자 기준으로
   계산해 안내하십시오.`;

const apiKeyInput = document.getElementById('apiKey');
const toggleKeyBtn = document.getElementById('toggleKey');
const saveKeyBtn = document.getElementById('saveKey');
const keyStatus = document.getElementById('keyStatus');
const userInput = document.getElementById('userInput');
const modelSelect = document.getElementById('modelSelect');
const sendBtn = document.getElementById('sendBtn');
const output = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');

// 페이지를 열었을 때 저장된 키가 있으면 불러오기
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('sermon_api_key');
  if (saved) {
    apiKeyInput.value = saved;
    keyStatus.textContent = '저장된 키를 불러왔습니다';
    keyStatus.classList.add('ok');
  }
});

// API 키 표시/숨기기
toggleKeyBtn.addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

// API 키 저장
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-ant-')) {
    keyStatus.textContent = '키 형식을 확인해주세요 (sk-ant-로 시작)';
    keyStatus.classList.remove('ok');
    return;
  }
  localStorage.setItem('sermon_api_key', key);
  keyStatus.textContent = '저장되었습니다';
  keyStatus.classList.add('ok');
});

// 글자수 → 예상 낭독 시간 계산 (분당 150자 기준)
function estimateReadingTime(text) {
  const charCount = text.replace(/\s/g, '').length;
  const minutes = charCount / 150;
  return { charCount, minutes: minutes.toFixed(1) };
}

// 전송
sendBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  const prompt = userInput.value.trim();
  const model = modelSelect.value;

  if (!key) {
    alert('API 키를 먼저 입력하고 저장해주세요.');
    return;
  }
  if (!prompt) {
    alert('요청 내용을 입력해주세요.');
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = '생성 중...';
  output.innerHTML = '<p class="placeholder">답변을 생성하고 있습니다...</p>';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || '알 수 없는 오류가 발생했습니다.';
      output.innerHTML = `<p class="placeholder">오류: ${escapeHtml(message)}</p>`;
      return;
    }

    const text = data.content?.[0]?.text || '(빈 응답)';
    const { charCount, minutes } = estimateReadingTime(text);

    output.innerHTML = '';
    const p = document.createElement('div');
    p.textContent = text;
    output.appendChild(p);

    const meta = document.createElement('div');
    meta.className = 'char-count';
    meta.textContent = `글자 수: ${charCount}자 · 예상 낭독 시간: 약 ${minutes}분 (분당 150자 기준)`;
    output.appendChild(meta);

  } catch (err) {
    output.innerHTML = `<p class="placeholder">네트워크 오류: ${escapeHtml(String(err))}</p>`;
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = '전송';
  }
});

// 결과 복사
copyBtn.addEventListener('click', () => {
  const text = output.innerText;
  if (!text || text.includes('여기에 답변이')) return;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = '복사됨';
    setTimeout(() => (copyBtn.textContent = '복사'), 1500);
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
