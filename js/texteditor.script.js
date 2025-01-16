const textInputArea = document.getElementById("textInputArea");
const screenShotBtn = document.getElementById("screenShotBtn");
const historyViewer = document.getElementById("historyViewer");
const thumbnailArea = document.querySelector(".thumbnailArea");

let lastContent = ""; // 前回の内容を保存
let selectedSnapshot = null; // ミニテキストエリアを選択した時の処理

// 日本時間のタイムスタンプを生成する関数
function getJSTTimestamp() {
    const now = new Date();
    const offset = 9 * 60 * 60 * 1000; // UTCから日本時間(JST)へのオフセット
    const jstDate = new Date(now.getTime() + offset);
    return jstDate.toISOString().replace("T", "_").replace(/\..+/, "");
}

// スナップショットを保存する関数
async function saveSnapshot(content) {
    const timestamp = getJSTTimestamp();
    await db_his.snapshots.add({ timestamp, content });
}

// 最後のスナップショットを取得して表示する関数
async function loadLastSnapshot() {
    const lastSnapshot = await db_his.snapshots.orderBy("id").last();
    if (lastSnapshot && lastSnapshot.content) {
        textInputArea.value = lastSnapshot.content;
        lastContent = lastSnapshot.content;
    }
}

// 入力イベントのハンドリング
textInputArea.addEventListener("input", async (event) => {
    // 日本語入力ではない場合（アルファベット入力など）
    if (event.inputType !== "insertCompositionText") {
        const content = textInputArea.value;
        if (content !== lastContent) {
            await saveSnapshot(content);
            lastContent = content;
        }
    }
});

// 日本語入力の合成終了時（日本語の確定後）にスナップショットを保存
textInputArea.addEventListener("compositionend", async (event) => {
    const content = textInputArea.value;
    if (content !== lastContent) {
        await saveSnapshot(content);
        lastContent = content;
    }
});

// キーイベント（Enter, Backspace）のハンドリング
textInputArea.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" || event.key === "Backspace") {
        const content = textInputArea.value;
        if (content !== lastContent) {
            await saveSnapshot(content);
            lastContent = content;
        }
    }
});

// ペーストイベントのハンドリング
textInputArea.addEventListener("paste", async (event) => {
    const content = textInputArea.value;
    const pasteText = event.clipboardData.getData("text");

    // ペーストされたテキストが含まれている部分を記録
    const pasteContent = pasteText;

    // スナップショットを保存
    const timestamp = getJSTTimestamp();
    await db_his.snapshots.add({ timestamp, content, pasteContent });

    lastContent = content;
});

// スクリーンショットボタンのクリックイベント
screenShotBtn.addEventListener("click", async () => {
    const content = textInputArea.value;
    await saveSnapshot(content);

    // アラートメッセージを表示
    alert("スナップショットが保存されました");
});

// テキスト選択時のハンドリング
textInputArea.addEventListener("mouseup", async () => {
    const selection = window.getSelection();
    const selectedText = selection.toString();

    // detailed-containerをクリア
    const detailedContainer = document.querySelector(".detailed-container");
    detailedContainer.innerHTML = ""; // クリアする

    if (selectedText) {
        // 選択されたテキストに一致するスナップショットを取得
        const snapshots = await db_his.snapshots.toArray();
        const matchedSnapshots = snapshots.filter((snap) => snap.content.includes(selectedText));

        if (matchedSnapshots.length > 0) {
            // 該当するスナップショットを履歴ビューアに表示
            displayHistory(snapshots, matchedSnapshots, selectedText); // 変更点
        }
    }
});

function handleMiniTextAreaClick(snap, miniTextArea) {
    // すでに選択されたテキストエリアがある場合、その枠線をリセット
    if (selectedSnapshot) {
        const previousSelected = document.querySelector(`#historyViewer .selected, #detailed-container .selected`);
        if (previousSelected) {
            previousSelected.classList.remove("selected");
            previousSelected.style.border = "1px solid gray";
        }
    }

    // 新たに選択されたスナップショットに枠線を追加
    miniTextArea.classList.add("selected");
    miniTextArea.style.border = "2px solid green"; // 緑色の枠線に変更

    // 選択されたスナップショットを保存
    selectedSnapshot = snap;

    // 履歴として選択されたテキストを表示
    displayChoiceViewer(snap);
}

// choiceViewerに選択されたテキストを表示
function displayChoiceViewer(snap) {
    const choiceViewer = document.getElementById("choiceViewer");

    // 新しいスナップショットをリストとして表示
    const choiceContainer = document.createElement("div");
    choiceContainer.style.display = "flex";
    choiceContainer.style.flexDirection = "column"; // 縦方向に並べる
    choiceContainer.style.alignItems = "center"; // 中央に配置
    choiceContainer.style.marginBottom = "15px"; // 下部に少しマージンを追加

    const timestampLabel = document.createElement("div");
    timestampLabel.textContent = snap.timestamp;
    timestampLabel.style.fontSize = "12px";
    timestampLabel.style.textAlign = "center";
    timestampLabel.style.marginBottom = "3px"; // 下部にマージンを追加

    const miniTextArea = document.createElement("textarea");
    miniTextArea.value = snap.content;
    miniTextArea.readOnly = true;
    miniTextArea.style.width = "80%";
    miniTextArea.style.height = "60px";
    miniTextArea.style.resize = "none";
    miniTextArea.style.overflowY = "scroll";
    miniTextArea.style.border = "1px solid gray";
    

    choiceContainer.appendChild(timestampLabel);
    choiceContainer.appendChild(miniTextArea);

    // choiceViewerの最初に追加
    choiceViewer.insertBefore(choiceContainer, choiceViewer.firstChild); // リストの最初に追加
}

// 履歴を表示する関数
function displayHistory(allSnapshots, matchedSnapshots, selectedText) {
    historyViewer.innerHTML = ""; // 初期化
    historyViewer.style.display = "flex"; // フレックスコンテナとして設定

    const listContainer = document.createElement("div");
    listContainer.classList.add("list-container");
    listContainer.style.display = "flex";
    listContainer.style.overflowX = "auto"; // 横スクロール

    let lastSnapshot = null;

    matchedSnapshots.forEach((snap, index) => {
        // 最初のスナップショットは確定で表示
        if (index === 0 || (lastSnapshot && isDifferenceMatch(lastSnapshot, snap, selectedText))) {
            const snapContainer = document.createElement("div");
            snapContainer.classList.add("snapshot-container");
            snapContainer.style.margin = "0 10px";

            const timestampLabel = document.createElement("div");
            timestampLabel.textContent = snap.timestamp;
            timestampLabel.style.fontSize = "12px";
            timestampLabel.style.textAlign = "center";

            const miniDiv = document.createElement("div");
            miniDiv.classList.add("mini-text");
            miniDiv.style.width = "150px";
            miniDiv.style.height = "100px";
            miniDiv.style.fontSize = "5px";
            miniDiv.style.overflowY = "auto";
            miniDiv.style.whiteSpace = "pre-wrap"; // 改行を保持
            miniDiv.style.wordWrap = "break-word"; // 長い単語を折り返す
            miniDiv.style.border = "1px solid gray";
            miniDiv.style.padding = "5px";
            miniDiv.style.boxSizing = "border-box";

            // テキストをハイライトして表示
            let highlightedContent = highlightText(snap.content, selectedText);

            miniDiv.innerHTML = highlightedContent; // ハイライトされたテキストを表示

            snapContainer.appendChild(timestampLabel);
            snapContainer.appendChild(miniDiv);

            // スナップショットクリック時に詳細表示
            miniDiv.addEventListener("click", () => {
                displayDetailedHistory(allSnapshots, snap);
                handleMiniTextAreaClick(snap, miniDiv); // クリック時の処理
            });

            listContainer.appendChild(snapContainer);
            lastSnapshot = snap; // 最後に表示したスナップショットを更新
        }
    });

    historyViewer.appendChild(listContainer);
}

function highlightText(content, selectedText) {
    const escapedText = selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 特殊文字をエスケープ
    const regex = new RegExp(`(${escapedText})`, 'gi'); // 選択されたテキストにマッチする正規表現
    return content.replace(regex, '<span class="highlight">$1</span>'); // ハイライト用の<span>を追加
}

// 差分を確認する関数
function isDifferenceMatch(lastSnapshot, currentSnapshot, selectedText) {
    // 最後のスナップショットと現在のスナップショットの差分が選択されたテキストと一致する場合
    const diff = getTextDifference(lastSnapshot.content, currentSnapshot.content);
    console.log("差分:", diff); // 差分をコンソールに出力
    return diff.includes(selectedText);
}

// 2つのテキストの差分を取得する関数（diff-match-patchを使用）
function getTextDifference(lastContent, currentContent) {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(lastContent, currentContent);
    dmp.diff_cleanupSemantic(diffs);  // セマンティックな清掃を行う（空白や句読点を無視する）

    let addedText = "";
    let removedText = "";

    // 差分から追加されたテキストと削除されたテキストを抽出
    diffs.forEach((part) => {
        if (part[0] === 1) {
            addedText += part[1]; // 追加部分
        } else if (part[0] === -1) {
            removedText += part[1]; // 削除部分
        }
    });

    console.log("追加されたテキスト:", addedText); // 追加されたテキストをログ出力
    console.log("削除されたテキスト:", removedText); // 削除されたテキストをログ出力

    return addedText; // 追加されたテキストを差分として返す
}

// 選択されたスナップショットの詳細表示（横並び）
function displayDetailedHistory(allSnapshots, selectedSnapshot) {
    const selectedIndex = allSnapshots.findIndex((snap) => snap.id === selectedSnapshot.id);
    const start = Math.max(0, selectedIndex - 30); // 最初の30件
    const end = Math.min(allSnapshots.length, selectedIndex + 31); // 次の30件

    const detailedContainer = document.querySelector(".detailed-container");
    detailedContainer.innerHTML = ""; // 初期化
    detailedContainer.style.display = "flex"; // 横並びに設定
    detailedContainer.style.overflowX = "scroll"; // 横スクロールを有効にする

    // 前後30件をリスト表示
    const rangeSnapshots = allSnapshots.slice(start, end);
    rangeSnapshots.forEach((snap) => {
        const snapContainer = document.createElement("div");
        snapContainer.classList.add("snapshot-container");
        snapContainer.style.margin = "0 10px";
        snapContainer.style.textAlign = "center"; // 中央に配置

        const timestampLabel = document.createElement("div");
        timestampLabel.textContent = snap.timestamp;
        timestampLabel.style.fontSize = "12px"; // 時間のフォントサイズ
        timestampLabel.style.marginBottom = "5px"; // 下にマージンを追加

        const miniTextArea = document.createElement("textarea");
        miniTextArea.value = snap.content;
        miniTextArea.readOnly = true;
        miniTextArea.style.width = "150px";
        miniTextArea.style.height = "100px";
        miniTextArea.style.fontSize = "5px";
        miniTextArea.style.resize = "none";
        miniTextArea.style.overflowY = "scroll";
        miniTextArea.style.border = snap.id === selectedSnapshot.id ? "2px solid blue" : "1px solid gray"; // 選択されたスナップショットに強調表示

        snapContainer.appendChild(timestampLabel);
        snapContainer.appendChild(miniTextArea);
        detailedContainer.appendChild(snapContainer);

        // 現在のスナップショットを目立たせる
        if (snap.id === selectedSnapshot.id) {
            miniTextArea.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
}

async function plotHistory() {
    const snapshots = await db_his.snapshots.orderBy("timestamp").toArray();
    const plotViewer = document.getElementById("plotViewer");
    plotViewer.innerHTML = ""; // 初期化

    if (snapshots.length < 2) return; // 履歴が2件未満ならプロットしない

    // 最初のタイムスタンプと最後のタイムスタンプを取得
    const startTime = new Date(snapshots[0].timestamp);
    const endTime = new Date(snapshots[snapshots.length - 1].timestamp);
    const totalDuration = endTime - startTime; // 全期間のミリ秒

    // プロット位置のスケーリングファクター
    const scaleFactor = 1000; // 例えば、時間差が極端に短い場合に視覚的に調整する

    // 履歴をプロットするための設定
    snapshots.forEach((snap, index) => {
        const currentTime = new Date(snap.timestamp);
        const timeElapsed = currentTime - startTime; // 経過時間（ミリ秒）

        // タイムスタンプ間隔が短すぎる場合のスケーリングを適用
        let verticalPosition = (timeElapsed / totalDuration) * 100; // 比率を計算して百分率で縦位置を決定

        // 必要に応じてスケーリング
        if (timeElapsed < scaleFactor) {
            verticalPosition *= 2; // スケーリング因子（見やすさのための調整）
        }

        // プロットするオブジェクト（円やバーなど）
        const plotElement = document.createElement("div");
        plotElement.classList.add("plot-element");

        // 任意のスタイル設定（円形のオブジェクト）
        plotElement.style.position = "absolute";
        plotElement.style.left = "50%"; // 水平方向は中央に配置（オプション）
        plotElement.style.top = `${verticalPosition}%`; // 縦位置を設定
        plotElement.style.transform = "translateX(-50%)"; // 水平中央揃え
        plotElement.style.width = "10px";
        plotElement.style.height = "10px";
        plotElement.style.backgroundColor = "#4CAF50"; // 任意の色
        plotElement.style.borderRadius = "50%"; // 円形にする

        // 履歴の内容を表示（ツールチップ）
        plotElement.title = snap.timestamp + "\n" + snap.content;

        plotViewer.appendChild(plotElement);
    });

    // plotViewerの高さを100%に設定
    plotViewer.style.position = "relative";
    plotViewer.style.height = "100%";
}

// thumbnailAreaに最新の日付ごとの最後のスナップショットを表示
async function displayThumbnails() {
    const snapshots = await db_his.snapshots.orderBy("timestamp").toArray();
    thumbnailArea.innerHTML = ""; // 初期化

    // 日付ごとに最後のスナップショットを取得
    const dateGroupedSnapshots = {};

    snapshots.forEach((snap) => {
        const date = snap.timestamp.split("_")[0]; // 日付部分だけを取得 (例: 2024-03-21)

        // その日付の最後のスナップショットを保存
        if (!dateGroupedSnapshots[date] || dateGroupedSnapshots[date].id < snap.id) {
            dateGroupedSnapshots[date] = snap;
        }
    });

    // グループ化されたスナップショットを表示
    Object.keys(dateGroupedSnapshots).forEach((date) => {
        const snap = dateGroupedSnapshots[date];
        
        const snapContainer = document.createElement("div");
        snapContainer.classList.add("thumbnail-snapshot");
        snapContainer.style.marginBottom = "10px";
        snapContainer.style.margin = "0 auto"; // 横中央に配置

        const timestampLabel = document.createElement("div");
        timestampLabel.textContent = date; // 日付ラベルを表示
        timestampLabel.style.fontSize = "12px";
        timestampLabel.style.textAlign = "center";

        const miniTextArea = document.createElement("textarea");
        miniTextArea.value = snap.content;
        miniTextArea.readOnly = true;
        miniTextArea.style.width = "95%"; // 幅を95%に設定
        miniTextArea.style.height = "60px";
        miniTextArea.style.resize = "none";
        miniTextArea.style.overflowY = "scroll"; // 縦方向スクロールを有効にする
        miniTextArea.style.border = "1px solid gray";

        // ミニテキストエリアクリック時にtextInputAreaを更新
        miniTextArea.addEventListener("click", () => {
            textInputArea.value = snap.content;
            lastContent = snap.content; // 更新後の状態を保存
        });

        snapContainer.appendChild(timestampLabel);
        snapContainer.appendChild(miniTextArea);
        thumbnailArea.appendChild(snapContainer);
    });
}

// ページ読み込み時に最後のスナップショットをロード
window.addEventListener("load", () => {
    plotHistory(); // プロット関数を呼び出し
    loadLastSnapshot();
    displayThumbnails(); // thumbnailAreaに最新50件を表示
});
