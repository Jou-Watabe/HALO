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
        // .hover(
        //     function () {
        //         // 現在の付箋要素よりも高いz-indexを設定
        //         var maxZIndex = Math.max.apply(null, $('.note').map(function () {
        //             return parseInt($(this).css('z-index')) || 0;
        //         }));
        //         $(this).css('z-index', maxZIndex + 1);
        //     },
        //     function () {
        //         // マウスが外れた時にz-indexを元に戻す必要はない
        //     }

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

    // 指定したコードセルの行を強調表示
    $(function () {
        $('#editor-box').linedtextarea({
            selectedLine: 1
        });
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
    time_string = year + '-' + month + '-' + day + '_' + hour + ':' + minute + ':' + second + ' ';

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


// ***** *****
// ***** *****