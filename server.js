const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());

// 确保目录存在
const infoDir = path.join(__dirname, 'info');
if (!fs.existsSync(infoDir)) {
    fs.mkdirSync(infoDir);
}

// 处理留言提交
app.post('/api/submit-message', (req, res) => {
    const { userName, userEmail, userMessage } = req.body;
    const now = new Date();
    const fileName = `${formatDate(now)}_${userName}.txt`;
    const filePath = path.join(infoDir, fileName);

    const content = `提交时间：${now.toLocaleString()}
姓名：${userName}
邮箱：${userEmail}
留言内容：${userMessage}
`;

    fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
            console.error('保存文件失败:', err);
            res.status(500).json({ error: '保存失败' });
            return;
        }
        res.json({ success: true });
    });
});

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 