// function navigateToPage(page, event) {
//     if (event.shiftKey) {
//         window.open(page, '_blank');
//     } else {
//         window.location.href = page;
//     }
// }

function navigateToPage(page) {
    window.location.href = page;
}

function updateMenu() {
    const currentPage = window.location.pathname.split('/').pop();

    switch (currentPage) {
        case 'HALO-TextEditor.html':
            document.getElementById('HALO-TextEditor-btn').textContent = 'Topに戻る';
            document.getElementById('HALO-TextEditor-btn').onclick = () => navigateToPage('index.html');
            break;
        case 'HALO-Echo.html':
            document.getElementById('HALO-Echo-btn').textContent = 'Topに戻る';
            document.getElementById('HALO-Echo-btn').onclick = () => navigateToPage('index.html');
            break;
        case 'HALO-Stickies.html':
            document.getElementById('HALO-Stickies-btn').textContent = 'Topに戻る';
            document.getElementById('HALO-Stickies-btn').onclick = () => navigateToPage('index.html');
            break;
        case 'HALO-Browser.html':
            document.getElementById('HALO-Browser-btn').textContent = 'Topに戻る';
            document.getElementById('HALO-Browser-btn').onclick = () => navigateToPage('index.html');
            break;
        case 'HALO-Projection.html':
            document.getElementById('HALO-Projection-btn').textContent = 'Topに戻る';
            document.getElementById('HALO-Projection-btn').onclick = () => navigateToPage('index.html');
            break;
    }
}

document.addEventListener('DOMContentLoaded', updateMenu);