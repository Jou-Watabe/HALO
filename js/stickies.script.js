let pyodide;

// Pyodideの初期化
(async function() {
    pyodide = await loadPyodide();
    console.log("Pyodide loaded successfully!");
})();

function now_time() {
    var date = new Date();
    var year = date.getFullYear();
    var month = ("0" + (date.getMonth() + 1)).slice(-2); // 月は0から始まるため +1
    var day = ("0" + date.getDate()).slice(-2);
    var hour = ("0" + date.getHours()).slice(-2);
    var minute = ("0" + date.getMinutes()).slice(-2);
    var second = ("0" + date.getSeconds()).slice(-2);
    
    // ローカルタイムを指定のフォーマットで返す
    var time_string = year + '-' + month + '-' + day + '_' + hour + ':' + minute + ':' + second;
    return time_string;
}

// コードセルを追加する関数
function addCodeCell() {
    const cell = document.createElement("div");
    cell.className = "code-cell";
    cell.style.top = `${Math.random() * 80 + 10}%`;
    cell.style.left = `${Math.random() * 80 + 10}%`;

    cell.innerHTML = `
        <div class="button-container">
            <button class="run-btn">Run</button>
            <button class="delete-btn" onclick="deleteCodeCell(this)">Delete</button>
            <button class="drag-toggle-btn" onclick="toggleDrag(this)">Toggle Drag</button>
            <input type="color" class="color-picker">
        </div>
        <div class="code-editor"></div>
        <div class="output"></div>
        <div class="note">
            <textarea class="text-note" placeholder="Write a note..."></textarea>
            <div class="timestamp">Generate time: ${now_time()}</div>
        </div>

    `;
    document.getElementById("workspace").appendChild(cell);

    const editorDiv = cell.querySelector(".code-editor");
    const codeEditor = CodeMirror(editorDiv, {
        mode: "python",
        lineNumbers: true,
        autoCloseBrackets: true,
        theme: "default"
    });

    cell.codeEditor = codeEditor;
    makeDraggable(cell);

    // code-cellがクリックされた時にz-indexを変更
    cell.addEventListener('click', () => {
        bringToFront(cell);
    });

    // イベントリスナーの設定
    const runButton = cell.querySelector(".run-btn");
    runButton.addEventListener("click", () => runCode(runButton));

    const colorPicker = cell.querySelector(".color-picker");
    colorPicker.addEventListener("change", (event) => changeCellColor(event.target, cell));
}

// コードセルを削除する関数
function deleteCodeCell(button) {
    const cell = button.closest('.code-cell');  // 最も近い親要素（code-cell）を取得
    cell.remove();  // code-cellを削除
}

// カラーパレットで色を変更する関数
function changeCellColor(input) {
    const cell = input.closest('.code-cell'); // 親のコードセルを取得
    const selectedColor = input.value; // カラーピッカーで選択された色
    cell.style.backgroundColor = selectedColor; // 背景色を変更
}

// クリックされたコードセルを最前面に持ってくる関数
function bringToFront(cell) {
    const allCells = document.querySelectorAll('.code-cell');
    let zIndex = 1;
    allCells.forEach((otherCell) => {
        otherCell.style.zIndex = zIndex++;  // 他のcellのz-indexを調整
    });
    // クリックされたcellを最前面に
    cell.style.zIndex = zIndex;
}

// コード実行関数
async function runCode(button) {
    const cell = button.closest('.code-cell');
    const code = cell.codeEditor.getValue();  // 入力されたコードを取得
    const outputDiv = cell.querySelector(".output");

    // 現在のタイムスタンプを生成
    const runTime = now_time();
    const groupId = Date.now(); // 一意なグループIDを生成

    // workspace内のすべてのcode-cellを取得
    const allCells = document.querySelectorAll('.code-cell');
    // sticky-histories内のcode-cellを取得
    const stickyHistoriesCells = document.querySelectorAll('#sticky-histories .code-cell');
    // sticky-histories内のcode-cellを除外
    const cellsToProcess = Array.from(allCells).filter(cell => !Array.from(stickyHistoriesCells).includes(cell));

    try {
        // 必要なパッケージのインストール
        await pyodide.loadPackage(['matplotlib', 'numpy', 'pandas', 'scipy']);

        // 改行とインデントを強制的に処理する
        const sanitizedCode = code
        .replace(/\\/g, "\\\\")       // バックスラッシュのエスケープ
        .replace(/`/g, "\\`")         // バッククォートのエスケープ
        .replace(/\$/g, "\\$")        // ドル記号のエスケープ
        .replace(/\n/g, "\\n")        // 改行文字をエスケープ
        .replace(/\r/g, "\\r");       // キャリッジリターンのエスケープ

        const result = await pyodide.runPythonAsync(`
            import sys
            from io import StringIO
            import matplotlib.pyplot as plt
            import numpy as np
            import pandas as pd
            import scipy
            import js
            from pyodide.ffi import to_js

            # 標準出力をリダイレクト
            sys.stdout = StringIO()

            # コードセルのサイズを取得（ピクセル単位）
            cell_width = js.document.querySelector('.code-cell').clientWidth
            cell_height = js.document.querySelector('.code-cell').clientHeight

            # 図のサイズを設定（コードセルのサイズに合わせる）
            fig_width = cell_width / 50  # 100ピクセルあたり1インチに変換
            fig_height = cell_height / 50  # 同様に高さも調整

            # ユーザーのコードを実行
            try:
                exec("""${sanitizedCode}""")
                output = sys.stdout.getvalue()
            except Exception as e:
                output = str(e)

            # Matplotlibの出力処理
            if plt.get_fignums():  # 図が存在する場合
                import io, base64
                fig = plt.gcf()
                fig.set_size_inches(fig_width, fig_height)  # 図のサイズを設定
                buf = io.BytesIO()
                fig.savefig(buf, format='png')
                buf.seek(0)
                img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                js_code = f"<img src='data:image/png;base64,{img_base64}' />"
                output = output + "\\n" + js_code

                plt.close(fig)

            output
        `);

        // 出力エリアに反映
        outputDiv.innerHTML = result.trim();
    } catch (err) {
        outputDiv.textContent = `Error: ${err}`;
    }

    // 各コードセルの情報を収集し、stickiesテーブルに保存
    const stickiesData = Array.from(cellsToProcess).map((cell) => {
        const noteElement = cell.querySelector(".note");
        const generateTime = noteElement.querySelector(".timestamp").textContent.replace("Generate time: ", "").trim();
        const output = cell.querySelector(".output").textContent;
        const textNote = noteElement.querySelector(".text-note").value.trim();
        const colorPicker = cell.querySelector(".color-picker").value || "white";
        const codeEditorValue = cell.codeEditor.getValue();
        const top = parseFloat(cell.style.top || "0");
        const left = parseFloat(cell.style.left || "0");

        // 収集したデータを返す
        return {
            generate_time: generateTime,
            run_time: runTime,
            code: codeEditorValue,
            text: textNote,
            output: output,
            top: top,
            left: left,
            color: colorPicker,
            is_run_cell: cell === button.closest('.code-cell'), // 実行されたセルかどうか
            group_id: groupId,
        };
    });

    // データをDexie.jsのstickiesテーブルに追加
    try {
        await db_his.stickies.bulkAdd(stickiesData);
        console.log("All code-cell data saved successfully!", stickiesData);
    } catch (err) {
        console.error("Error saving to stickies table:", err);
    }
}

// ドラッグ可能にする関数
function makeDraggable(element) {
    let isDragging = false, offsetX, offsetY;

    // workspaceのサイズを取得
    const workspace = document.getElementById('workspace');
    let workspaceWidth = workspace.clientWidth;
    let workspaceHeight = workspace.clientHeight;

    // リサイズ時にworkspaceのサイズを再計算
    const updateWorkspaceSize = () => {
        workspaceWidth = workspace.clientWidth;
        workspaceHeight = workspace.clientHeight;
    };

    window.addEventListener('resize', updateWorkspaceSize);

    // 初期状態はドラッグ可能
    element.isDraggable = true; 

    element.addEventListener('mousedown', (e) => {
        if (element.isDraggable) {
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            element.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging && element.isDraggable) {
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            // workspace内に収めるための制限
            newLeft = Math.max(0, Math.min(newLeft, workspaceWidth - element.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, workspaceHeight - element.offsetHeight));

            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        element.style.cursor = 'grab';
    });
}

// ドラッグの可否を切り替える関数
function toggleDrag(button) {
    const cell = button.closest('.code-cell');  // クリックしたボタンに最も近いコードセルを取得
    cell.isDraggable = !cell.isDraggable;  // ドラッグ状態をトグル

    // ドラッグ状態に基づいてボタンのテキストを変更
    button.textContent = cell.isDraggable ? "Disable Drag" : "Enable Drag"; 

    // ドラッグ状態に応じて、マウスカーソルを変更
    const editor = cell.querySelector('.code-editor');
    editor.style.cursor = cell.isDraggable ? 'grab' : 'not-allowed';
}

document.addEventListener('DOMContentLoaded', function () {
    const warpButton = document.getElementById('warp-btn');
    const stickyHistoryWindow = document.getElementById('sticky-history-window');
    let isHidden = true; // 初期状態を非表示に設定
    let isZoomed = false;

    warpButton.addEventListener('click', function (event) {
        if (isHidden) {
            stickyHistoryWindow.style.visibility = 'visible';
        } else {
            stickyHistoryWindow.style.visibility = 'hidden';
        }
        isHidden = !isHidden; // 状態を反転
    });

    function toggleZoom() {
        if (isZoomed) {
            stickyHistoryWindow.style.top = '';
            stickyHistoryWindow.style.left = '';
            stickyHistoryWindow.classList.remove('zoomed');
            isZoomed = false;
        } else {
            stickyHistoryWindow.style.top = '0';
            stickyHistoryWindow.style.left = '0';
            stickyHistoryWindow.classList.add('zoomed');
            isZoomed = true;
        }
    }

    stickyHistoryWindow.addEventListener('click', function (event) {
        if (event.shiftKey) {
            toggleZoom();
        }
    });

    stickyHistoryWindow.addEventListener('dblclick', function () {
        toggleZoom();
    });
});


document.addEventListener("DOMContentLoaded", async () => {
    const timeSlider = document.getElementById("time-slider");
    const timestampDisplay = document.getElementById("timestamp-display");
    const stickyHistories = document.getElementById("sticky-histories");

    // indexedDBからデータを取得
    const allStickies = await db_his.stickies.toArray();

    // run_timeの種類を取得
    const uniqueRunTimes = [...new Set(allStickies.map(sticky => sticky.run_time))];

    // time-sliderの設定
    timeSlider.max = uniqueRunTimes.length - 1;
    timeSlider.value = 0;
    updateTimestampDisplayAndHistories(0);

    // time-sliderのイベントリスナー
    timeSlider.addEventListener("input", (event) => {
        const index = parseInt(event.target.value, 10);
        updateTimestampDisplayAndHistories(index);
    });

    // run_timeに基づいてtimestamp-displayとsticky-historiesを更新
    function updateTimestampDisplayAndHistories(index) {
        const selectedRunTime = uniqueRunTimes[index];
        timestampDisplay.textContent = selectedRunTime;

        // sticky-historiesをクリア
        stickyHistories.innerHTML = "";

        // 選択されたrun_timeに関連するデータを取得
        const stickiesForRunTime = allStickies.filter(sticky => sticky.run_time === selectedRunTime);

        // code-cellを生成してsticky-historiesに追加
        stickiesForRunTime.forEach(sticky => {
            const cell = document.createElement("div");
            cell.className = "code-cell";
            cell.style.top = `${sticky.top}px`;
            cell.style.left = `${sticky.left}px`;
            cell.style.backgroundColor = sticky.color;

            cell.innerHTML = `
                <div class="button-container">
                    <button class="run-btn">Run</button>
                    <button class="delete-btn" disabled>Delete</button>
                    <button class="drag-toggle-btn" disabled>Toggle Drag</button>
                    <input type="color" class="color-picker" value="${sticky.color}" disabled>
                </div>
                <div class="code-editor"></div>
                <div class="output">${sticky.output}</div>
                <div class="note">
                    <textarea class="text-note" placeholder="Write a note..." disabled>${sticky.text}</textarea>
                    <div class="timestamp">Generate time: ${sticky.generate_time}</div>
                </div>
            `;

            stickyHistories.appendChild(cell);
  
            const editorDiv = cell.querySelector(".code-editor");
            const codeEditor = CodeMirror(editorDiv, {
                mode: "python",
                lineNumbers: true,
                autoCloseBrackets: true,
                theme: "default",
            });

            codeEditor.setValue(sticky.code);
        });
    }
});
