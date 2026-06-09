/**
 * ==========================================================================
 * 초등 2학년 독서 골든벨 - 애플리케이션 로직 (app.js)
 * 기능: 진도 저장, 화면 전환, 퀴즈 출제 및 채점, 결과 출력
 * ==========================================================================
 */

// 1. 상태 전역 변수 설정
let currentDay = 1;              // 현재 학습/퀴즈를 진행 중인 날짜 (1 ~ 22)
let currentQuestionIndex = 0;    // 현재 풀고 있는 문제 번호 (0 ~ 9)
let currentScore = 0;            // 현재 맞힌 문제 개수 기준 점수 (개당 10점, 최대 100점)
let activeDayData = null;        // 현재 일차의 데이터 개체 (읽을거리 및 퀴즈들)

// 2. DOM 요소 선택 (자주 사용하는 화면 요소를 미리 가져옴)
const views = {
  home: document.getElementById('home-view'),
  reading: document.getElementById('reading-view'),
  quiz: document.getElementById('quiz-view'),
  result: document.getElementById('result-view')
};

// 3. 로컬 스토리지 진도 관리 객체
const ProgressManager = {
  STORAGE_KEY: 'goldenbell_progress_v1',

  // 저장된 모든 진도 데이터 읽기
  getAllProgress() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  },

  // 특정 일차의 성적 저장 (day: 일차 숫자, score: 0~100 점수)
  saveProgress(day, score) {
    const progress = this.getAllProgress();
    progress[day] = {
      completed: true,
      score: score,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
  },

  // 전체 학습 진도 리셋
  clearAllProgress() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

// 4. 앱 초기화 실행
document.addEventListener('DOMContentLoaded', () => {
  initDaysGrid();
  setupEventListeners();
});

// 5. 홈 대시보드 - 22일 학습 달력 격자 생성
function initDaysGrid() {
  const gridContainer = document.getElementById('days-grid');
  gridContainer.innerHTML = ''; // 그리드 초기화

  const progress = ProgressManager.getAllProgress();

  // 1일부터 22일까지 반복하며 카드 생성
  for (let d = 1; d <= 22; d++) {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    dayCard.id = `day-card-${d}`;

    const isCompleted = progress[d] && progress[d].completed;
    const score = isCompleted ? progress[d].score : 0;

    // 카드가 완료된 상태이면 클래스 추가
    if (isCompleted) {
      dayCard.classList.add('completed');
    }

    // 카드 내부 HTML 구조 설계 (어린이가 보기 쉽게 큼직하게)
    dayCard.innerHTML = `
      <div class="day-number">${d}일차</div>
      <div class="day-status">${isCompleted ? '참 잘했어요! 👏' : '도전하기 🔔'}</div>
      ${isCompleted ? `<div class="day-score">${score}점</div>` : ''}
    `;

    // 카드를 클릭했을 때 해당 일차 학습 화면으로 이동하는 이벤트 리스너
    dayCard.addEventListener('click', () => {
      startReading(d);
    });

    gridContainer.appendChild(dayCard);
  }
}

// 6. 이벤트 리스너 바인딩
function setupEventListeners() {
  // 진도 초기화 버튼
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    const confirmReset = confirm("지금까지 공부한 모든 기록이 사라져요. 정말 초기화할까요?");
    if (confirmReset) {
      ProgressManager.clearAllProgress();
      initDaysGrid();
      alert("공부 기록이 깨끗하게 초기화되었어요! 처음부터 다시 도전해봐요! 💪");
    }
  });

  // 읽을거리 화면 -> 홈으로 가기 버튼
  document.getElementById('btn-reading-back').addEventListener('click', () => {
    showView('home');
    initDaysGrid(); // 홈 화면 복귀 시 그리드 점수 갱신
  });

  // 읽을거리 완료 -> 퀴즈 풀기 버튼
  document.getElementById('btn-start-quiz').addEventListener('click', () => {
    startQuiz();
  });

  // 주관식 정답 제출 버튼
  document.getElementById('btn-submit-answer').addEventListener('click', () => {
    checkShortAnswer();
  });

  // 주관식 입력창에서 엔터키를 쳤을 때 정답 제출 처리
  document.getElementById('quiz-input-answer').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      checkShortAnswer();
    }
  });

  // 다음 퀴즈 문제로 넘어가기 버튼
  document.getElementById('btn-next-quiz').addEventListener('click', () => {
    nextQuestion();
  });

  // 결과 화면 -> 다시 풀기 버튼
  document.getElementById('btn-restart-day').addEventListener('click', () => {
    startReading(currentDay);
  });

  // 결과 화면 -> 홈으로 가기 버튼
  document.getElementById('btn-go-home').addEventListener('click', () => {
    showView('home');
    initDaysGrid(); // 홈 카드 갱신
  });
}

// 7. 화면(뷰) 전환 함수 (SPA 제어)
function showView(viewId) {
  // 모든 뷰 섹션에서 active 클래스를 제거하여 숨김
  Object.values(views).forEach(view => {
    view.classList.remove('active');
  });
  // 타겟 뷰에 active 클래스를 추가하여 노출
  views[viewId].classList.add('active');
  
  // 브라우저 최상단으로 스크롤 이동
  window.scrollTo(0, 0);
}

// 8. 1단계: 오늘의 읽을거리 불러오기
function startReading(day) {
  currentDay = day;
  // quiz-data.js의 전역 배열 quizData에서 해당 일차의 데이터 검색
  activeDayData = quizData.find(item => item.day === day);

  if (!activeDayData) {
    alert("죄송해요! 아직 준비되지 않은 일차입니다.");
    return;
  }

  // 상단 배지 및 텍스트 채우기
  document.getElementById('reading-day-badge').innerText = `Day ${day}`;
  document.getElementById('reading-title').innerText = activeDayData.title;

  // 위인 및 독도 지문 텍스트 채우기
  // 학생용 텍스트 가독성을 높이기 위해 중요한 부분은 strong 태그로 강조
  document.getElementById('reading-hero-text').innerHTML = formatReadingText(activeDayData.reading.hero);
  document.getElementById('reading-dokdo-text').innerHTML = formatReadingText(activeDayData.reading.dokdo);

  showView('reading');
}

// 지문 텍스트 안에 혹시 있을 큰따옴표나 중요한 단어들을 하이라이트하기 위한 보조 함수
function formatReadingText(text) {
  // 텍스트 중 작은따옴표('인물명/개념')로 묶인 단어들을 찾아 강조(strong) 태그로 바꿔줍니다.
  return text.replace(/'([^']+)'/g, "<strong>'$1'</strong>");
}

// 9. 2단계: 퀴즈 세션 시작
function startQuiz() {
  currentQuestionIndex = 0;
  currentScore = 0;

  // 화면의 점수판 리셋
  document.getElementById('current-score').innerText = '0';

  showView('quiz');
  showQuestion();
}

// 10. 퀴즈 문제 렌더링
function showQuestion() {
  // 현재 문제 정보 가져오기 (매일 10문항 제공)
  const currentQuiz = activeDayData.quizzes[currentQuestionIndex];
  
  // 피드백 영역(해설 팝업) 숨기기
  const feedbackCard = document.getElementById('quiz-feedback');
  feedbackCard.style.display = 'none';
  feedbackCard.className = 'quiz-feedback-card'; // 클래스 초기화

  // 문제 진행 진행률 텍스트 및 바 갱신
  document.getElementById('quiz-progress-text').innerText = `문제 ${currentQuestionIndex + 1} / 10`;
  const progressPercent = ((currentQuestionIndex + 1) / 10) * 100;
  document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;

  // 문제 분류 표시 (1~8번은 위인전, 9~10번은 독도)
  const categoryTag = document.getElementById('quiz-category-tag');
  if (currentQuestionIndex < 8) {
    categoryTag.innerText = "👑 위인전 문제";
    categoryTag.style.backgroundColor = "var(--primary-dark)";
  } else {
    categoryTag.innerText = "🏝️ 독도 문제";
    categoryTag.style.backgroundColor = "#3498db";
  }

  // 질문 내용 표시
  document.getElementById('quiz-question-text').innerText = currentQuiz.question;

  // 문제 유형별 보기 박스 조절
  const choiceBox = document.getElementById('choice-container');
  const shortBox = document.getElementById('short-answer-container');

  if (currentQuiz.type === 'choice') {
    // 객관식 렌더링
    choiceBox.style.display = 'flex';
    shortBox.style.display = 'none';

    const choiceButtons = choiceBox.querySelectorAll('.choice-btn');
    choiceButtons.forEach((btn, idx) => {
      btn.innerText = `${idx + 1}. ${currentQuiz.choices[idx]}`;
      btn.className = 'choice-btn'; // 스타일 초기화
      btn.disabled = false;         // 버튼 활성화

      // 버튼 클릭 시 정답 채점 리스너 연결
      btn.onclick = () => {
        checkChoiceAnswer(idx, btn);
      };
    });
  } else if (currentQuiz.type === 'short') {
    // 주관식(초성 단답형) 렌더링
    choiceBox.style.display = 'none';
    shortBox.style.display = 'flex';

    // 주관식 입력창 초기화
    const inputField = document.getElementById('quiz-input-answer');
    inputField.value = '';
    inputField.disabled = false;
    document.getElementById('btn-submit-answer').disabled = false;

    // 초성 힌트 텍스트 넣기
    document.getElementById('quiz-hint-text').innerText = currentQuiz.hint;

    // 모바일 등 터치 기기 포커싱 편의
    setTimeout(() => {
      inputField.focus();
    }, 100);
  }
}

// 11. 객관식 채점 처리
function checkChoiceAnswer(selectedIndex, clickedButton) {
  const currentQuiz = activeDayData.quizzes[currentQuestionIndex];
  const choiceBox = document.getElementById('choice-container');
  const buttons = choiceBox.querySelectorAll('.choice-btn');

  // 한 번 정답을 고르면 다른 보기 버튼은 비활성화
  buttons.forEach(btn => {
    btn.disabled = true;
  });

  const isCorrect = (selectedIndex === currentQuiz.answer);

  if (isCorrect) {
    clickedButton.classList.add('selected');
    clickedButton.style.backgroundColor = '#e8f5e9'; // 부드러운 정답 초록색 피드백
    clickedButton.style.borderColor = 'var(--secondary-color)';
    currentScore += 10; // 10점 추가
    document.getElementById('current-score').innerText = currentScore;
    showFeedback(true, currentQuiz.explanation);
  } else {
    clickedButton.style.backgroundColor = '#ffe9e9'; // 오답 붉은색 피드백
    clickedButton.style.borderColor = 'var(--accent-color)';
    // 정답인 버튼도 녹색으로 함께 강조해 줌
    buttons[currentQuiz.answer].style.borderColor = 'var(--secondary-color)';
    buttons[currentQuiz.answer].style.backgroundColor = '#e8f5e9';
    showFeedback(false, currentQuiz.explanation);
  }
}

// 12. 주관식 채점 처리
function checkShortAnswer() {
  const currentQuiz = activeDayData.quizzes[currentQuestionIndex];
  const inputField = document.getElementById('quiz-input-answer');
  const submitBtn = document.getElementById('btn-submit-answer');
  
  // 입력값 긁어오기 및 가공
  const userAnswer = inputField.value.trim();
  if (!userAnswer) {
    alert("정답을 먼저 빈칸에 적어주세요!");
    return;
  }

  // 사용자가 더이상 타이핑하거나 재제출하지 못하도록 고정
  inputField.disabled = true;
  submitBtn.disabled = true;

  // 한글 비교 강화를 위한 공백 제거 비교
  const cleanUserAnswer = userAnswer.replace(/\s+/g, '').toLowerCase();
  const cleanRealAnswer = currentQuiz.answer.replace(/\s+/g, '').toLowerCase();

  const isCorrect = (cleanUserAnswer === cleanRealAnswer);

  if (isCorrect) {
    currentScore += 10;
    document.getElementById('current-score').innerText = currentScore;
    showFeedback(true, currentQuiz.explanation);
  } else {
    showFeedback(false, `${currentQuiz.explanation} (정답은 [ ${currentQuiz.answer} ] 입니다)`);
  }
}

// 13. 채점 결과 피드백 카드 애니메이션 노출
function showFeedback(isCorrect, explanation) {
  const feedbackCard = document.getElementById('quiz-feedback');
  const icon = document.getElementById('feedback-icon');
  const msg = document.getElementById('feedback-message');
  const explanationText = document.getElementById('feedback-explanation-text');

  if (isCorrect) {
    feedbackCard.classList.add('correct');
    icon.innerText = "⭕";
    msg.innerText = "참 잘했어요! 정답이에요!";
  } else {
    feedbackCard.classList.add('incorrect');
    icon.innerText = "❌";
    msg.innerText = "아쉬워요! 틀렸어요.";
  }

  explanationText.innerText = explanation;
  feedbackCard.style.display = 'block';

  // 해설 카드가 모바일에서도 아래쪽에 잘 보이도록 포커싱 스크롤
  setTimeout(() => {
    feedbackCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// 14. 다음 문제 이동 제어
function nextQuestion() {
  currentQuestionIndex++;

  if (currentQuestionIndex < 10) {
    // 아직 풀 문제가 남아있으면 다음 문제로
    showQuestion();
  } else {
    // 10문제를 전부 다 풀었으면 결과 화면 호출
    showResult();
  }
}

// 15. 3단계: 오늘의 골든벨 결과 출력 및 저장
function showResult() {
  // 1. 진도 데이터 영구 저장
  ProgressManager.saveProgress(currentDay, currentScore);

  // 2. 점수 텍스트 갱신
  document.getElementById('result-day-text').innerText = `${currentDay}일차 도전 완료!`;
  document.getElementById('result-score-text').innerText = currentScore;

  // 3. 점수대별 칭찬 멘트와 메달 디자인 분기 (초등학생 동기부여용)
  const medalIcon = document.getElementById('result-medal-icon');
  const medalName = document.getElementById('result-medal-name');
  const comment = document.getElementById('result-comment');

  if (currentScore === 100) {
    medalIcon.innerText = "🥇";
    medalName.innerText = "골든벨 금메달 왕관";
    comment.innerText = "와! 100점이에요! 💯 모든 문제를 완벽하게 맞혔어요. 지안이가 바로 오늘의 골든벨 왕이에요! 👑";
  } else if (currentScore >= 80) {
    medalIcon.innerText = "🥈";
    medalName.innerText = "골든벨 은메달";
    comment.innerText = "대단해요! 지안이, 정말 훌륭한 점수예요. 조금만 더 노력하면 다음에는 100점 금메달을 얻을 수 있어요! 🌟";
  } else if (currentScore >= 60) {
    medalIcon.innerText = "🥉";
    medalName.innerText = "골든벨 동메달";
    comment.innerText = "좋은 도전이었어요! 지안이, 읽을거리를 한 번 더 꼼꼼히 읽어보고 다시 풀어서 100점에 도전해보세요! 👍";
  } else {
    medalIcon.innerText = "🎗️";
    medalName.innerText = "도전 참가 메달";
    comment.innerText = "끝까지 문제를 푼 용기가 참 멋져요! 지안이, 위인들과 독도 공부를 다시 천천히 읽고 재도전해볼까요? 😊";
  }

  showView('result');
}
