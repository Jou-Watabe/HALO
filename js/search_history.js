// // Dexieの初期化
// const db_his = new Dexie("HALOdb");

// // データベースのバージョンとテーブル（ストア）の定義
// db_his.version(1).stores({
//   searchHistory: "++id, visitTime, event, title, url, tabId, tabTitle, keyword"
// });

async function importSearchHistory() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv';
  fileInput.addEventListener('change', handleFileSelect);
  fileInput.click();
}

async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    const csv = event.target.result;
    const lines = csv.split('\n');

    // 列名を定義
    const headers = ["visitTime", "event", "title", "url", "tabId", "tabTitle", "keyword"];

    // 1行目をスキップするためにiを1からではなく2から始める
    for (let i = 1; i < lines.length; i++) {
      const data = lines[i].split(',');

      if (data.length !== headers.length) {
        console.error(`行 ${i + 1} のデータが正しくありません`);
        continue;
      }

      const record = {};
      headers.forEach((header, index) => {
        // データが空であれば空の文字列を代入する
        record[header.trim()] = data[index].trim() || '';
      });

      // IndexedDBにデータが存在するか確認してから追加
      const exists = await db_his.searchHistory.where({
        visitTime: record.visitTime,
        event: record.event,
        title: record.title,
        url: record.url,
        tabId: record.tabId,
        tabTitle: record.tabTitle,
        keyword: record.keyword
      }).count();

      if (exists === 0) {
        await addRecordTodb(record);
      } else {
        console.log(`行 ${i + 1} のデータは既に存在しています`);
      }
    }

    alert("検索履歴のインポートが完了しました");
  };

  reader.readAsText(file);
}

// 検索履歴をデータベースに追加する関数
async function addRecordTodb(record) {
  await db_his.searchHistory.add(record);
}

// 検索履歴をデータベースから取得して表示する関数
async function showSearchHistory() {
  try {
    const searchHistory = await db_his.searchHistory.orderBy('visitTime').toArray();
    const tabIds = await db_his.searchHistory.orderBy('tabId').uniqueKeys();
    const years = [...new Set(searchHistory.map(record => record.visitTime.split('_')[0].split('-')[0]))];

    let html = "<!DOCTYPE html><html lang='ja'><head><meta charset='UTF-8'><title>検索履歴</title>";
    html += "<link rel='stylesheet' href='./styles/search_history.style.css'>";
    html += "</head><body>";
    html += "<h2>検索履歴</h2>";

    // フィルタリングエリアの追加
    html += "<div id='filterArea'>";
    
    // tabIdフィルタ
    html += "<select id='tabIdFilter'><option value=''>全てのタブID</option>";
    tabIds.forEach(tabId => {
      html += `<option value='${tabId}'>${tabId}</option>`;
    });
    html += "</select>";

    // 年フィルタ
    html += "<select id='yearFilter'><option value=''>全ての年</option>";
    years.forEach(year => {
      html += `<option value='${year}'>${year}</option>`;
    });
    html += "</select>";

    // 月フィルタ
    html += "<select id='monthFilter' disabled><option value=''>全ての月</option></select>";

    // 日フィルタ
    html += "<select id='dayFilter' disabled><option value=''>全ての日</option></select>";

    // html += "<button onclick='resetFilter()'>リセット</button>";
    html += "</div>";

    html += "<table class='search-history-table'>";
    html += "<tr><th>ID</th><th>Event</th><th>Visit Time</th><th>Title</th><th>URL</th><th>Tab ID</th><th>Tab Title</th><th>Keyword</th></tr>";
    searchHistory.forEach(record => {
      html += "<tr>";
      html += `<td>${record.id}</td>`;
      html += `<td>${record.event || ''}</td>`;
      html += `<td>${record.visitTime || ''}</td>`;
      html += `<td>${record.title || ''}</td>`;
      html += `<td class="wrap">${record.url || ''}</td>`;
      html += `<td>${record.tabId || ''}</td>`;
      html += `<td>${record.tabTitle || ''}</td>`;
      html += `<td>${record.keyword || ''}</td>`;
      html += "</tr>";
    });
    html += "</table>";
    html += "</body></html>";

    const popupWindow = window.open("", "_blank", "width=1200,height=400");
    if (!popupWindow) {
      alert("ポップアップウィンドウを開けませんでした。ブラウザのポップアップブロックを解除してください。");
      return;
    }
    popupWindow.document.write(html);

    // イベントリスナーを追加
    popupWindow.document.getElementById('tabIdFilter').addEventListener('change', (event) => {
      filterSearchHistory(popupWindow);
    });

    popupWindow.document.getElementById('yearFilter').addEventListener('change', async (event) => {
      const selectedYear = event.target.value;
      const months = selectedYear ? await getMonthsByYear(selectedYear) : [];
      updateMonthFilter(months, popupWindow);
      filterSearchHistory(popupWindow);
    });

    popupWindow.document.getElementById('monthFilter').addEventListener('change', async (event) => {
      const selectedYear = popupWindow.document.getElementById('yearFilter').value;
      const selectedMonth = event.target.value;
      const days = (selectedYear && selectedMonth) ? await getDaysByYearMonth(selectedYear, selectedMonth) : [];
      updateDayFilter(days, popupWindow);
      filterSearchHistory(popupWindow);
    });

    popupWindow.document.getElementById('dayFilter').addEventListener('change', () => {
      filterSearchHistory(popupWindow);
    });

  } catch (error) {
    console.error('データの取得中にエラーが発生しました:', error);
  }
}

// 検索履歴をフィルタリングして表示する関数
async function filterSearchHistory(popupWindow) {
  try {
    const tabId = popupWindow.document.getElementById('tabIdFilter').value;
    const year = popupWindow.document.getElementById('yearFilter').value;
    const month = popupWindow.document.getElementById('monthFilter').value;
    const day = popupWindow.document.getElementById('dayFilter').value;

    let searchHistory = await db_his.searchHistory.toArray();

    // console.log('Initial searchHistory:', searchHistory); // デバッグ用のログ

    if (tabId) {
      searchHistory = searchHistory.filter(record => record.tabId == tabId);
    }

    if (year) {
      searchHistory = searchHistory.filter(record => record.visitTime.startsWith(`${year}-`));
    }

    if (month) {
      const monthPrefix = month.length === 1 ? `0${month}` : month;
      searchHistory = searchHistory.filter(record => record.visitTime.startsWith(`${year}-${monthPrefix}`));
    }

    if (day) {
      searchHistory = searchHistory.filter(record => {
        const monthPrefix = month.length === 1 ? `0${month}` : month;  // 月を二桁の形式で表現する
        const dayPrefix = day.length === 1 ? `0${day}` : day;  // 日を二桁の形式で表現する
        console.log('Filtering by day:', `${year}-${monthPrefix}-${dayPrefix}`);
        return record.visitTime.startsWith(`${year}-${monthPrefix}-${dayPrefix}`);
      });
    }

    // console.log('Filtered searchHistory:', searchHistory); // デバッグ用のログ

    let html = "<table class='search-history-table'>";
    html += "<tr><th>ID</th><th>Event</th><th>Visit Time</th><th>Title</th><th>URL</th><th>Tab ID</th><th>Tab Title</th><th>Keyword</th></tr>";
    searchHistory.forEach(record => {
      html += "<tr>";
      html += `<td>${record.id}</td>`;
      html += `<td>${record.event || ''}</td>`;
      html += `<td>${record.visitTime || ''}</td>`;
      html += `<td>${record.title || ''}</td>`;
      html += `<td class="wrap">${record.url || ''}</td>`;
      html += `<td>${record.tabId || ''}</td>`;
      html += `<td>${record.tabTitle || ''}</td>`;
      html += `<td>${record.keyword || ''}</td>`;
      html += "</tr>";
    });
    html += "</table>";

    popupWindow.document.querySelector('.search-history-table').outerHTML = html;
  } catch (error) {
    console.error('フィルタリング中にエラーが発生しました:', error);
  }
}

// 月フィルタの更新関数
function updateMonthFilter(months, popupWindow) {
  const monthFilter = popupWindow.document.getElementById('monthFilter');
  monthFilter.innerHTML = "<option value=''>全ての月</option>";
  months.forEach(month => {
    monthFilter.innerHTML += `<option value='${month}'>${month}</option>`;
  });
  monthFilter.disabled = months.length === 0;
}

// 日フィルタの更新関数
function updateDayFilter(days, popupWindow) {
  const dayFilter = popupWindow.document.getElementById('dayFilter');
  dayFilter.innerHTML = "<option value=''>全ての日</option>";
  days.forEach(day => {
    dayFilter.innerHTML += `<option value='${day}'>${day}</option>`;
  });
  dayFilter.disabled = days.length === 0;
}

// 年に基づいて月を取得する関数
async function getMonthsByYear(year) {
  const months = await db_his.searchHistory
    .where('visitTime')
    .between(`${year}-01-01_00:00:00`, `${year}-12-31_23:59:59`, true, true)
    .toArray();

  return [...new Set(months.map(record => new Date(record.visitTime.replace('_', 'T')).getMonth() + 1))];
}

// 年と月に基づいて日を取得する関数
async function getDaysByYearMonth(year, month) {
  const monthPrefix = month.length === 1 ? `0${month}` : month;
  const days = await db_his.searchHistory
    .where('visitTime')
    .between(`${year}-${monthPrefix}-01_00:00:00`, `${year}-${monthPrefix}-31_23:59:59`, true, true)
    .toArray();

  return [...new Set(days.map(record => new Date(record.visitTime.replace('_', 'T')).getDate()))];
}

// // データベースの内容を確認するための関数
// async function checkDatabaseContent() {
//   const searchHistory = await db_his.searchHistory.toArray();
//   console.log('Database Content:', searchHistory);
// }

// checkDatabaseContent();