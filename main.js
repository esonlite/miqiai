// main.js - Miqi AI PPT Generator (v3.0.0) - 最终修复版
let currentTaskId = null;
let currentFilename = null;
let currentContent = '';


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
        <p>版本：v3.0.0</p>
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
    currentTaskId = null;
    currentFilename = null;
    currentContent = '';
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

function getProgressIcon(status) {
    if (!status) return '⏸️';
    if (status.includes('Director')) return '🔍';
    if (status.includes('Writer')) return '✍️';
    if (status.includes('Designer')) return '🎨';
    if (status.includes('✅')) return '✅';
    if (status.includes('错误') || status.includes('失败')) return '❌';
    return '🔄';
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
async function loadMarkdownContent(filename) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/download/${filename}`);
        if (response.ok) {
            const content = await response.text();
            document.getElementById('outputPreview').textContent = content;
            currentContent = content;
            document.getElementById('copyBtn').disabled = false;
        } else {
            throw new Error('文件加载失败');
        }
    } catch (error) {
        console.warn('无法加载 Markdown 预览内容:', error);
        document.getElementById('outputPreview').textContent = 
            '✅ 生成成功！但无法加载预览内容。\n请直接下载文件使用。';
        document.getElementById('copyBtn').disabled = true;
    }
}

function onGenerateComplete(result) {
    document.getElementById('fileInfo').textContent = `📄 ${result.title || 'PPT'} 已生成`;
    document.getElementById('fileInfo').style.color = 'var(--success)';
    
    loadMarkdownContent(result.md_filename);
    currentFilename = result.md_filename;

    document.getElementById('downloadMdBtn').disabled = false;
    document.getElementById('downloadPptxBtn').disabled = !result.has_pptx;

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = false;
    generateBtn.textContent = '🎯 立即生成PPT（Miqi AI 四层智能体 + 配图 + 图表）';

    let message = `《${result.title}》已生成！\n\n`;
    if (result.has_pptx) {
        message += '✅ Markdown 文件\n✅ 精美 PPTX 文件（含配图+图表）\n\n点击【🎯 下载PPTX】使用！';
    } else {
        message += '✅ Markdown 文件已生成\n\n请下载后导入 WPS AI / Gamma 等工具转 PPT。';
    }
    showNotification('🎉 生成成功', message, 'success');
}

function onGenerateFailed(error) {
    updateProgress(`❌ 生成失败：${error}`, 0, '❌');
    document.getElementById('outputPreview').textContent = `❌ 错误：${error}`;
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = false;
    generateBtn.textContent = '🎯 立即生成PPT（Miqi AI 四层智能体 + 配图 + 图表）';
    showNotification('❌ 生成失败', error, 'error');
}

// 在 pollTaskStatus 开头加保护
async function pollTaskStatus() {
    if (!currentTaskId) {
        console.warn('轮询被阻止：currentTaskId 为空');
        return;
    }

    const interval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/task/${currentTaskId}`);
            if (response.status === 404) {
                clearInterval(interval);
                onGenerateFailed('任务已过期或服务器重启，请重新生成');
                return;
            }
            // ...其余逻辑
        } catch (error) {
            // ...
        }
    }, 800);
}

// ========== 关键：启动生成（带完整错误处理） ==========
async function startGeneration() {
    const inputElement = document.getElementById('userInput');
    const rawInput = inputElement.value;
    const input = rawInput.trim();

    // 🔒 前端强校验
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
    updateProgress('准备开始...', 0, '🔄');

    try {
        const response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: input })
        });

        // ✅ 关键：检查 HTTP 状态码
        if (!response.ok) {
            // 尝试解析错误信息
            let errorMsg = '请求失败，请稍后重试';
            try {
                const errData = await response.json();
                errorMsg = errData.error || errData.message || errorMsg;
            } catch (e) {
                // 如果无法解析 JSON，保留默认消息
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (!data.task_id) {
            throw new Error(data.error || '未知错误');
        }
        currentTaskId = data.task_id; // ✅ 确保赋值后再轮询
        pollTaskStatus();

    } catch (error) {
        // ❌ 统一错误处理
        console.warn('启动生成失败:', error.message); // 改为 warn，避免红色 error
        generateBtn.disabled = false;
        generateBtn.textContent = '🎯 立即生成PPT（Miqi AI 四层智能体 + 配图 + 图表）';
        showNotification('❌ 启动失败', error.message, 'error');
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
    document.getElementById('copyBtn').addEventListener('click', () => {
        if (currentContent) {
            navigator.clipboard.writeText(currentContent).then(() => {
                showNotification('📋 已复制', 'Markdown 内容已复制到剪贴板！');
            }).catch(() => {
                showNotification('❌ 复制失败', '请手动复制内容。');
            });
        }
    });

    // 下载 MD
    document.getElementById('downloadMdBtn').addEventListener('click', () => {
        if (currentFilename) {
            window.open(`${API_BASE_URL}/api/download/${currentFilename}`, '_blank');
        }
    });

    // 下载 PPTX
    document.getElementById('downloadPptxBtn').addEventListener('click', () => {
        if (currentFilename) {
            const pptxName = currentFilename.replace('.md', '.pptx');
            window.open(`${API_BASE_URL}/api/download/${pptxName}`, '_blank');
        }
    });

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