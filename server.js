const express = require('express');
const multer = require('multer');
const ffmpeg = 'fluent-ffmpeg'; // This will be required conditionally
const stream = require('stream');
const cors = require('cors'); // Thêm thư viện cors

const app = express();
const port = process.env.PORT || 3000;

// --- Kích hoạt CORS ---
// Cho phép các yêu cầu từ bất kỳ nguồn nào. An toàn cho trường hợp này.
app.use(cors());

// Cấu hình Multer để lưu file vào bộ nhớ (RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Phục vụ các file tĩnh từ thư mục /public
app.use(express.static('public'));

// Endpoint để kiểm tra backend có hoạt động không
app.get('/', (req, res) => {
    res.send('Backend đang hoạt động tốt!');
});

// Endpoint để chuyển đổi video
app.post('/convert', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Không có file nào được tải lên.');
    }

    console.log(`[INFO] Nhận được file trong bộ nhớ, kích thước: ${(req.file.size / (1024*1024)).toFixed(2)} MB. Bắt đầu chuyển đổi.`);

    try {
        const ffmpegInstance = require(ffmpeg);
        const readableStream = new stream.PassThrough();
        readableStream.end(req.file.buffer);

        const outputFilename = `converted-${Date.now()}.mp4`;
        res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
        res.setHeader('Content-Type', 'video/mp4');

        ffmpegInstance(readableStream)
            .videoCodec('libx264')
            .audioCodec('aac')
            .toFormat('mp4')
            .on('start', (commandLine) => {
                console.log('[FFMPEG] Đã khởi chạy với lệnh: ' + commandLine);
            })
            .on('error', (err, stdout, stderr) => {
                console.error('[ERROR] Lỗi FFmpeg:', err.message);
                console.error('[FFMPEG stdout]:', stdout);
                console.error('[FFMPEG stderr]:', stderr);
                if (!res.headersSent) {
                    res.status(500).send('Lỗi trong quá trình chuyển đổi video.');
                }
            })
            .on('end', () => {
                console.log('[SUCCESS] Chuyển đổi và stream thành công.');
            })
            .pipe(res, { end: true });

    } catch (error) {
         console.error('[FATAL] Không thể tải thư viện fluent-ffmpeg. Đảm bảo FFmpeg đã được cài đặt trong môi trường.', error);
         res.status(500).send('Lỗi máy chủ: Không thể khởi tạo bộ chuyển đổi.');
    }
});

app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại cổng ${port}`);
});
