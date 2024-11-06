// 全局变量
let currentPage = 1;
const messagesPerPage = 5;
let currentDeleteIndex = -1;
let allMessages = [];
let filteredMessages = [];
let currentChatUser = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化留言管理面板
    const messagePanel = document.getElementById('messagePanel');
    if (messagePanel) {
        loadMessages();
        updateStats();
    }

    // 初始化客服管理面板
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) {
        loadChatList();
        setInterval(() => {
            if (document.getElementById('chatPanel').style.display !== 'none') {
                loadChatList();
                if (currentChatUser) {
                    selectChat(currentChatUser);
                }
            }
        }, 3000);
    }
});

// 切换面板
function switchPanel(panel) {
    // 隐藏所有面板
    document.querySelectorAll('.content-panel').forEach(p => {
        p.style.display = 'none';
    });
    
    // 显示选中的面板
    const selectedPanel = document.getElementById(`${panel}Panel`);
    if (selectedPanel) {
        selectedPanel.style.display = 'block';
    }
    
    // 更新导航栏激活状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[onclick="switchPanel('${panel}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // 如果切换到客服面板，加载聊天列表
    if (panel === 'chat') {
        loadChatList();
    } else if (panel === 'message') {
        // 如果切换到留言面板，重新加载留言
        loadMessages();
    }
}

// 加载留言
function loadMessages() {
    allMessages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    filteredMessages = [...allMessages];
    displayMessages();
}

// 显示留言
function displayMessages() {
    const messagePanel = document.getElementById('messagePanel');
    if (!messagePanel) return;

    // 清空现有内容
    messagePanel.innerHTML = '';

    // 添加统计卡片
    const statsHtml = `
        <div class="admin-header">
            <div class="row align-items-center">
                <div class="col">
                    <h2 class="mb-0">留言管理</h2>
                </div>
                <div class="col-auto">
                    <button class="btn btn-primary" onclick="exportMessages()">
                        <i class="fas fa-download"></i> 导出留言
                    </button>
                    <button class="btn btn-danger ms-2" onclick="clearAllMessages()">
                        <i class="fas fa-trash"></i> 清空留言
                    </button>
                </div>
            </div>
        </div>
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="stats-card">
                    <i class="fas fa-comments"></i>
                    <h3>${allMessages.length}</h3>
                    <p class="mb-0">总留言数</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="stats-card">
                    <i class="fas fa-clock"></i>
                    <h3>${getTodayMessages()}</h3>
                    <p class="mb-0">今日留言</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="stats-card">
                    <i class="fas fa-envelope-open"></i>
                    <h3>${getUnreadMessages()}</h3>
                    <p class="mb-0">未读留言</p>
                </div>
            </div>
        </div>
    `;
    messagePanel.innerHTML = statsHtml;

    // 如果没有留言，显示提示信息
    if (filteredMessages.length === 0) {
        messagePanel.innerHTML += '<div class="alert alert-info">暂无留言</div>';
        return;
    }

    // 创建留言列表容器
    const messageList = document.createElement('div');
    messageList.className = 'message-list';

    // 计算分页
    const start = (currentPage - 1) * messagesPerPage;
    const end = start + messagesPerPage;
    const pageMessages = filteredMessages.slice(start, end);

    // 添加留言卡片
    pageMessages.forEach((msg, index) => {
        const messageCard = document.createElement('div');
        messageCard.className = 'message-card';
        messageCard.innerHTML = `
            <div class="message-header">
                <div>
                    <strong>${msg.name}</strong>
                    <span class="text-muted ms-2">${msg.email}</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary btn-action" onclick="viewMessage(${start + index})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="showDeleteModal(${start + index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="message-content">${msg.message}</div>
            <div class="message-footer">
                <span class="text-muted">提交时间：${msg.time}</span>
            </div>
        `;
        messageList.appendChild(messageCard);
    });

    messagePanel.appendChild(messageList);
    updatePagination();
}

// 更新分页
function updatePagination() {
    const totalPages = Math.ceil(filteredMessages.length / messagesPerPage);
    const pagination = document.createElement('nav');
    pagination.innerHTML = `
        <ul class="pagination justify-content-center">
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">上一页</a>
            </li>
            ${Array.from({length: totalPages}, (_, i) => i + 1).map(page => `
                <li class="page-item ${page === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${page})">${page}</a>
                </li>
            `).join('')}
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">下一页</a>
            </li>
        </ul>
    `;
    document.getElementById('messagePanel').appendChild(pagination);
}

// 切换页面
function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredMessages.length / messagesPerPage)) return;
    currentPage = page;
    displayMessages();
}

// 获取今日留言数
function getTodayMessages() {
    const today = new Date().toLocaleDateString();
    return allMessages.filter(msg => 
        new Date(msg.time).toLocaleDateString() === today
    ).length;
}

// 获取未读留言数
function getUnreadMessages() {
    return allMessages.filter(msg => !msg.read).length;
}

// 发送回复
function sendReply() {
    if (!currentChatUser) {
        alert('请先选择一个对话');
        return;
    }
    
    const replyInput = document.getElementById('replyMessage');
    const content = replyInput.value.trim();
    
    if (!content) return;
    
    const reply = {
        sender: 'admin',
        to: currentChatUser,
        content: content,
        timestamp: Date.now(),
        read: false
    };
    
    const messages = JSON.parse(localStorage.getItem('customerServiceMessages') || '[]');
    messages.push(reply);
    localStorage.setItem('customerServiceMessages', JSON.stringify(messages));
    
    replyInput.value = '';
    selectChat(currentChatUser);
}

// 更新未读消息数
function updateUnreadCount() {
    const messages = JSON.parse(localStorage.getItem('customerServiceMessages') || '[]');
    const unreadCount = messages.filter(msg => !msg.read && msg.sender !== 'admin').length;
    document.getElementById('unreadChat').textContent = unreadCount || '';
}

// 查看留言详情
function viewMessage(index) {
    const msg = filteredMessages[index];
    if (!msg.read) {
        msg.read = true;
        localStorage.setItem('contactMessages', JSON.stringify(allMessages));
        updateStats();
    }

    const detailHtml = `
        <div class="p-3">
            <h5>留言人信息</h5>
            <p><strong>姓名：</strong>${msg.name}</p>
            <p><strong>邮箱：</strong>${msg.email}</p>
            <p><strong>提交时间：</strong>${msg.time}</p>
            <hr>
            <h5>留言内容</h5>
            <p>${msg.message}</p>
        </div>
    `;
    document.getElementById('messageDetail').innerHTML = detailHtml;
    new bootstrap.Modal(document.getElementById('viewModal')).show();
}

// 导出留言
function exportMessages() {
    if (allMessages.length === 0) {
        alert('暂无留言可导出');
        return;
    }

    let csvContent = '提交时间,姓名,邮箱,留言内容\n';
    allMessages.forEach(msg => {
        csvContent += `${msg.time},"${msg.name}","${msg.email}","${msg.message}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `留言记录_${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 清空所有留言
function clearAllMessages() {
    if (confirm('确定要清空所有留言吗？此操作不可撤销！')) {
        localStorage.removeItem('contactMessages');
        allMessages = [];
        filteredMessages = [];
        displayMessages();
    }
}

// 选择聊天
function selectChat(user) {
    currentChatUser = user;
    document.getElementById('currentChatUser').textContent = user;
    
    const messages = JSON.parse(localStorage.getItem('customerServiceMessages') || '[]')
        .filter(msg => msg.sender === user || (msg.sender === 'admin' && msg.to === user));
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    
    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `chat-message ${msg.sender === 'admin' ? 'admin' : 'user'}`;
        div.innerHTML = `
            <div class="chat-message-content">${msg.content}</div>
            <div class="chat-message-time">${new Date(msg.timestamp).toLocaleString()}</div>
        `;
        chatMessages.appendChild(div);
        
        // 标记消息为已读
        if (!msg.read && msg.sender === user) {
            msg.read = true;
            const allMessages = JSON.parse(localStorage.getItem('customerServiceMessages') || '[]');
            const index = allMessages.findIndex(m => 
                m.timestamp === msg.timestamp && m.sender === msg.sender
            );
            if (index !== -1) {
                allMessages[index].read = true;
                localStorage.setItem('customerServiceMessages', JSON.stringify(allMessages));
            }
        }
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    loadChatList();
}

// 加载聊天列表
function loadChatList() {
    const messages = JSON.parse(localStorage.getItem('customerServiceMessages') || '[]');
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';
    
    // 按用户分组消息
    const userMessages = {};
    messages.forEach(msg => {
        if (!userMessages[msg.sender]) {
            userMessages[msg.sender] = [];
        }
        userMessages[msg.sender].push(msg);
    });
    
    // 创建对话列表项
    Object.entries(userMessages).forEach(([user, msgs]) => {
        if (user !== 'admin') {  // 不显示管理员消息
            const lastMsg = msgs[msgs.length - 1];
            const unreadCount = msgs.filter(m => !m.read && m.sender === user).length;
            
            const div = document.createElement('div');
            div.className = `chat-item ${unreadCount > 0 ? 'unread' : ''} ${user === currentChatUser ? 'active' : ''}`;
            div.onclick = () => selectChat(user);
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <strong>${user}</strong>
                    ${unreadCount > 0 ? `<span class="badge bg-danger">${unreadCount}</span>` : ''}
                </div>
                <small class="text-muted">${new Date(lastMsg.timestamp).toLocaleString()}</small>
                <p class="mb-0 text-truncate">${lastMsg.content}</p>
            `;
            chatList.appendChild(div);
        }
    });
    
    updateUnreadCount();
}

// 更新未读消息数
function updateUnreadCount() {
    const messages = JSON.parse(localStorage.getItem('customerServiceMessages') || '[]');
    const unreadCount = messages.filter(msg => !msg.read && msg.sender !== 'admin').length;
    document.getElementById('unreadChat').textContent = unreadCount || '';
}

// 其他原有的留言管理相关函数保持不变 ... 