const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
// Render sẽ tự cung cấp cổng qua biến môi trường PORT
const port = process.env.PORT || 3000;

// --- Cấu hình thư mục cho Render ---
// Render Disk sẽ được gắn vào đường dẫn /var/data
const dataDir = process.env.RENDER_DISK_MOUNT_PATH || path.join(__dirname, 'local_data');
const uploadsDir = path.join(dataDir, 'uploads');
const convertedDir = path.join(dataDir, 'converted');
const publicDir = path.join(__dirname, 'public');

// Tự động tạo các thư mục nếu chúng chưa tồn tại
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(convertedDir)) fs.mkdirSync(convertedDir, { recursive: true });


// --- Thiết lập Multer để xử lý file tải lên ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `upload-${Date.now()}.webm`);
    }
});
const upload = multer({ storage: storage });


// --- Phục vụ các file tĩnh ---
app.use(express.static(publicDir));
// Cho phép truy cập các file đã chuyển đổi từ ổ đĩa bền vững
app.use('/converted', express.static(convertedDir));


// --- Endpoint (API) để chuyển đổi video ---
app.post('/convert', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Không có file nào được tải lên.');
    }

    const inputPath = req.file.path;
    const outputFilename = `converted-${Date.now()}.mp4`;
    const outputPath = path.join(convertedDir, outputFilename);

    console.log(`[INFO] Bắt đầu chuyển đổi: ${inputPath}`);

    ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .toFormat('mp4')
        .on('end', () => {
            console.log(`[SUCCESS] Chuyển đổi thành công: ${outputPath}`);
            fs.unlinkSync(inputPath);
            res.json({ downloadUrl: `/converted/${outputFilename}` });
        })
        .on('error', (err) => {
            console.error('[ERROR] Lỗi FFmpeg:', err.message);
            try {
                fs.unlinkSync(inputPath);
            } catch (unlinkErr) {
                console.error('[ERROR] Không thể xóa file tạm:', unlinkErr.message);
            }
            res.status(500).send('Lỗi trong quá trình chuyển đổi video.');
        })
        .save(outputPath);
});

app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại cổng ${port}`);
});
