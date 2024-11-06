// API 配置
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const API_KEY = 'sk-TGgJO8ReBs08eV1UAyDGrKNxlzr79g4J2INJfDvZOtqtoG28';
const TIMEOUT_SECONDS = 15;
const MAX_RETRIES = 2;

// AI聊天窗口控制函数
function openAIChat() {
    const overlay = document.getElementById('chatOverlay');
    const chatWindow = document.getElementById('aiChatWindow');
    
    if (!overlay || !chatWindow) {
        console.error('找不到聊天窗口元素');
        return;
    }
    
    overlay.style.display = 'block';
    chatWindow.style.display = 'flex';
    
    void chatWindow.offsetWidth;
    
    overlay.classList.add('active');
    chatWindow.classList.add('active');
    
    document.body.style.overflow = 'hidden';
}

function closeAIChat() {
    const overlay = document.getElementById('chatOverlay');
    const chatWindow = document.getElementById('aiChatWindow');
    
    if (!overlay || !chatWindow) {
        console.error('找不到聊天窗口元素');
        return;
    }
    
    overlay.classList.remove('active');
    chatWindow.classList.remove('active');
    
    // 停��消息轮询
    if (window.messagePollingInterval) {
        clearInterval(window.messagePollingInterval);
    }
    
    setTimeout(() => {
        overlay.style.display = 'none';
        chatWindow.style.display = 'none';
        document.body.style.overflow = '';
        
        // 重置客服模式
        isCustomerService = false;
    }, 300);
}

// 添加超时控制
function fetchWithTimeout(url, options, timeout) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时')), timeout * 1000)
        )
    ]);
}

// 发送消息到 Moonshot AI
async function sendToMoonshot(message, retryCount = 0) {
    console.log('开始调用 API...', message);
    try {
        // 构建请求体
        const requestBody = {
            model: "moonshot-v1-8k",
            messages: [
                {
                    role: "system",
                    content: "你是一个专业的电子保函服务助手，熟悉各类电子保函的业务流程和申请要求。你可以回答用户关于电子保函的各种问题，包括但不限于：保函类型介绍、申请流程、所需材料、费用标准等。请用专业且易懂的语言回答用户问题。"
                },
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 800
        };

        console.log('发送请求数据:', requestBody);

        const response = await fetch(MOONSHOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('API 响应状态:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 错误响应:', errorText);
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        console.log('API 返回数据:', data);

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('API 返回数据格式错误');
        }

        return data.choices[0].message.content;

    } catch (error) {
        console.error('API调用详细错误:', error);

        if (error.message.includes('Failed to fetch')) {
            return '网络连接失败，请检查您的网络连接后重试。';
        }

        if (error.message.includes('API请求失败: 401')) {
            return '请确认您的网络环境正常，如果问题持续存在请联系客服：15059449408';
        }

        if (error.message.includes('API请求失败: 429')) {
            return '请求过于频繁，请稍后再。';
        }

        return '抱歉，服务暂时不可用。如需帮助，请联系客服：15059449408';
    }
}

// 添加全局变量
let isCustomerService = false; // 用于标记当前是否在客服模式

// 切换到客服服务
function switchToCustomerService() {
    isCustomerService = true;
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = ''; // 清空当前消息
    
    // 添加系统提示消息
    addMessage('已切换到人工客服服务，请稍候...', 'system');
    addMessage('您好，我是客服小美，很高兴为您服务！', 'ai');
    
    // 修改标题和输入框提示
    document.querySelector('.chat-header h5').textContent = '在线客服';
    document.getElementById('userInput').placeholder = '请输入您要咨询的问题...';
    
    // 存储对话类型
    localStorage.setItem('chatType', 'customerService');
    
    // 立即加载历史消息
    loadCustomerServiceMessages();
    
    // 开始定期检查新消息
    startMessagePolling();
}

// 添加加载客服消息的函数
function loadCustomerServiceMessages() {
    if (!isCustomerService) return;
    
    const messages = JSON.parse(localStorage.getItem('customerServiceMessages') || '[]');
    const chatMessages = document.getElementById('chatMessages');
    
    // 只显示当前用户的对话
    const userMessages = messages.filter(msg => 
        msg.sender === 'user' || (msg.sender === 'admin' && msg.to === 'user')
    );
    
    // 按时间排序
    userMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    // 显示消息
    userMessages.forEach(msg => {
        if (msg.sender === 'user') {
            addMessage(msg.content, 'user');
        } else {
            addMessage(msg.content, 'ai');
        }
    });
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加消息轮询函数
function startMessagePolling() {
    // 清除可能存在的旧定时器
    if (window.messagePollingInterval) {
        clearInterval(window.messagePollingInterval);
    }
    
    // 设置新的定时器，每3秒检查一次新消息
    window.messagePollingInterval = setInterval(() => {
        if (isCustomerService) {
            loadCustomerServiceMessages();
        }
    }, 3000);
}

// 修改发送消息函数
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (message) {
        if (isCustomerService) {
            // 客服模式
            addMessage(message, 'user');
            
            // 保存消息到 localStorage
            const messages = JSON.parse(localStorage.getItem('customerServiceMessages') || '[]');
            messages.push({
                content: message,
                sender: 'user',
                timestamp: Date.now(),
                read: false
            });
            localStorage.setItem('customerServiceMessages', JSON.stringify(messages));
            
            input.value = '';
            
            // 模拟自动回复
            setTimeout(() => {
                addMessage('消息已收到，客服会尽快回复您。', 'system');
            }, 500);
        } else {
            // AI 模式
            // 原有的 AI 对话逻辑保持不变
            addMessage(message, 'user');
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message ai-message loading';
            loadingDiv.textContent = '正在思考中，请稍候...';
            document.getElementById('chatMessages').appendChild(loadingDiv);
            
            input.value = '';
            
            try {
                const response = await sendToMoonshot(message);
                loadingDiv.remove();
                addMessage(response, 'ai');
            } catch (error) {
                console.error('消息处理错误:', error);
                loadingDiv.remove();
                addMessage('抱歉，服务出现了问题，请稍后再试。', 'ai');
            }
        }
    }
}

// 修改添加消息的函数
function addMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (sender === 'system') {
            messageDiv.className = 'message system-message';
        }
        
        if (sender === 'ai' && isCustomerService) {
            // 客服消息样式
            messageDiv.innerHTML = `
                <div class="customer-service-avatar">
                    <i class="fas fa-headset"></i>
                </div>
                <div class="message-content">${message}</div>
            `;
        } else {
            // 其他消息保持原样
            messageDiv.innerHTML = message;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 添加测试函数
async function testAPI() {
    try {
        const response = await sendToMoonshot("你好，请介绍一下电子保函");
        console.log('测试响应:', response);
        return true;
    } catch (error) {
        console.error('API测试失败:', error);
        return false;
    }
}

// 处理表单提交
function handleSubmit(event) {
    event.preventDefault();
    
    // 获取表单数据
    const userName = document.getElementById('userName').value.trim();
    const userEmail = document.getElementById('userEmail').value.trim();
    const userMessage = document.getElementById('userMessage').value.trim();
    
    // 数据验证
    if (!validateForm(userName, userEmail, userMessage)) {
        return;
    }
    
    // 获取当前时间
    const now = new Date();
    const submitTime = now.toLocaleString();
    
    // 创建留言对象
    const messageData = {
        time: submitTime,
        name: userName,
        email: userEmail,
        message: userMessage
    };
    
    // 获取现有留言数据
    let messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    
    // 添加新留���
    messages.push(messageData);
    
    // 保存到 localStorage
    localStorage.setItem('contactMessages', JSON.stringify(messages));
    
    // 清空表单
    document.getElementById('contactForm').reset();
    
    // 显示成功消息
    alert('留言提交成功！');
}

// 表单验证函数
function validateForm(name, email, message) {
    // 验证姓名（2-20个字符，只允许中文和英文）
    if (!/^[\u4e00-\u9fa5a-zA-Z]{2,20}$/.test(name)) {
        alert('请输入有效的姓名（2-20个字符，只允许中文和英文）');
        return false;
    }
    
    // 验证邮箱
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('请输入有效的邮箱地址');
        return false;
    }
    
    // 验证留言内容（不少于10个字符）
    if (message.length < 10) {
        alert('留言内容不能少于10个字符');
        return false;
    }
    
    return true;
}

// 日期格式化函数
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 添加查看留言的函数（管理员使用）
function viewMessages() {
    const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    let messageText = '';
    
    messages.forEach((msg, index) => {
        messageText += `
留言 #${index + 1}
提交时间：${msg.time}
姓名：${msg.name}
邮箱：${msg.email}
留言内容：${msg.message}
------------------------
`;
    });
    
    if (messages.length === 0) {
        messageText = '暂无留言';
    }
    
    console.log(messageText);
    return messages;
}

// 添加清除留言的函数（管理员使用）
function clearMessages() {
    localStorage.removeItem('contactMessages');
    console.log('所有留言已清除');
}

// 城市数据
const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '重庆', '苏州', '天津', '长沙', '郑州', '青岛', '厦门', '福州', '济南', '合肥', '昆明'];

// 产品名称
const products = ['工程投标保函', '合同履约保函', '工程预付款保函', '业主支付保函', '农民工工资支付保函', '���程质量保函'];

// 生成随机信息
function generateTickerItem() {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const minutes = Math.floor(Math.random() * 59) + 1;
    const product = products[Math.floor(Math.random() * products.length)];
    return `<div class="ticker-item">${city}建筑工程有限公司 <span>${minutes}</span>分钟前 申请了<span>${product}</span></div>`;
}

// 更新滚动信息
function updateTicker() {
    const tickerContent = document.getElementById('tickerContent');
    const tickerContent2 = document.getElementById('tickerContent2');
    if (tickerContent && tickerContent2) {
        let content = '';
        // 生成多条信息
        for (let i = 0; i < 5; i++) {
            content += generateTickerItem();
        }
        tickerContent.innerHTML = content;
        tickerContent2.innerHTML = content;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化视频
    const video = document.querySelector('video');
    if (video) {
        // 添加错误处理
        video.addEventListener('error', function(e) {
            console.error('视频加载错误:', e);
            console.log('错误代码:', video.error.code);
            console.log('错误信息:', video.error.message);
        });

        // 添加加载处理
        video.addEventListener('loadeddata', function() {
            console.log('视频加载成功');
            video.currentTime = 3;
        });

        // 添加播放处理
        video.addEventListener('play', function() {
            console.log('视频开始播放');
        });

        // 确保视频可以播放
        video.load();
    }
    
    // 初始化遮罩层点击事件
    const overlay = document.getElementById('chatOverlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAIChat();
            }
        });
    }
    
    // 初始化回车发送功能
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // 初始化 AOS 动画
    AOS.init();
    
    // 测试 API
    testAPI().then(success => {
        if (!success) {
            console.error('API 连接测试失败');
        }
    });
    
    // 初始化滚动信息
    updateTicker();
    // 每20秒更新一次信息
    setInterval(updateTicker, 20000);
    
    // 如果之前是在客服模式，恢复客服模式
    if (localStorage.getItem('chatType') === 'customerService') {
        switchToCustomerService();
    }
});

// 可选：添加视频播放控制函数
function playVideo() {
    const video = document.querySelector('video');
    if (video) {
        video.play().catch(function(error) {
            console.log("视频播放失败:", error);
        });
    }
}