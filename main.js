// main.js - Miqi AI PPT Generator (v3.1) - 无状态同步版（适配 Railway）
let currentMarkdown = '';
let currentTitle = '';

// ========== 工具函数 ==========
function showNotification(title, message, type = 'info') {
    alert(`${title}\n\n${message}`);
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function showAbout() {
    document.getElementById('modalBody').innerHTML = `
        <h3>关于 Miqi AI</h3>
        <p>💡 一句话生成顶级PPT | 完全免费 | 四层AI智能体</p>
        <p>版本：v3.1（无状态同步版）</p>
        <p>技术栈：Flask + JavaScript + python-pptx + AI Agents</p>
        <p>开发者：乔麦</p>
    `;
    document.getElementById('modal').style.display = 'block';
}

function showHelp() {
    document.getElementById('modalBody').innerHTML = `
        <h3>使用帮助</h3>
        <ul>
            <li>在输入框中描述你的PPT需求（越详细越好）</li>
            <li>点击【立即生成PPT】开始生成</li>
            <li>生成完成后可预览、复制或下载</li>
            <li>MD 文件可用 WPS AI / Gamma / MindShow 等工具转 PPT</li>
            <li>PPTX 文件已包含配图建议和图表占位符</li>
        </ul>
    `;
    document.getElementById('modal').style.display = 'block';
}

function clearAll() {
    document.getElementById('userInput').value = '';
    document.getElementById('outputPreview').textContent = '等待生成...';
    document.getElementById('fileInfo').textContent = '未生成';
    document.getElementById('fileInfo').style.color = '';
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('downloadMdBtn').disabled = true;
    document.getElementById('downloadPptxBtn').disabled = true;
    resetProgress();
    currentMarkdown = '';
    currentTitle = '';
}

function resetProgress() {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    const percent = document.getElementById('progressPercent');
    const icon = document.getElementById('progressIcon');
    fill.style.width = '0%';
    text.textContent = '等待输入...';
    percent.textContent = '0%';
    icon.textContent = '⏸️';
}

function updateProgress(status, progress, icon) {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    const percent = document.getElementById('progressPercent');
    const iconEl = document.getElementById('progressIcon');

    fill.style.width = `${Math.min(progress, 100)}%`;
    text.textContent = status || '处理中...';
    percent.textContent = `${Math.min(progress, 100)}%`;
    iconEl.textContent = icon;
}

// ========== 核心逻辑 ==========
async function startGeneration() {
    const inputElement = document.getElementById('userInput');
    const rawInput = inputElement.value;
    const input = rawInput.trim();

    if (input.length === 0) {
        showNotification('⚠️ 输入为空', '请输入你的PPT需求描述！');
        inputElement.focus();
        return;
    }
    if (input.length < 5) {
        showNotification('⚠️ 输入太短', '请至少输入 5 个字，例如：“做一个AI介绍PPT”');
        inputElement.focus();
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = '🔄 生成中...';

    resetProgress();
    updateProgress('🔍 Director 正在分析需求...', 10, '🔍');

    try {
        // 第一步：获取 Markdown 内容
        const mdResponse = await fetch(`${API_BASE_URL}/api/generate/markdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: input })
        });

        if (!mdResponse.ok) {
            let errorMsg = '生成失败，请稍后重试';
            try {
                const errData = await mdResponse.json();
                errorMsg = errData.error || errData.message || errorMsg;
            } catch (e) { /* ignore */ }
            throw new Error(errorMsg);
        }

        const { markdown, title } = await mdResponse.json();
        currentMarkdown = markdown;
        currentTitle = title;

        // 更新 UI
        document.getElementById('outputPreview').textContent = markdown;
        document.getElementById('fileInfo').textContent = `📄 ${title || 'PPT'} 已生成`;
        document.getElementById('fileInfo').style.color = 'var(--success)';
        document.getElementById('copyBtn').disabled = false;
        document.getElementById('downloadMdBtn').disabled = false;
        document.getElementById('downloadPptxBtn').disabled = false;

        updateProgress('✅ 生成完成', 100, '✅');

        // 提示成功
        showNotification('🎉 生成成功', `《${title}》已生成！\n\n✅ Markdown 可复制/下载\n✅ 点击【🎯 下载PPTX】获取精美演示文稿`);

    } catch (error) {
        console.warn('生成失败:', error.message);
        updateProgress(`❌ 生成失败：${error.message}`, 0, '❌');
        document.getElementById('outputPreview').textContent = `❌ 错误：${error.message}`;
        showNotification('❌ 生成失败', error.message, 'error');
    } finally {
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = false;
        generateBtn.textContent = '🎯 立即生成PPT（Miqi AI 四层智能体 + 配图 + 图表）';
    }
}

// 复制 Markdown
function copyMarkdown() {
    if (currentMarkdown) {
        navigator.clipboard.writeText(currentMarkdown).then(() => {
            showNotification('📋 已复制', 'Markdown 内容已复制到剪贴板！');
        }).catch(() => {
            showNotification('❌ 复制失败', '请手动复制内容。');
        });
    }
}

// 下载 .md 文件（纯前端生成）
function downloadMarkdown() {
    if (!currentMarkdown) return;
    const safeTitle = (currentTitle || 'presentation').replace(/[<>:"/\\|?*]/g, '_');
    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ✅ 关键修改：PPTX 下载基于已生成的 Markdown（不再传 prompt）
async function downloadPptx() {
    if (!currentMarkdown || !currentTitle) {
        showNotification('⚠️ 无法下载', '请先生成内容');
        return;
    }

    try {
        // 调用新的 PPTX 接口，传入 markdown 和 title
        const response = await fetch(`${API_BASE_URL}/api/generate/pptx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown: currentMarkdown,
                title: currentTitle
            })
        });

        if (response.ok && response.headers.get('content-type')?.includes('presentation')) {
            const blob = await response.blob();
            const safeTitle = currentTitle.replace(/[<>:"/\\|?*]/g, '_');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeTitle}.pptx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            let errorMsg = 'PPTX 生成失败';
            try {
                const err = await response.json();
                errorMsg = err.error || errorMsg;
            } catch (e) { /* ignore */ }
            showNotification('❌ 下载失败', errorMsg);
        }
    } catch (error) {
        console.error('PPTX 下载错误:', error);
        showNotification('❌ 网络错误', '请检查网络或稍后重试');
    }
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', () => {
    // 快速模板
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('userInput').value = btn.dataset.template;
        });
    });

    // 主按钮
    document.getElementById('generateBtn').addEventListener('click', startGeneration);

    // 复制
    document.getElementById('copyBtn').addEventListener('click', copyMarkdown);

    // 下载 MD
    document.getElementById('downloadMdBtn').addEventListener('click', downloadMarkdown);

    // 下载 PPTX
    document.getElementById('downloadPptxBtn').addEventListener('click', downloadPptx);

    // 服务状态检测
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    fetch(`${API_BASE_URL}/health`)
        .then(() => {
            statusDot.style.backgroundColor = '#4caf50';
            statusText.textContent = '服务正常';
        })
        .catch(() => {
            statusDot.style.backgroundColor = '#f44336';
            statusText.textContent = '服务异常';
        });
});