document.addEventListener('DOMContentLoaded', function () {
    const table = document.querySelector('table');
    if (!table) return;

    // 根据你的分类标准定义颜色
    const categoryColors = {
        'context-aware': '#d1fae5',   // Context-aware multi-speaker —— 绿色
        'voice-design': '#dbeafe',    // Single-speaker voice-design —— 蓝色
        'voice-control': '#fef9c3',   // Single-speaker voice-control —— 黄色
        'multi-speaker': '#fee2e2',   // Multi-speaker TTS —— 红色
        'unknown': '#f3f4f6'          // 未分类 —— 灰色
    };

    // 根据 data-category 给行上色
    function applyRowColors() {
        table.querySelectorAll('tbody tr').forEach(row => {
            const category = row.getAttribute('data-category') || 'unknown';
            row.style.backgroundColor = categoryColors[category] || categoryColors['unknown'];
        });
    }

    // 解析单元格数值（去除 % 和 ± 及其后的标准差）
    function parseCellValue(text) {
        if (!text) return null;
        let cleaned = text.replace(/%/g, '').trim();
        cleaned = cleaned.split('±')[0].trim();
        if (cleaned === '/' || cleaned === '') return null;
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }

    // 表头点击排序
    table.querySelectorAll('thead th').forEach((th, colIndex) => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', function () {
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));

            const isAsc = th.dataset.order !== 'asc';
            th.dataset.order = isAsc ? 'asc' : 'desc';

            rows.sort((a, b) => {
                const aText = a.children[colIndex]?.textContent.trim() || '';
                const bText = b.children[colIndex]?.textContent.trim() || '';
                const aNum = parseCellValue(aText);
                const bNum = parseCellValue(bText);

                if (aNum !== null && bNum !== null) {
                    return isAsc ? aNum - bNum : bNum - aNum;
                }
                if (aNum !== null) return -1;
                if (bNum !== null) return 1;
                return isAsc ? aText.localeCompare(bText) : bText.localeCompare(aText);
            });

            rows.forEach(row => tbody.appendChild(row));
            applyRowColors(); // 排序后重新上色
        });
    });

    applyRowColors(); // 初始化上色
});
