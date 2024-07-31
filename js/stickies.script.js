// 付箋の数
// count ++ : sticky-noteが生成されたらcount++
//            sticky-noteが消去されたらcount-- 
var count = 0;

// 付箋の行数
const ElementsLength = 10;

// ***** 付箋を生成する関数 *****
function getNewNote(time) {
    var note = $('<div class="note">')
        .css({
            position: 'absolute', // 位置を絶対指定
            left: 100, // X座標の位置を指定
            top: 200,  // Y座標の位置を指定
            'z-index': 0, // 初期のz-index値を設定
        })
        .on('click', function () {
            var maxZIndex = Math.max.apply(null, $('.note').map(function () {
                return parseInt($(this).css('z-index')) || 0;
            }));
            $(this).css('z-index', maxZIndex + 1);
            // 他の付箋要素のz-indexを下げる
            $('.note').not(this).each(function () {
                var zIndex = parseInt($(this).css('z-index')) || 0;
                if (zIndex > 0) {
                    $(this).css('z-index', zIndex - 1);
                }
            });
        })
        .append('<input type="text" class="code_memo" placeholder="memo">')
        .append('<py-repl class="cell">')
        .append('<p class="timestamp">生成時刻: ' + time + '</p>')
        .append(
            $('<div class="sticky-button">')
                .append(
                    $('<div class="sticky-color-button">')
                        .append('<input class="color-button" data-color="#db6b3b" type="button">')
                        .append('<input class="color-button" data-color="#dfd964" type="button">')
                        .append('<input class="color-button" data-color="#7cd89c" type="button">')
                        .append('<input class="color-button" data-color="aliceblue" type="button">')
                )
                .append(
                    $('<div class="sticky-control-button">')
                        .append('<input class="delete-button" type="button" value="削除">')
                        .append('<input class="fixed-button" type="button" value="固定">')
                )
        );
    return note;
}

// ***** 付箋に様々な機能を付与する関数 *****
function appendFunctions($note) {
    // 付箋をドラッグアンドドロップできるようにする
    $note.draggable({
        containment: "#sticky-note-container" /* sticky-note-container領域のみでドラッグアンドドロップ可能にする*/
    });

    // color-buttonが押された際に付箋の色を変える
    $note.on('click', '.color-button', function () {
        const color = $(this).data('color');
        $(this).parents('.note').css('background-color', color);
    });

    // delete-buttonが押された際に付箋を削除する
    $note.on('click', '.delete-button', function () {
        $(this).parents('.note').remove();
        count--;
    });

    // fixed-buttonが押された際に付箋を固定・固定解除する
    $note.on('click', '.fixed-button', function () {
        // 現在の付箋要素のドラッグ可能な状態を取得
        var isDisabled = $(this).parents('.note').draggable("option", "disabled");

        // ドラッグが無効（固定）の場合、有効（固定解除）にする
        if (!isDisabled) {
            $(this).parents('.note').draggable("option", "disabled", true);
            // ドラッグが有効（固定解除）の場合、無効（固定）にする
        } else if (isDisabled) {
            $(this).parents('.note').draggable("option", "disabled", false);
        };
    });

    // タッチイベントの追加
    $note.on('touchstart touchmove touchend', function (e) {
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        var $target = $(e.target);

        if (e.type === 'touchstart') {
            $target.data('touchstartX', touch.pageX);
            $target.data('touchstartY', touch.pageY);
            $target.data('noteStartX', parseInt($note.css('left')));
            $target.data('noteStartY', parseInt($note.css('top')));
        } else if (e.type === 'touchmove') {
            var deltaX = touch.pageX - $target.data('touchstartX');
            var deltaY = touch.pageY - $target.data('touchstartY');
            $note.css({
                left: $target.data('noteStartX') + deltaX,
                top: $target.data('noteStartY') + deltaY
            });
            e.preventDefault(); // デフォルトのスクロール動作を防止
        }
    });
}

// ***** 現在時刻を取得する関数 *****
function now_time() {
    var date = new Date();
    var year = date.getFullYear();
    var month = ("0" + (date.getMonth() + 1)).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);
    var hour = ("0" + date.getHours()).slice(-2);
    var minute = ("0" + date.getMinutes()).slice(-2);
    var second = ("0" + date.getSeconds()).slice(-2);
    time_string = year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + ' ';

    return time_string;
}

// ***** add-buttonが押された際の処理 *****
$('#add-button').on('click', function () {
    var $note = $(getNewNote(now_time()));
    appendFunctions($note);
    $('#sticky-note-container').append($note);

    // 付箋の行数をコントロールする
    const lines = document.getElementsByClassName("cm-content")[count++]; // cm-content : コードセルの記入する場所の配列
    for (var i = 1; i < 0; i++) {
        var divLine = document.createElement("div");
        divLine.style = "padding: 0 2px 0 4px;";
        divLine.innerHTML = '';
        divLine.className = "cm-line"; // cm-line : cm-content配列の中身一つ一つ 
        lines.appendChild(divLine);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const warpButton = document.getElementById('warp-button');
    const stickyHistoryWindow = document.getElementById('sticky-history-window');
    let isZoomed = false;

    warpButton.addEventListener('click', function (event) {
        if (stickyHistoryWindow.style.display === 'block') {
            stickyHistoryWindow.style.display = 'none';
        } else {
            stickyHistoryWindow.style.display = 'block';
        }
    });

    stickyHistoryWindow.addEventListener('click', function (event) {
        if (event.shiftKey) {
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
    });
});

// ***** *****
// ***** *****

// ***** 付箋のプロパティをデータベースに格納するための関数 *****
async function stockInfo(stickies) {
    try {
        await db_his.stickies.bulkPut(stickies);
    } catch (error) {
        console.error("付箋データの保存中にエラーが発生しました:", error);
    }
}

// ***** 付箋データを読み込む関数 *****
async function loadStickyNotes() {
    try {
        const timestampDisplay = document.getElementById('timestamp-display');
        const selectedRunTime = timestampDisplay.textContent;

        const stickiesToDisplay = selectedRunTime === "--:--:--"
            ? await db_his.stickies.toArray()
            : await db_his.stickies.where('run_time').equals(selectedRunTime).toArray();

        const stickyHistories = document.getElementById('sticky-histories');
        stickyHistories.innerHTML = '';

        stickiesToDisplay.forEach(sticky => {
            const noteElement = createNote(
                sticky.generate_time,
                sticky.code,
                sticky.text,
                sticky.left,
                sticky.top,
                sticky.color
            );
            stickyHistories.insertAdjacentHTML('beforeend', noteElement);
        });
    } catch (error) {
        console.error("付箋データの読み込み中にエラーが発生しました:", error);
    }
}

// ***** 付箋のHTML要素を作成する関数 *****
function createNote(generate_time, code, memo, left, top, color) {
    const container = document.getElementById('sticky-note-container');
    const historyWindow = document.getElementById('sticky-histories');

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const historyWidth = historyWindow.offsetWidth;
    const historyHeight = historyWindow.offsetHeight;

    // 数値として処理する
    left = parseFloat(left);
    top = parseFloat(top);

    // スケールファクターの計算
    const scaleX = historyWidth / containerWidth;
    const scaleY = historyHeight / containerHeight;
    
    // 新しい位置を計算
    let newLeft = left * scaleX;
    let newTop = top * scaleY;

    // 付箋のサイズを最大値に基づいて設定
    const maxNoteWidth = historyWidth * 0.4;
    const maxNoteHeight = historyHeight * 0.35;

    return `
        <div class="new_note" style="position: absolute; left: ${newLeft}px; top: ${newTop}px; background: ${color}; width: ${maxNoteWidth}px; height: ${maxNoteHeight}px;">
            <input type="text" class="code_memo" placeholder="memo" value="${memo}" style="width: 100%;">
            <py-repl class="cell" style="width: 100%; height: calc(100% - 40px);">
                ${code}
            </py-repl>
            <p class="timestamp" style="width: 100%;">
                生成時刻: ${generate_time}
            </p>
            <div class="sticky-button">
                <div class="sticky-color-button">
                    <input data-color="#db6b3b" class="color-button" type="button">
                    <input data-color="#dfd964" class="color-button" type="button">
                    <input data-color="#7cd89c" class="color-button" type="button">
                    <input data-color="aliceblue" class="color-button" type="button">
                </div>
                <div class="sticky-control-button">
                    <input class="delete-button" type="button" value="削除">
                    <input class="fixed-button" type="button" value="固定">
                </div>
            </div>
        </div>
    `;
}

// ***** タイムコントロールを設定する関数 *****
let timestamps = [];

// ***** タイムコントロールを設定する関数 *****
async function loadTimestamps() {
    try {
        const allStickies = await db_his.stickies.orderBy('run_time').toArray();
        timestamps = [...new Set(allStickies.map(sticky => sticky.run_time))];
        const timeSlider = document.getElementById('time-slider');
        timeSlider.max = timestamps.length > 0 ? timestamps.length - 1 : 0;
        timeSlider.value = timeSlider.max;
        updateTimestampDisplay();
    } catch (error) {
        console.error("タイムスタンプの読み込み中にエラーが発生しました:", error);
    }
}

function updateTimestampDisplay() {
    const timestampDisplay = document.getElementById('timestamp-display');
    const timeSlider = document.getElementById('time-slider');
    const index = parseInt(timeSlider.value, 10);
    if (timestamps.length > 0 && index >= 0 && index < timestamps.length) {
        timestampDisplay.textContent = timestamps[index];
    } else {
        timestampDisplay.textContent = "--:--:--";
    }
}

document.getElementById('time-slider').addEventListener('input', function () {
    updateTimestampDisplay();
    loadStickyNotes();
});

// ***** btnRun (コード実行ボタン) が押された際の処理 *****
$('#sticky-note-container').on('click', '.py-repl-run-button', async function () {
    const runTime = now_time();
    const groupId = Date.now();

    const stickies = Array.from(document.querySelectorAll('#sticky-note-container .note')).map((divStyleElement, i) => {
        if (divStyleElement.closest('#sticky-histories')) {
            return null;
        }

        const style = window.getComputedStyle(divStyleElement);
        const pyReplElement = divStyleElement.querySelector('.cell');
        const pyReplBox = pyReplElement.querySelector('.py-repl-box');
        const pyReplEditor = pyReplBox.querySelector('.py-repl-editor');
        const divInEditor = pyReplEditor.querySelector('div');
        const shadowRoot = divInEditor.shadowRoot;
        const cmContent = shadowRoot.querySelector('.cm-content');
        const textContent = Array.from(cmContent.querySelectorAll('.cm-line')).map(line => {
            return Array.from(line.childNodes).map(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent.trim();
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    return Array.from(node.childNodes).map(childNode => childNode.textContent.trim()).join('');
                }
                return '';
            }).join('');
        }).join('\n');

        const isRunCell = pyReplElement.querySelector('.py-repl-run-button') === this;

        return {
            generate_time: divStyleElement.querySelector(".timestamp").textContent.replace("生成時刻: ", ""),
            run_time: runTime,
            code: textContent,
            text: divStyleElement.querySelector(".code_memo").value,
            top: style.getPropertyValue('top'),
            left: style.getPropertyValue('left'),
            color: style.backgroundColor,
            is_run_cell: isRunCell,
            group_id: groupId
        };
    }).filter(sticky => sticky !== null);

    await stockInfo(stickies);
    await loadStickyNotes();
    await loadTimestamps(); // スライダーの最大値を更新
});

// ページロード時に時間コントロールを設定
document.addEventListener('DOMContentLoaded', function () {
    loadTimestamps();
});
