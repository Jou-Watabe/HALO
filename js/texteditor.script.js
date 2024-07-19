document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const fontSizeSelect = document.getElementById('fontSize');
    const fontFamilySelect = document.getElementById('fontFamily');
    const slider = document.getElementById('historySlider');
    const historyDisplay = document.getElementById('historyDisplay');


    fontSizeSelect.addEventListener('change', () => {
        editor.style.fontSize = fontSizeSelect.value;
    });

    fontFamilySelect.addEventListener('change', () => {
        editor.style.fontFamily = fontFamilySelect.value;
    });

    let previousValue = editor.value;
    const history = [];

    let isComposing = false;
    let compositionStartTime = 0; // 合成入力開始時のタイムスタンプ
    let compositionBuffer = '';

    function saveHistory(value) {
        const timestamp = new Date().toISOString();
        history.push({ value, timestamp });
        slider.max = history.length - 1; // スライダーの最大値を更新
        updateHistoryDisplay(); // 履歴表示を更新
        console.log(history);
    }

    function updateHistoryDisplay() {
        const index = slider.value;
        historyDisplay.textContent = history[index].value; // スライダーに応じた履歴を表示
    }

    saveHistory(previousValue);

    editor.addEventListener('input', () => {
        const currentValue = editor.value;
        saveHistory(currentValue);
        previousValue = currentValue;
        updateHistoryDisplay(); // 履歴表示も更新
    });

    slider.addEventListener('input', () => {
        updateHistoryDisplay(); // スライダーの位置に応じて履歴を更新
        // textareaの値は変更しない
    });

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        const hours = ('0' + date.getHours()).slice(-2);
        const minutes = ('0' + date.getMinutes()).slice(-2);
        const seconds = ('0' + date.getSeconds()).slice(-2);
        return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}`;
    }

    editor.addEventListener('compositionstart', () => {
        isComposing = true;
        compositionStartTime = Date.now(); // 合成入力開始時のタイムスタンプを記録
    });

    editor.addEventListener('compositionupdate', (event) => {
        compositionBuffer = event.data;
    });

    editor.addEventListener('compositionend', async (event) => {
        const endTime = Date.now(); // 合成入力終了時のタイムスタンプを取得
        const duration = endTime - compositionStartTime; // 合成入力の時間

        const characters = event.data;

        for (let i = 0; i < characters.length; i++) {
            const timestamp = compositionStartTime + i * (duration / characters.length); // 各文字の時間を均等に割り当てる
            const position = editor.selectionStart - compositionBuffer.length + i;
            const character = characters[i];

            await db_his.notes.add({ timestamp, action: 'input', position, character });
        }

        isComposing = false;
        compositionBuffer = '';

        // History を更新してスクロールバーを最下部に移動
        updateHistory();
    });

    editor.addEventListener('input', async (event) => {
        if (!isComposing) {
            const timestamp = Date.now();
            const action = event.inputType === 'deleteContentBackward' ? 'delete' : 'input';
            const position = editor.selectionStart;
            const characters = event.data || '';

            for (let i = 0; i < characters.length; i++) {
                await db_his.notes.add({ timestamp, action, position: position + i, character: characters[i] });
            }

            // History を更新してスクロールバーを最下部に移動
            updateHistory();
        }
    });

    editor.addEventListener('paste', async (event) => {
        event.preventDefault(); // デフォルトの貼り付け動作を防止
        const timestamp = Date.now();
        const position = editor.selectionStart;
        const pastedText = (event.clipboardData || window.clipboardData).getData('text');
    
        for (let i = 0; i < pastedText.length; i++) {
            await db_his.notes.add({ timestamp, action: 'paste', position: position + i, character: pastedText[i] });
        }
    
        // エディターのテキストエリアに貼り付けたテキストを挿入する
        const textBefore = editor.value.substring(0, position);
        const textAfter = editor.value.substring(position);
        editor.value = textBefore + pastedText + textAfter;

        // History を更新してスクロールバーを最下部に移動
        updateHistory();
    });

    const thresholdSlider = document.getElementById('threshold');
    const thresholdValue = document.getElementById('thresholdValue');
    const historyContainer = document.getElementById('history');

    thresholdSlider.addEventListener('input', () => {
        thresholdValue.textContent = thresholdSlider.value;
    });

    thresholdSlider.addEventListener('change', async () => {
        // スライダーバーの値を参照して閾値を設定
        const threshold = parseInt(thresholdSlider.value, 10) * 1000; // 秒をミリ秒に変換
        updateHistory(threshold);
    });

    // ページロード時にも History を更新してスクロールバーを最下部に移動
    window.addEventListener('load', () => {
        updateHistory();
    });

    // 隣り合う履歴同士を比較して閾値以下であれば同じグループにする関数
    function groupByThreshold(entries, threshold) {
        let groupedEntries = [];
        let currentGroup = [];

        currentGroup.push(entries[0]);

        for (let i = 1; i < entries.length; i++) {
            let currentEntry = entries[i];
            let previousEntry = entries[i - 1];
            let timeDifference = currentEntry.timestamp - previousEntry.timestamp;

            if (timeDifference <= threshold) {
                currentGroup.push(currentEntry);
            } else {
                groupedEntries.push(currentGroup);
                currentGroup = [currentEntry];
            }
        }

        groupedEntries.push(currentGroup);
        return groupedEntries;
    }

    // History を更新してスクロールバーを最下部に移動する関数
    async function updateHistory(threshold = null) {
        historyContainer.innerHTML = '';

        if (threshold === null) {
            threshold = parseInt(thresholdSlider.value, 10) * 1000;
        }

        const notes = await db_his.notes.orderBy('timestamp').toArray();
        const groupedNotes = groupByThreshold(notes, threshold);

        groupedNotes.forEach(group => {
            const groupDiv = document.createElement('div');
            const groupStartTime = group[0].timestamp;
            const groupEndTime = group[group.length - 1].timestamp;
            const groupContent = group.map(n => {
                if (n.action === 'delete') {
                    return `<span style="text-decoration: line-through; color: red;">${n.character}</span>`;
                } else if (n.action === 'paste') {
                    return `<span style="background-color: yellow;">${n.character}</span>`;
                } else {
                    return n.character;
                }
            }).join('');

            groupDiv.innerHTML = `<strong>${formatTimestamp(groupStartTime)} ~ ${formatTimestamp(groupEndTime)}</strong>: ${groupContent}`;
            historyContainer.appendChild(groupDiv);
        });

        // 履歴を更新した後に、スクロールバーを最下部に移動する
        scrollToBottom();
    }

    // スクロールバーを最下部に移動する関数
    function scrollToBottom() {
        historyContainer.scrollTop = historyContainer.scrollHeight;
    }
});