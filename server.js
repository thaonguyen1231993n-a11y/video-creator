const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');

const app = express();
const port = process.env.PORT || 3000;

// --- Cấu hình Multer để lưu file vào bộ nhớ (RAM) ---
// Thay vì diskStorage, chúng ta dùng memoryStorage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Phục vụ các file tĩnh từ thư mục /public
app.use(express.static('public'));

// --- Endpoint (API) để chuyển đổi video ---
app.post('/convert', upload.single('video'), (req, res) => {
    // Kiểm tra xem có file nào được tải lên trong bộ nhớ không
    if (!req.file) {
        return res.status(400).send('Không có file nào được tải lên.');
    }

    console.log(`[INFO] Nhận được file trong bộ nhớ, kích thước: ${(req.file.size / 1024).toFixed(2)} KB. Bắt đầu chuyển đổi.`);

    // Tạo một stream có thể đọc được từ buffer trong bộ nhớ
    const readableStream = new stream.PassThrough();
    readableStream.end(req.file.buffer);

    // Thiết lập header để trình duyệt hiểu đây là một file tải về
    const outputFilename = `converted-${Date.now()}.mp4`;
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Dùng FFmpeg để đọc từ stream và ghi kết quả trực tiếp vào stream phản hồi (res)
    ffmpeg(readableStream)
        .videoCodec('libx264')
        .audioCodec('aac')
        .toFormat('mp4')
        .on('start', (commandLine) => {
            console.log('[FFMPEG] Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', (err, stdout, stderr) => {
            console.error('[ERROR] Lỗi FFmpeg:', err.message);
            console.error('[FFMPEG stdout]:', stdout);
            console.error('[FFMPEG stderr]:', stderr);
            // Nếu có lỗi, không gửi thêm dữ liệu
            if (!res.headersSent) {
                res.status(500).send('Lỗi trong quá trình chuyển đổi video.');
            }
        })
        .on('end', () => {
            console.log('[SUCCESS] Chuyển đổi và stream thành công.');
            // Stream sẽ tự kết thúc, không cần res.end() ở đây
        })
        // Pipe the output of ffmpeg directly to the response stream
        .pipe(res, { end: true });
});

app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại cổng ${port}`);
});
