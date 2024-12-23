const editor = document.getElementById("editor");
const fontSizeSelect = document.getElementById('fontSize');
const fontFamilySelect = document.getElementById('fontFamily');
const slider = document.getElementById('historySlider');
const historyDisplay = document.getElementById('historyDisplay');

// 履歴データを管理する配列
let history = [];
let currentHistoryIndex = 0; // 現在の履歴インデックス

// 前回の保存内容を管理
let lastSavedContent = ""; // 直前に保存された全体のコンテンツ
let isComposing = false; // IME入力中かどうかを管理

// エディタの内容をローカルストレージに保存
const saveToLocalStorage = () => {
    const currentContent = editor.value;
    localStorage.setItem("editorContent", currentContent); // "editorContent"というキーで保存
    console.log("エディタ内容をローカルストレージに保存しました");
};

// ページロード時にデータベースから行番号ごとのデータをグループ化し、タイムスタンプ順で表示
const loadDataFromDatabase = () => {
    db_his.notes.orderBy("timestamp").toArray().then(notes => {
        // console.log("データベースから取得した行番号ごとのデータ:");

        // 行番号ごとにグループ化
        const groupedByLine = notes.reduce((acc, note) => {
            const lineNumber = note.position.line;
            if (!acc[lineNumber]) {
                acc[lineNumber] = [];
            }
            acc[lineNumber].push(note);
            return acc;
        }, {});

        // 各行番号についてタイムスタンプ順にデータを表示
        Object.keys(groupedByLine).forEach(lineNumber => {
            console.log(`行番号: ${lineNumber}`);

            // タイムスタンプ順に並べて表示
            const sortedNotes = groupedByLine[lineNumber].sort((a, b) => {
                return new Date(a.timestamp) - new Date(b.timestamp);
            });

            sortedNotes.forEach(note => {
                console.log(`タイムスタンプ: ${note.timestamp}`);
                console.log(`内容: ${note.contents}`);
                console.log("---------------");
            });
        });
    }).catch(err => {
        console.error("データベースからの取得に失敗しました:", err);
    });
};

// ローカルストレージからエディタ内容を復元
const loadFromLocalStorage = () => {
    const savedContent = localStorage.getItem("editorContent");
    if (savedContent !== null) {
        editor.value = savedContent;
        console.log("エディタ内容をローカルストレージから復元しました");
    } else {
        console.log("ローカルストレージに保存されたデータはありません");
    }
};

const loadHistory = () => {
    // データベースからすべてのノートを取得
    db_his.notes.orderBy("timestamp").toArray().then(notes => {
        // console.log("データベースから取得したデータ:", notes);

        // 日付ごとにノートをグループ化（timestampから日付部分を抽出）
        const groupedByDate = notes.reduce((acc, note) => {
            const date = note.timestamp.split("_")[0]; // "YYYY-MM-DD"部分を抽出
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(note);
            return acc;
        }, {});

        // console.log("日付でグループ化されたデータ:", groupedByDate);

        // 履歴エリアをクリア
        const historyElement = document.getElementById("history");
        historyElement.innerHTML = "";

        // 各日付ごとにエントリーを作成
        Object.keys(groupedByDate).forEach(date => {
            const notesForDate = groupedByDate[date];
            
            // 行番号ごとにノートをグループ化
            const groupedByLine = notesForDate.reduce((acc, note) => {
                const lineNumber = note.position.line;
                if (!acc[lineNumber]) {
                    acc[lineNumber] = [];
                }
                acc[lineNumber].push(note);
                return acc;
            }, {});

            // エントリーのコンテンツを作成
            const entryElement = document.createElement("div");
            entryElement.classList.add("history-entry");

            // 日付を表示（今回は日付のみ）
            const dateElement = document.createElement("div");
            dateElement.classList.add("date");
            dateElement.textContent = date; // 例: 2024-12-22
            entryElement.appendChild(dateElement);

            // 各行番号の最新データを表示
            Object.keys(groupedByLine).forEach(lineNumber => {
                // 行番号ごとのデータを最新のタイムスタンプでソート
                const sortedNotes = groupedByLine[lineNumber].sort((a, b) => {
                    // タイムスタンプをDateオブジェクトとして比較
                    return new Date(b.timestamp.replace("_", "T")) - new Date(a.timestamp.replace("_", "T")); // 降順でソート
                });

                // 最新のデータを通常表示、履歴は小さくタイムスタンプ付きで表示
                const latestNote = sortedNotes[0];
                const latestNoteElement = document.createElement("div");
                latestNoteElement.classList.add("latest-note");
                latestNoteElement.textContent = `行 ${lineNumber}: ${latestNote.contents}`;
                // コピペなら背景を黄色に
                if (latestNote.action === "paste") {
                    latestNoteElement.style.backgroundColor = "yellow";
                }
                entryElement.appendChild(latestNoteElement);

                // 履歴データを逆順（昇順）で表示（最新以外の内容）
                sortedNotes.slice(1).reverse().forEach((note) => {
                    const noteElement = document.createElement("div");
                    noteElement.classList.add("past-note");

                    // 過去の内容のスタイルを調整（小さく、薄く）
                    noteElement.textContent = `${note.timestamp} - ${note.contents}`;
                    noteElement.style.fontSize = "0.8em";
                    noteElement.style.color = "gray"; // 薄い色

                    if (note.action === "paste") {
                        noteElement.style.backgroundColor = "yellow";
                    }

                    entryElement.appendChild(noteElement);
                });
            });

            // 履歴エリアにエントリーを追加
            historyElement.appendChild(entryElement);
        });
    }).catch(err => {
        console.error("データベースからの取得に失敗しました:", err);
    });
};

// タイムスタンプ生成関数
const generateTimestamp = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}-${MM}-${dd}_${HH}:${mm}:${ss}`;
};

// 現在の日付（"YYYY-MM-DD"形式）を取得
const getTodayDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// ローカルストレージに「今日」の履歴を保存
const saveHistoryToLocal = (content) => {
    const today = getTodayDate();
    const historyKey = `history_${today}`; // 例: history_2024-12-22
    const timestamp = new Date().toISOString(); // タイムスタンプ（ISO形式）

    // 現在の履歴を取得
    const historyToday = JSON.parse(localStorage.getItem(historyKey)) || [];
    historyToday.push({ timestamp, content });

    // ローカルストレージに保存
    localStorage.setItem(historyKey, JSON.stringify(historyToday));
    console.log("履歴を保存しました:", { timestamp, content });
};

// ローカルストレージから「今日」の履歴を取得
const loadHistoryFromLocal = () => {
    const today = getTodayDate();
    const historyKey = `history_${today}`;
    const historyToday = JSON.parse(localStorage.getItem(historyKey)) || [];
    // console.log("今日の履歴をロードしました:", historyToday);
    return historyToday;
};

// 差分を取得する関数（行ごとに判断）
const getDifferences = (fullContent, savedContent) => {
    if (!savedContent) {
        // 最初の保存時: 全内容を行ごとに記録
        return fullContent.split("\n").map((line, index) => ({
            lineNumber: index + 1,
            content: line,
        }));
    }

    const fullLines = fullContent.split("\n");
    const savedLines = savedContent.split("\n");

    const differences = [];

    const maxLength = Math.max(fullLines.length, savedLines.length);
    for (let i = 0; i < maxLength; i++) {
        if (fullLines[i] !== savedLines[i]) {
            differences.push({
                lineNumber: i + 1,
                content: fullLines[i] || "", // 変更内容が空の場合も記録
            });
        }
    }

    return differences;
};

// 保存処理（行ごとに記録）
const saveToDatabase = (action) => {
    const currentContent = editor.value;
    const differences = getDifferences(currentContent, lastSavedContent);

    if (differences.length > 0) {
        const timestamp = generateTimestamp();

        // 各行ごとに保存
        differences.forEach(({ lineNumber, content }) => {
            db_his.notes.add({
                timestamp: timestamp,
                action: action,
                position: { line: lineNumber, content: content },
                contents: content,
            }).then(() => {
                console.log("保存しました:", { action, lineNumber, content });
            });
        });

        // 保存後、保存済み内容を更新
        lastSavedContent = currentContent;
    }
};

// ページロード時にデータベースからデータをロード
window.addEventListener("load", () => {
    fontSizeSelect.addEventListener('change', () => {
        editor.style.fontSize = fontSizeSelect.value;
    });

    fontFamilySelect.addEventListener('change', () => {
        editor.style.fontFamily = fontFamilySelect.value;
    });

    const historyToday = loadHistoryFromLocal();

    // スライダーの最大値を設定
    slider.max = historyToday.length - 1;

    // スライダーの値を最新に設定
    slider.value = historyToday.length - 1;

    // 最新の履歴を表示
    if (historyToday.length > 0) {
        historyDisplay.textContent = historyToday[historyToday.length - 1].content;
    } else {
        historyDisplay.textContent = "履歴がありません";
    }

    loadHistory();
    loadFromLocalStorage(); // ローカルストレージからエディタ内容を復元
    loadDataFromDatabase(); // データベースからデータを取得してコンソールに表示
});

// 保存処理を各イベントに追加
editor.addEventListener("input", saveToLocalStorage); // 入力があるたびに保存
editor.addEventListener("compositionend", saveToLocalStorage); // IME確定時にも保存

// エディタ入力時の処理
editor.addEventListener("input", () => {
    const currentContent = editor.value;
    saveHistoryToLocal(currentContent); // 現在の内容を履歴に追加

    // リアルタイムでhistoryDisplayを更新
    historyDisplay.textContent = currentContent;

    // スライダーの最大値と値を更新
    const historyToday = loadHistoryFromLocal();
    slider.max = historyToday.length - 1;
    slider.value = historyToday.length - 1;
});

// スライダーの動作処理
slider.addEventListener("input", () => {
    const historyToday = loadHistoryFromLocal();
    const index = parseInt(slider.value, 10);
    const contentToShow = historyToday[index]?.content || "";
    historyDisplay.textContent = contentToShow; // 履歴内容を表示
});

// IME入力開始時の処理
editor.addEventListener("compositionstart", () => {
    isComposing = true;
    console.log("IME入力開始");
});

// IME入力確定時の処理
editor.addEventListener("compositionend", () => {
    isComposing = false;
    console.log("IME入力終了: 保存処理を実行");

    // IME確定時に保存処理を実行
    const action = "input";
    saveToDatabase(action);

    // 現在のカーソル位置（行番号）を取得
    const cursorPosition = editor.selectionStart; // カーソルの位置
    const lines = editor.value.substr(0, cursorPosition).split("\n"); // カーソル位置までの行を分割
    const currentLineNumber = lines.length; // 現在の行番号（1-based index）

    console.log("IME入力完了: 現在の行番号は", currentLineNumber);
});

// Enterキー押下時の処理
editor.addEventListener("keydown", (e) => {
    if (isComposing) {
        console.log("IME入力中: Enterキー無視");
        return; // IME入力中は処理をスキップ
    }
    if (e.key === "Enter") {
        console.log("Enterキー押下: 保存処理を実行");
        const action = "input";
        saveToDatabase(action);
    }
});

// コピペ時の処理
editor.addEventListener("paste", (e) => {
    console.log("コピペ検知");
    const action = "paste";
    setTimeout(() => {
        saveToDatabase(action); // コピペ内容反映後に保存
    }, 0);
});
