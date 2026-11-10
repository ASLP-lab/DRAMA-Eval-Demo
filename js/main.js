let metricsData = {}, caseDataZH = {}, caseDataEN = {};
let radarChart = null;

async function loadData() {
    try {
        // 1. 加载原有的 json 数据
        metricsData = await (await fetch('data/metrics.json')).json();
        
        // ================= 注入新的模型数据 (加入 isNew 标记) =================
        const newModelsZh = [
            // Qwen-Audio-3.1-TTS-Next (绿色)
            { Model: 'Qwen-Audio-3.1-TTS-Next', Group: 'green', A1: 5.79, A2: 0.6952, B1: 43.07, B2: 39.46, B3: 42.39, C1: 46.94, C2: 41.44, C3: 43.03, isNew: true },
            
            // Ming-3.0-tts-tiny 改为红色 (red)
            { Model: 'Ming-3.0-tts-tiny', Group: 'red', A1: 4.67, A2: 0.7401, B1: null, B2: 49.5, B3: 29.6, C1: 33.9, C2: 31.3, C3: 27.1, isNew: true },
            
            { Model: 'Ming-3.0-tts-0.5B', Group: 'blue', A1: 2.55, A2: 0.5249, B1: 43.5, B2: 55.6, B3: 41.2, C1: 39.7, C2: 31.7, C3: 30.2, isNew: true },
            { Model: 'Fun-CosyVoice3-0.5B', Group: 'yellow', A1: 2.98, A2: 0.7556, B1: 50.2, B2: 48.2, B3: 50.6, C1: 42.6, C2: 38.8, C3: 36.9, isNew: true },
            
            // MOSS-TTS-2.0 Preview (红色，B1 为空)
            { Model: 'MOSS-TTS-2.0 Preview', Group: 'red', A1: 4.28, A2: 0.7977, B1: null, B2: 44.5, B3: 26.0, C1: 39.6, C2: 38.7, C3: 34.8, isNew: true }
        ];
        const newModelsEn = [
            // Qwen-Audio-3.1-TTS-Next (绿色)
            { Model: 'Qwen-Audio-3.1-TTS-Next', Group: 'green', A1: 7.78, A2: 0.6296, B1: 44.07, B2: 39.85, B3: 42.72, C1: 42.79, C2: 36.06, C3: 36.54, isNew: true },
            
            // Ming-3.0-tts-tiny 改为红色 (red)
            { Model: 'Ming-3.0-tts-tiny', Group: 'red', A1: 7.64, A2: 0.7165, B1: null, B2: 39.0, B3: 14.4, C1: 26.1, C2: 13.3, C3: 9.3, isNew: true },
            
            { Model: 'Ming-3.0-tts-0.5B', Group: 'blue', A1: 4.13, A2: 0.3573, B1: 34.5, B2: 48.6, B3: 28.8, C1: 37.6, C2: 31.3, C3: 30.1, isNew: true },
            { Model: 'Fun-CosyVoice3-0.5B', Group: 'yellow', A1: 4.31, A2: 0.6968, B1: 31.6, B2: 38.1, B3: 22.4, C1: 29.6, C2: 19.1, C3: 15.4, isNew: true },
            
            // MOSS-TTS-2.0 Preview (红色，B1 为空)
            { Model: 'MOSS-TTS-2.0 Preview', Group: 'red', A1: 4.87, A2: 0.7609, B1: null, B2: 36.8, B3: 17.0, C1: 34.2, C2: 31.7, C3: 26.4, isNew: true }
        ];

        if (!metricsData) metricsData = {};
        if (!metricsData['zh']) metricsData['zh'] = [];
        if (!metricsData['en']) metricsData['en'] = [];

        metricsData['zh'] = metricsData['zh'].concat(newModelsZh);
        metricsData['en'] = metricsData['en'].concat(newModelsEn);

        // 按 Group 排序，确保相同颜色的模型紧挨在一起（绿->蓝->黄->红）
        const groupOrder = { 'green': 1, 'blue': 2, 'yellow': 3, 'red': 4 };
        metricsData['zh'].sort((a, b) => (groupOrder[a.Group] || 9) - (groupOrder[b.Group] || 9));
        metricsData['en'].sort((a, b) => (groupOrder[a.Group] || 9) - (groupOrder[b.Group] || 9));
        // ====================================================

        caseDataZH = await (await fetch('data/case_data_zh.json')).json();
        caseDataEN = await (await fetch('data/case_data_en.json')).json();

        renderLeaderboard();
        initRadarModels();
        initCaseStudy();
        initScrollSpy();
    } catch (e) {
        console.error("Data loading failed:", e);
    }
}

// 左侧目录跟随高亮
function initScrollSpy() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// ================= Leaderboard =================
function renderLeaderboard() {
    const lang = document.getElementById('lb-lang').value;
    const data = metricsData[lang];
    if(!data) return;
    
    let best = { A1: Infinity, A2: -Infinity, B1: -Infinity, B2: -Infinity, B3: -Infinity, C1: -Infinity, C2: -Infinity, C3: -Infinity };
    data.forEach(d => {
        for (let k in best) {
            if (d[k] !== null && d[k] !== undefined) {
                // 强制转数字进行比较，防止部分 JSON 数据是字符串
                let num = parseFloat(d[k]);
                if (!isNaN(num)) {
                    if (k === 'A1' && num < best[k]) best[k] = num;
                    if (k !== 'A1' && num > best[k]) best[k] = num;
                }
            }
        }
    });

    document.getElementById('lb-thead').innerHTML = `<tr>
        <th onclick="sortTable(0)">Model</th>
        <th onclick="sortTable(1)">A1 ↓</th><th onclick="sortTable(2)">A2 ↑</th>
        <th onclick="sortTable(3)">B1 ↑</th><th onclick="sortTable(4)">B2 ↑</th><th onclick="sortTable(5)">B3 ↑</th>
        <th onclick="sortTable(6)">C1 ↑</th><th onclick="sortTable(7)">C2 ↑</th><th onclick="sortTable(8)">C3 ↑</th>
    </tr>`;

    const tbody = document.getElementById('lb-tbody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = `bg-${row.Group}`;
        
        let modelNameHtml = row.Model;
        if (row.isNew) {
            modelNameHtml += ` <span style="background-color: #ef4444; color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; margin-left: 8px; vertical-align: middle; font-weight: bold; letter-spacing: 0.5px;">NEW</span>`;
        }
        
        let html = `<td>${modelNameHtml}</td>`;
        ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].forEach(k => {
            let val = row[k];
            if (val === null || val === undefined || val === '') {
                html += `<td>-</td>`;
            } else {
                // 强制转数字防止 toFixed 报错
                let numVal = parseFloat(val);
                let isBest = (k === 'A1' && numVal === best[k]) || (k !== 'A1' && numVal === best[k]);
                html += `<td class="${isBest ? 'bold-best' : ''}">${numVal.toFixed(2)}</td>`;
            }
        });
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

let sortAsc = {};
function sortTable(colIndex) {
    const tbody = document.getElementById('lb-tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isAsc = !sortAsc[colIndex];
    sortAsc[colIndex] = isAsc;

    rows.sort((a, b) => {
        let valA = a.children[colIndex].innerText.trim();
        let valB = b.children[colIndex].innerText.trim();
        
        if (colIndex === 0) {
            valA = valA.replace('NEW', '').trim();
            valB = valB.replace('NEW', '').trim();
            return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            // 修复 parseFloat 结果为 0 时变成 Infinity 的 bug
            let numA = parseFloat(valA);
            let numB = parseFloat(valB);
            if (isNaN(numA)) numA = (valA === '-' ? Infinity : -Infinity);
            if (isNaN(numB)) numB = (valB === '-' ? Infinity : -Infinity);
            return isAsc ? numA - numB : numB - numA;
        }
    });
    
    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(r));
}

// ================= Radar Chart =================
function initRadarModels() {
    const container = document.getElementById('radar-model-checkboxes');
    if(!metricsData['zh']) return;
    const models = metricsData['zh'].map(d => d.Model);
    
    container.innerHTML = models.map((m, i) => {
        const modelInfo = metricsData['zh'].find(d => d.Model === m);
        const isNew = modelInfo && modelInfo.isNew;
        const newBadge = isNew ? `<span style="background:#ef4444; color:white; font-size:0.6rem; padding:1px 4px; border-radius:4px; margin-left:4px;">NEW</span>` : '';
        return `
        <label class="checkbox-label" style="display:flex; align-items:center; gap:4px; cursor:pointer;">
            <input type="checkbox" value="${m}" ${i<3?'checked':''} onchange="renderRadar()">
            <span>${m}${newBadge}</span>
        </label>
        `;
    }).join('');

    radarChart = echarts.init(document.getElementById('radar-chart'));
    window.addEventListener('resize', () => radarChart.resize());
    renderRadar();
}

function toggleAllRadar() {
    const checkboxes = document.querySelectorAll('#radar-model-checkboxes input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    renderRadar();
}

function renderRadar() {
    if(!radarChart) return;
    const lang = document.getElementById('radar-lang').value;
    const data = metricsData[lang];
    const selectedModels = Array.from(document.querySelectorAll('#radar-model-checkboxes input:checked')).map(cb => cb.value);
    
    if (selectedModels.length === 0) return radarChart.clear();

    const indicators = [
        { name: 'A1', max: 10 }, { name: 'A2', max: 1.0 },
        { name: 'B1', max: 100 }, { name: 'B2', max: 100 }, { name: 'B3', max: 100 },
        { name: 'C1', max: 100 }, { name: 'C2', max: 100 }, { name: 'C3', max: 100 }
    ];

    const seriesData = [];
    selectedModels.forEach(m => {
        const row = data.find(d => d.Model === m);
        if (!row) return;
        
        // 防 NaN 报错
        let a1 = row.A1 !== null && row.A1 !== undefined ? parseFloat(row.A1) : 0;
        let a2 = row.A2 !== null && row.A2 !== undefined ? parseFloat(row.A2) : 0;
        
        let b1 = row.B1 !== null && row.B1 !== undefined ? parseFloat(row.B1) : 0;
        let b2 = row.B2 !== null && row.B2 !== undefined ? parseFloat(row.B2) : 0;
        let b3 = row.B3 !== null && row.B3 !== undefined ? parseFloat(row.B3) : 0;
        
        let c1 = row.C1 !== null && row.C1 !== undefined ? parseFloat(row.C1) : 0;
        let c2 = row.C2 !== null && row.C2 !== undefined ? parseFloat(row.C2) : 0;
        let c3 = row.C3 !== null && row.C3 !== undefined ? parseFloat(row.C3) : 0;

        let a1_inv = a1 > 0 ? 10 - a1 : 0; 
        let vals = [a1_inv, a2, b1, b2, b3, c1, c2, c3];
        
        let legendName = row.Model + (row.isNew ? ' (New)' : '');

        seriesData.push({
            value: vals,
            name: legendName, 
            areaStyle: { opacity: 0.15 },
            lineStyle: { width: 2 }
        });
    });

    radarChart.setOption({
        legend: { top: 'top', data: seriesData.map(d => d.name), textStyle: { fontFamily: 'Inter' } },
        tooltip: { trigger: 'item' },
        radar: {
            indicator: indicators,
            radius: '65%',
            axisName: { color: '#475569', fontFamily: 'Inter', fontSize: 13 },
            splitArea: { areaStyle: { color: ['rgba(248, 250, 252, 0.5)', 'rgba(241, 245, 249, 0.8)'] } },
            axisLine: { lineStyle: { color: '#cbd5e1' } },
            splitLine: { lineStyle: { color: '#cbd5e1' } }
        },
        series: [{
            name: 'Model Comparison',
            type: 'radar',
            data: seriesData,
            animationDuration: 800
        }]
    }, true);
}

// ================= Case Study =================
function initCaseStudy() {
    const lang = document.getElementById('case-lang').value;
    const data = lang === 'zh' ? caseDataZH : caseDataEN;
    const uttSel = document.getElementById('case-utt');
    if(!data) return;
    
    const firstModel = Object.keys(data)[0];
    if (!firstModel || !data[firstModel] || !Array.isArray(data[firstModel])) return;
    
    const samples = data[firstModel];
    uttSel.innerHTML = samples.map((item, index) => 
        `<option value="${item.utt}">Sample ${index + 1}</option>`
    ).join('');
    
    renderCaseStudy();
}

function renderCaseStudy() {
    const lang = document.getElementById('case-lang').value;
    const utt = document.getElementById('case-utt').value;
    const data = lang === 'zh' ? caseDataZH : caseDataEN;
    if(!data) return;
    
    const models = Object.keys(data);
    if (models.length === 0) return;
    const firstModel = models[0];
    if (!Array.isArray(data[firstModel])) return;
    
    const mainItem = data[firstModel].find(d => d.utt === utt);
    if (!mainItem) return;

    document.getElementById('cs-bg').innerText = mainItem.context_background || "";
    let charsHtml = '';
    if (mainItem.character) {
        for (let cname in mainItem.character) {
            let charInfo = mainItem.character[cname] || {};
            charsHtml += `<li><strong>${cname}</strong>: ${charInfo.text_info || ''}</li>`;
        }
    }
    document.getElementById('cs-chars').innerHTML = charsHtml;

    const turnsDiv = document.getElementById('cs-turns');
    turnsDiv.innerHTML = '';
    if (Array.isArray(mainItem.content)) {
        mainItem.content.forEach(t => {
            const tDiv = document.createElement('div');
            tDiv.className = 'turn-item';
            let speakerName = t.speaker_info ? t.speaker_info.speaker_name : 'Unknown';
            tDiv.innerHTML = `
                <div class="turn-item-header">Turn ${t.turn_num} | ${speakerName}</div>
                <div class="turn-item-text">${t.text || ''}</div>
                <div class="turn-item-context"><strong>Local Context:</strong> ${t.context || ''}</div>
            `;
            turnsDiv.appendChild(tDiv);
        });
    }

    const audio_utt = utt.replace(/^0+/, '') || '0';
    const audioGt = document.getElementById('cs-audio-gt');
    audioGt.src = `data/gt_audio/${lang}_${audio_utt}.wav`;
    audioGt.load();

    const grid = document.getElementById('models-grid');
    grid.innerHTML = '';
    
    models.forEach(model => {
        if (!Array.isArray(data[model])) return;
        const item = data[model].find(d => d.utt === utt);
        if (!item) return;

        const modelAudioSrc = `data/model_audio/${model}/${lang}_${audio_utt}.wav`;
        
        const reasoningObj = item.reasoning || {};
        const gRes = reasoningObj[`${model}_global`] || {};
        const lResObj = reasoningObj[`${model}_local`] || {};
        const lResList = Array.isArray(lResObj.utterances) ? lResObj.utterances : [];
        
        function getMajorityWinner(list, key) {
            if (!Array.isArray(list) || list.length === 0) return '-';
            let counts = { "Model": 0, "GT": 0, "Tie": 0 };
            list.forEach(u => {
                const resObj = u[key] || {};
                const w = resObj.final_winner;
                if (counts[w] !== undefined) counts[w]++;
            });
            let maxW = '-'; let maxC = -1;
            for (let w in counts) {
                if (counts[w] > maxC) { maxC = counts[w]; maxW = w; }
            }
            return maxW;
        }

        let b1 = getMajorityWinner(lResList, 'B1_Instruction_Following');
        let b2 = getMajorityWinner(lResList, 'B2_Prosody_Fluency');
        let b3 = getMajorityWinner(lResList, 'B3_Local_Expressiveness');
        
        let c1Res = gRes.C1_Interaction_Naturalness || {};
        let c2Res = gRes.C2_Global_Flow || {};
        let c3Res = gRes.C3_Scene_Immersion || {};
        
        let c1 = c1Res.final_winner || '-';
        let c2 = c2Res.final_winner || '-';
        let c3 = c3Res.final_winner || '-';

        let localReasonHtml = lResList.map(u => {
            let b1Obj = u.B1_Instruction_Following || {};
            let b2Obj = u.B2_Prosody_Fluency || {};
            let b3Obj = u.B3_Local_Expressiveness || {};
            return `
            <div class="reasoning-block">
                <strong style="color:#0f172a; display:block; margin-bottom:5px;">Turn ${u.turn_num || ''}</strong>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <div><span class="winner-tag ${getWinnerClass(b1Obj.final_winner)}" style="display:inline-block; width:auto; margin-right:5px;">B1: ${b1Obj.final_winner || '-'}</span> ${b1Obj.reasoning || '-'}</div>
                    <div><span class="winner-tag ${getWinnerClass(b2Obj.final_winner)}" style="display:inline-block; width:auto; margin-right:5px;">B2: ${b2Obj.final_winner || '-'}</span> ${b2Obj.reasoning || '-'}</div>
                    <div><span class="winner-tag ${getWinnerClass(b3Obj.final_winner)}" style="display:inline-block; width:auto; margin-right:5px;">B3: ${b3Obj.final_winner || '-'}</span> ${b3Obj.reasoning || '-'}</div>
                </div>
            </div>
            `;
        }).join('');

        let globalReasonHtml = `
            <div class="reasoning-block">
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <div><span class="winner-tag ${getWinnerClass(c1)}" style="display:inline-block; width:auto; margin-right:5px;">C1: ${c1}</span> ${c1Res.reasoning || '-'}</div>
                    <div><span class="winner-tag ${getWinnerClass(c2)}" style="display:inline-block; width:auto; margin-right:5px;">C2: ${c2}</span> ${c2Res.reasoning || '-'}</div>
                    <div><span class="winner-tag ${getWinnerClass(c3)}" style="display:inline-block; width:auto; margin-right:5px;">C3: ${c3}</span> ${c3Res.reasoning || '-'}</div>
                </div>
            </div>
        `;
        
        const card = document.createElement('div');
        card.className = 'model-card';
        card.innerHTML = `
            <div class="model-card-header">${model}</div>
            <div class="model-audio-wrapper">
                <audio src="${modelAudioSrc}" controls style="width: 100%;"></audio>
            </div>
            
            <div class="model-scores">
                <div class="score-item"><strong>C1 Inter</strong><span class="winner-tag ${getWinnerClass(c1)}">${c1}</span></div>
                <div class="score-item"><strong>C2 Flow</strong><span class="winner-tag ${getWinnerClass(c2)}">${c2}</span></div>
                <div class="score-item"><strong>C3 Immer</strong><span class="winner-tag ${getWinnerClass(c3)}">${c3}</span></div>
            </div>
            
            <details class="reasoning-details">
                <summary>Show More (Detailed Reasoning)</summary>
                <div class="details-content">
                    <h4>Global Metrics Reasoning</h4>
                    ${globalReasonHtml}
                    <h4 style="margin-top:15px;">Local Metrics Reasoning</h4>
                    ${localReasonHtml}
                </div>
            </details>
        `;
        grid.appendChild(card);
    });
}

function getWinnerClass(winner) {
    if (winner === 'Model') return 'win-model';
    if (winner === 'GT') return 'win-gt';
    return 'win-tie';
}

window.onload = loadData;
