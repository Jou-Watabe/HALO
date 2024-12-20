// Dexieの初期化
const db = new Dexie("DirectorySystemDB");

// データベースのバージョンとストア（テーブル）の定義
db.version(1).stores({
  folders: "++id, name, parentId",
  files: "++id, name, content, parentId"
});

// フォルダとファイルのクラスを定義
class Folder {
  constructor(name, parentId) {
    this.name = name;
    this.parentId = parentId;
  }
}

class File {
  constructor(name, content, parentId) {
    this.name = name;
    this.content = content;
    this.parentId = parentId;
  }
}

// 新しいフォルダを追加する関数
async function addFolder(name, parentId) {
  return await db.folders.add(new Folder(name, parentId));
}

// 新しいファイルを追加する関数
async function addFile(name, content, parentId) {
  return await db.files.add(new File(name, content, parentId));
}

// フォルダとその中身を削除する関数
async function deleteFolder(folderId) {
  await db.transaction('rw', db.folders, db.files, async () => {
    await db.files.where('parentId').equals(folderId).delete();
    await db.folders.delete(folderId);
  });
}

// ファイルを削除する関数
async function deleteFile(fileId) {
  await db.files.delete(fileId);
}

// フォルダツリーを描画する関数
async function renderFolderTree() {
  const folders = await db.folders.toArray();
  const files = await db.files.toArray();

  let folderTree = document.getElementById("folderTree");
  folderTree.innerHTML = "";

  folders.forEach(folder => {
    let folderElement = document.createElement("div");
    folderElement.classList.add("folder");

    let folderHeader = document.createElement("div");
    folderHeader.classList.add("folder-header");

    let folderName = document.createElement("span");
    folderName.textContent = `📁 ${folder.name}`;
    folderHeader.appendChild(folderName);

    let deleteFolderButton = document.createElement("button");
    deleteFolderButton.textContent = "削除";
    deleteFolderButton.addEventListener("click", async () => {
      await deleteFolder(folder.id);
      renderFolderTree();
    });
    folderHeader.appendChild(deleteFolderButton);

    let createFileButton = document.createElement("button");
    createFileButton.textContent = "ファイル作成";
    createFileButton.addEventListener("click", async () => {
      await createFile(folder.id);
    });
    folderHeader.appendChild(createFileButton);

    folderElement.appendChild(folderHeader);

    let fileList = document.createElement("div");
    fileList.classList.add("file-list");

    let folderFiles = files.filter(file => file.parentId === folder.id);
    folderFiles.forEach(file => {
      let fileElement = document.createElement("div");
      fileElement.classList.add("file");

      let fileName = document.createElement("span");
      fileName.textContent = `📄 ${file.name}`;
      fileElement.appendChild(fileName);

      let deleteFileButton = document.createElement("button");
      deleteFileButton.textContent = "削除";
      deleteFileButton.addEventListener("click", async () => {
        await deleteFile(file.id);
        renderFolderTree();
      });
      fileElement.appendChild(deleteFileButton);

      fileElement.addEventListener("click", async () => {
        await openFile(file);
      });

      fileList.appendChild(fileElement);
    });

    folderElement.appendChild(fileList);
    folderTree.appendChild(folderElement);
  });
}

// ページの読み込みが完了したらフォルダツリーを描画する
document.addEventListener("DOMContentLoaded", () => {
  renderFolderTree();
  // Prism.highlightAll();
});

document.getElementById("createFolderButton").addEventListener("click", async () => {
  let folderName = prompt("フォルダ名を入力してください:");
  if (folderName) {
    await addFolder(folderName, null);
    renderFolderTree();
  }
});

// ファイル作成のための関数
async function createFile(folderId) {
  let fileName = prompt("ファイル名を入力してください:");
  if (fileName) {
    let fileContent = prompt("ファイルの内容を入力してください:");
    if (fileContent) {
      await addFile(fileName, fileContent, folderId);
      renderFolderTree();
    }
  }
}

// ファイルを開く関数
async function openFile(file) {
  const tabBar = document.getElementById("tab-bar");

  // 既存のタブがあるかチェック
  let existingTab = document.querySelector(`[data-file-id="${file.id}"]`);
  if (!existingTab) {
      // 新しいタブを作成
      const newTab = document.createElement("div");
      newTab.classList.add("tab");
      newTab.textContent = file.name;
      newTab.setAttribute("data-file-id", file.id);
      newTab.setAttribute("data-folder-id", file.parentId);
      tabBar.appendChild(newTab);

      // タブのクリックイベント
      newTab.addEventListener("click", async () => {
          const updatedFile = await db.files.get(file.id);
          editor.setValue(updatedFile.content); // CodeMirrorエディタにファイルの内容を設定
          setActiveTab(newTab);
      });

      // タブに削除ボタンを追加
      const deleteTabButton = document.createElement("span");
      deleteTabButton.textContent = "×";
      deleteTabButton.classList.add("delete-tab");
      deleteTabButton.addEventListener("click", (e) => {
          e.stopPropagation();
          tabBar.removeChild(newTab);
          editor.setValue("");
      });
      newTab.appendChild(deleteTabButton);

      // 新しいタブをアクティブに設定
      setActiveTab(newTab);
  }

  // エディタにファイルの内容を表示
  editor.setValue(file.content); // CodeMirrorエディタにファイルの内容を設定

  // 既存のタブをアクティブにする
  if (existingTab) {
      const updatedFile = await db.files.get(file.id);
      editor.setValue(updatedFile.content); // CodeMirrorエディタにファイルの内容を設定
      setActiveTab(existingTab);
  }
}

// タブをアクティブにする関数
function setActiveTab(tab) {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(t => t.classList.remove("active-tab"));
  tab.classList.add("active-tab");
}

// ファイルの保存関数
async function saveFile() {
  const activeTab = document.querySelector(".active-tab");
  if (activeTab) {
      const fileId = Number(activeTab.getAttribute("data-file-id"));
      const folderId = Number(activeTab.getAttribute("data-folder-id"));
      const newContent = editor.getValue(); // CodeMirrorエディタからコードを取得

      await db.files.update(fileId, { content: newContent });

      const folder = await db.folders.get(folderId);
      const file = await db.files.get(fileId);

      alert(`${folder.name}フォルダの${file.name}ファイルが上書き保存されました`);
  } else {
      alert("保存するファイルがありません。");
  }
}

// Ctrl + S キーボードショートカットの処理
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    saveFile();
  }
});

// Pyodideの初期化
let pyodideReadyPromise = loadPyodide();

document.querySelector(".run-btn").addEventListener("click", async () => {
    const outputElement = document.getElementById("output");
    outputElement.innerHTML = ""; // 実行結果をクリア

    // エディタのPythonコードを取得
    const code = editor.getValue();

    try {
        const pyodide = await pyodideReadyPromise;

        await pyodide.loadPackage(['matplotlib', 'numpy', 'pandas', 'scipy']);

        // 改行とインデントを強制的に処理する
        const sanitizedCode = code
        .replace(/\\/g, "\\\\")       // バックスラッシュのエスケープ
        .replace(/`/g, "\\`")         // バッククォートのエスケープ
        .replace(/\$/g, "\\$")        // ドル記号のエスケープ
        .replace(/\n/g, "\\n")        // 改行文字をエスケープ
        .replace(/\r/g, "\\r");       // キャリッジリターンのエスケープ

        // 標準出力をキャプチャするコードを注入
        const wrappedCode = `
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
            cell_width = js.document.getElementById("output").clientWidth
            cell_height = js.document.getElementById("output").clientHeight

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
        `;

        // 実行して結果を取得
        const result = pyodide.runPython(wrappedCode);

        // 実行結果を表示
        if (result && result.trim()) {
            outputElement.innerHTML = `<pre>${result}</pre>`;
        } else {
            outputElement.innerHTML = `<pre>実行完了（出力なし）</pre>`;
        }
    } catch (error) {
        // JavaScriptエラーをキャッチして表示
        outputElement.innerHTML = `<pre style="color: red;">エラー: ${error.message}</pre>`;
    }
});
