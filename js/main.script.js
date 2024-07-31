// CodeMirrorの初期化
const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    mode: 'python',
    lineNumbers: true,
    theme: 'default' // 必要に応じてテーマを変更
});
