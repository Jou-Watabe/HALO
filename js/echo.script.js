document.getElementById('start-recording').addEventListener('click', startRecording);
document.getElementById('stop-recording').addEventListener('click', stopRecording);
document.getElementById('mode-button').addEventListener('click', toggleMode);
document.getElementById('keyword-input').addEventListener('input', searchByKeyword);
document.getElementById('date-input').addEventListener('change', searchByTime);
document.getElementById('time-input').addEventListener('change', searchByTime);
document.getElementById('speech-slider').addEventListener('input', playByIndex);

let recognition;
let isRecording = false;
let searchResults = []; // 検索結果を保存するグローバル変数

function startRecording() {
    if (isRecording) return;
    isRecording = true;
    
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        const timestamp = getLocalTimestamp();
        db_his.speeches.add({ timestamp, content: transcript }).then(() => {
            displaySpeech(timestamp, transcript);
        });
    };

    recognition.start();
}

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    recognition.stop();
}

function updateWordCloud() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999));

    db_his.speeches.filter(speech => {
        const speechTime = new Date(speech.timestamp.replace('_', 'T'));
        return speechTime >= startOfDay && speechTime <= endOfDay;
    }).toArray().then(results => {
        const wordCounts = {};
        results.forEach(speech => {
            const words = speech.content.split(/\s+/);
            words.forEach(word => {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            });
        });

        displayWordCloud(wordCounts);
    });
}

function displayWordCloud(wordCounts) {
    const wordCloudDisplay = document.getElementById('word-cloud-display');
    wordCloudDisplay.innerHTML = ''; // 既存の内容をクリア

    for (const word in wordCounts) {
        const wordElement = document.createElement('span');
        wordElement.textContent = word;
        wordElement.className = 'word';
        wordElement.style.fontSize = `${10 * wordCounts[word]}px`; // 出現回数に応じたサイズ
        wordCloudDisplay.appendChild(wordElement);
    }
}


function displaySpeech(timestamp, content) {
    const speechDisplayArea = document.getElementById('speech-display-area');
    const speechElement = document.createElement('div');
    speechElement.textContent = `${timestamp}: ${content}`;
    speechDisplayArea.appendChild(speechElement);

    // スクロールを一番下に移動
    speechDisplayArea.scrollTop = speechDisplayArea.scrollHeight;

    updateWordCloud(); // ワードクラウドを更新
}

function getLocalTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}`;
}

function toggleMode() {
    const modeButton = document.getElementById('mode-button');
    const keywordPlayback = document.getElementById('keyword-playback');
    const timePlayback = document.getElementById('time-playback');

    if (modeButton.textContent === 'keyword') {
        modeButton.textContent = 'time';
        keywordPlayback.style.display = 'none';
        timePlayback.style.display = 'flex';
    } else {
        modeButton.textContent = 'keyword';
        keywordPlayback.style.display = 'flex';
        timePlayback.style.display = 'none';
    }
}

function searchByKeyword() {
    const keyword = document.getElementById('keyword-input').value.toLowerCase();
    db_his.speeches.filter(speech => speech.content.toLowerCase().includes(keyword)).toArray().then(results => {
        searchResults = results; // 検索結果をグローバル変数に保存
        updateSlider(results);
        if (results.length === 1) {
            playSpeech(results[0]);
        }
    });
}

function searchByTime() {
    const date = document.getElementById('date-input').value;
    const time = document.getElementById('time-input').value;

    if (!date || !time) return;

    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

    db_his.speeches.filter(speech => {
        const speechTime = new Date(speech.timestamp.replace('_', 'T'));
        return speechTime >= startTime && speechTime <= endTime;
    }).toArray().then(results => {
        searchResults = results; // 検索結果をグローバル変数に保存
        updateSlider(results);
        if (results.length === 1) {
            playSpeech(results[0]);
        }
    });
}

function updateSlider(results) {
    const slider = document.getElementById('speech-slider');
    const markersDiv = document.getElementById('speech-slider-markers');
    slider.max = results.length - 1;
    slider.value = 0;

    markersDiv.innerHTML = ''; // 既存の目盛りをクリア
    const displayMarkers = Math.min(20, results.length); // 最大20個表示
    const interval = Math.ceil(results.length / displayMarkers);

    results.forEach((result, index) => {
        if (index % interval === 0) {
            const div = document.createElement('div');
            div.className = 'slider-marker';
            const percentage = (index / (results.length - 1)) * 100;
            div.style.left = `${percentage}%`;
            div.dataset.index = index;
            markersDiv.appendChild(div);
        }
    });
}

function playByIndex() {
    const slider = document.getElementById('speech-slider');
    const index = slider.value;
    const speech = searchResults[index];
    if (speech) {
        playSpeech(speech);
    }
}

function playSpeech(speech) {
    const utterance = new SpeechSynthesisUtterance(speech.content);
    utterance.lang = 'ja-JP';
    speechSynthesis.speak(utterance);

    highlightSpeech(speech.timestamp);
}

function highlightSpeech(timestamp) {
    const speechDisplayArea = document.getElementById('speech-display-area');
    const speechElements = speechDisplayArea.children;
    for (const element of speechElements) {
        if (element.textContent.startsWith(timestamp)) {
            element.style.backgroundColor = '#ffebcd'; // ハイライト色
            // 該当する発話を中央にスクロール
            const elementPosition = element.offsetTop;
            const containerHeight = speechDisplayArea.clientHeight;
            const elementHeight = element.clientHeight;
            speechDisplayArea.scrollTop = elementPosition - (containerHeight / 2) + (elementHeight / 2);
        } else {
            element.style.backgroundColor = '';
        }
    }
}

// ページロード時に既存の発話データを表示
db_his.speeches.orderBy('timestamp').each(speech => {
    displaySpeech(speech.timestamp, speech.content);
});