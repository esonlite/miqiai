// Miqi AI Web 前端（连接远程API）

let currentTaskId = null;
let currentFilename = null;
let currentContent = null;

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    if (generateBtn) generateBtn.addEventListener('click', generatePPT);
    if (copyBtn) copyBtn.addEventListener('click', copyContent);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadFile);
    
    // 快速模板
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('userInput').value = this.dataset.template;
        });
    });
    
    // 检查后端状态
    checkBackendStatus();
});

// 检查后端状态
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        const data = await response.json();
        
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        if (data.ready) {
            statusDot.className = 'status-dot ready';
            statusText.textContent = '引擎就绪';
        } else {
            statusDot.className = 'status-dot not-ready';
            statusText.textContent = '需要配置';
        }
    } catch (error) {
        console.error('无法连接到后端:', error);
        document.getElementById('statusDot').className = 'status-dot not-ready';
        document.getElementById('statusText').textContent = '后端离线';
        showNotification('错误', '无法连接到后端服务器，请稍后再试', 'error');
    }
}

// 生成 PPT
async function generatePPT() {
    const userInput = document.getElementById('userInput').value.trim();
    
    if (!userInput) {
        showNotification('提示', '请先输入 PPT 需求！', 'warning');
        return;
    }
    
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ 正在生成中...';
    
    updateProgress('准备开始...', 0, '⏸️');
    document.getElementById('outputPreview').textContent = '✨ Miqi AI 四层智能体正在工作...\n';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input: userInput })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '生成失败');
        }
        
        const data = await response.json();
        currentTaskId = data.task_id;
        
        pollTaskStatus();
        
    } catch (error) {
        showNotification('错误', `生成失败: ${error.message}`, 'error');
        generateBtn.disabled = false;
        generateBtn.textContent = '🎯 立即生成PPT（Miqi AI 四层智能体）';
    }
}

// 轮询任务状态
async function pollTaskStatus() {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/task/${currentTaskId}`);
            const data = await response.json();
            
            updateProgress(data.message, data.progress, getProgressIcon(data.message));
            
            if (data.status === 'completed') {
                clearInterval(interval);
                onGenerateComplete(data.result);
            } else if (data.status === 'failed') {
                clearInterval(interval);
                onGenerateFailed(data.error);
            }
            
        } catch (error) {
            clearInterval(interval);
            console.error('轮询失败:', error);
        }
    }, 500);
}

// 生成完成
function onGenerateComplete(result) {
    currentContent = result.content;
    currentFilename = result.filename;
    
    document.getElementById('outputPreview').textContent = result.content;
    document.getElementById('fileInfo').textContent = `📄 ${result.filename} (${result.size} 字节)`;
    document.getElementById('fileInfo').style.color = 'var(--success)';
    
    document.getElementById('copyBtn').disabled = false;
    document.getElementById('downloadBtn').disabled = false;
    
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = false;
    generateBtn.textContent = '🎯 立即生成PPT（Miqi AI 四层智能体）';
    
     let message = `《${result.title}》已生成！\n\n`;
    
    if (result.has_pptx) {
        message += '✅ Markdown 文件\n';
        message += '✅ 精美 PPTX 文件\n';
        message += '   └─ 🖼️ 自动配图（Unsplash）\n';
        message += '   └─ 📊 智能图表（Matplotlib）\n';
        message += '   └─ 🎨 专业排版\n\n';
        message += '点击【🎯 下载PPTX】按钮直接使用！';
    }
    
    showNotification('🎉 生成成功', message, 'success');
}

// 生成失败
function onGenerateFailed(error) {
    showNotification('错误', `生成失败: ${error}`, 'error');
    
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = false;
    generateBtn.textContent = '🎯 立即生成PPT（Miqi AI 四层智能体）';
}

// 更新进度
function updateProgress(message, progress, icon = '⏸️') {
    document.getElementById('progressText').textContent = message;
    document.getElementById('progressPercent').textContent = `${Math.round(progress)}%`;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressIcon').textContent = icon;
}

// 获取进度图标
function getProgressIcon(message) {
    if (message.includes('分析')) return '🔍';
    if (message.includes('创作')) return '📝';
    if (message.includes('美化')) return '🎨';
    if (message.includes('保存')) return '💾';
    if (message.includes('完成')) return '✅';
    if (message.includes('失败')) return '❌';
    return '⏸️';
}

// 复制内容
function copyContent() {
    if (!currentContent) {
        showNotification('提示', '没有可复制的内容', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(currentContent).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        
        btn.textContent = '✅ 已复制';
        btn.style.background = 'var(--success)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1500);
        
        showNotification('成功', '✅ 内容已复制！可粘贴到 WPS AI', 'success');
    }).catch(err => {
        showNotification('错误', '复制失败，请手动复制', 'error');
    });
}

// 下载文件
function downloadFile() {
    if (!currentContent || !currentFilename) return;
    
    const blob = new Blob([currentContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFilename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// 清空
function clearAll() {
    if (!confirm('确定清空所有内容吗？')) return;
    
    document.getElementById('userInput').value = '';
    document.getElementById('outputPreview').textContent = '等待生成...';
    document.getElementById('fileInfo').textContent = '未生成文件';
    document.getElementById('fileInfo').style.color = '';
    
    updateProgress('已清空', 0, '⏸️');
    
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    
    currentTaskId = null;
    currentFilename = null;
    currentContent = null;
}

// 显示关于
function showAbout() {
    const content = `
        <div style="text-align: center;">
            <h2 style="color: var(--primary); margin-bottom: 10px;">Miqi AI</h2>
            <p style="color: var(--text-secondary); margin-bottom: 15px;">版本 2.2.0</p>
            <p style="margin-bottom: 15px;">一句话生成顶级PPT</p>
            <p style="color: var(--text-secondary); font-size: 14px;">完全免费 | 四层AI智能体</p>
            
            <div style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #FD79A8 0%, #F093FB 100%); border-radius: 8px;">
                <p style="color: white; font-size: 16px; font-weight: bold;">💝 蕊蕊是乔麦的小宝贝</p>
            </div>
            
            <div style="text-align: left; margin-top: 20px;">
                <p>✅ 完全免费使用</p>
                <p>✅ 超越付费工具</p>
                <p>✅ 数据安全可靠</p>
                <p>✅ 开源可定制</p>
            </div>
        </div>
    `;
    
    showModal(content);
}

// 显示帮助
function showHelp() {
    const content = `
        <h2 style="color: var(--primary); margin-bottom: 20px;">✨ Miqi AI 使用指南</h2>
        
        <h3>🚀 快速开始</h3>
        <ol>
            <li>在输入框描述 PPT 需求</li>
            <li>点击【🎯 立即生成PPT】</li>
            <li>等待 10-30 秒</li>
            <li>点击【📋 复制】粘贴到 WPS AI</li>
        </ol>
        
        <h3>💡 示例需求</h3>
        <p>✅ 做一个介绍AI的PPT，给大学生看，15页</p>
        <p>✅ 做公司年终总结，专业风格，包含数据</p>
        <p>✅ 创业融资路演PPT，12页</p>
        
        <h3>🎨 转换为PPT</h3>
        <p>推荐工具：</p>
        <ul>
            <li>WPS AI（国内最佳）</li>
            <li>Plus AI（Google Slides插件）</li>
            <li>Gamma（在线免费）</li>
        </ul>
        
        <h3>💝 开发者</h3>
        <p style="color: var(--accent); font-weight: bold;">蕊蕊是乔麦的小宝贝</p>
    `;
    
    showModal(content);
}

// 显示模态框
function showModal(content) {
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modal').style.display = 'block';
}

// 关闭模态框
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// 点击外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// 通知
function showNotification(title, message, type = 'info') {
    alert(`${title}\n\n${message}`);
}

