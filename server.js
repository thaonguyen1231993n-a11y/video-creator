const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

// --- Cấu hình Cloudinary từ biến môi trường trên Render ---
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.send('Backend đang hoạt động tốt! Sẵn sàng chuyển đổi và tải video lên Cloudinary.');
});

// Hàm để tải một buffer lên Cloudinary
const uploadStream = (buffer) => {
    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            { resource_type: "video" }, // Quan trọng: chỉ định đây là file video
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        upload.end(buffer);
    });
};

app.post('/convert', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Không có file nào được tải lên.');
    }

    console.log(`[INFO] Nhận file ${ (req.file.size / (1024*1024)).toFixed(2) } MB. Bắt đầu chuyển đổi.`);
    
    const readableStream = new stream.PassThrough();
    readableStream.end(req.file.buffer);

    // Tạo một stream để hứng kết quả từ FFmpeg
    const chunks = [];
    const writableStream = new stream.Writable({
        write(chunk, encoding, callback) {
            chunks.push(chunk);
            callback();
        }
    });

    ffmpeg(readableStream)
        .videoCodec('libx264')
        .audioCodec('aac')
        .addOutputOptions([
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-movflags', 'frag_keyframe+empty_moov',
            '-threads', '1'
        ])
        .toFormat('mp4')
        .on('start', (commandLine) => {
            console.log('[FFMPEG] Đã khởi chạy với lệnh: ' + commandLine);
        })
        .on('error', (err) => {
            console.error('[ERROR] Lỗi FFmpeg:', err.message);
            if (!res.headersSent) {
                res.status(500).send('Lỗi trong quá trình chuyển đổi video.');
            }
        })
        .on('end', async () => {
            console.log('[SUCCESS] FFmpeg đã xử lý xong. Chuẩn bị tải lên Cloudinary.');
            try {
                const videoBuffer = Buffer.concat(chunks);
                const result = await uploadStream(videoBuffer);
                console.log('[SUCCESS] Đã tải lên Cloudinary thành công.');
                // Trả về URL an toàn của video trên Cloudinary
                res.json({ downloadUrl: result.secure_url });
            } catch (uploadError) {
                console.error('[ERROR] Lỗi khi tải lên Cloudinary:', uploadError.message);
                res.status(500).send('Lỗi khi lưu trữ video đã chuyển đổi.');
            }
        })
        .pipe(writableStream);
});

app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại cổng ${port}`);
});
