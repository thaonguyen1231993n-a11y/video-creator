const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

// --- TỰ KIỂM TRA BIẾN MÔI TRƯỜNG ---
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('!!!!!! LỖI NGHIÊM TRỌNG: Thiếu một hoặc nhiều biến môi trường của Cloudinary.');
  console.error('Vui lòng kiểm tra lại các biến CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, và CLOUDINARY_API_SECRET trong tab Environment trên Render.');
  process.exit(1); // Dừng ứng dụng nếu thiếu cấu hình
}

// Cấu hình Cloudinary
cloudinary.config({ 
  cloud_name: cloudName, 
  api_key: apiKey, 
  api_secret: apiSecret,
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
            { resource_type: "video" },
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
            '-threads', '1',
            // ** NÂNG CẤP: Giảm chất lượng để tiết kiệm bộ nhớ **
            // Constant Rate Factor: 28 là mức chất lượng tốt cho web, giá trị càng cao, chất lượng càng thấp
            '-crf', '28', 
            // Giới hạn bitrate âm thanh để giảm dung lượng
            '-b:a', '128k'
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
```

### ## Các bước tiếp theo

1.  **Cập nhật `server.js`:** Sao chép mã nguồn mới ở trên và ghi đè lên file `server.js` trong dự án của bạn.
2.  **Đẩy lên GitHub:** Lưu lại thay đổi và đẩy file `server.js` mới lên kho chứa GitHub.
    ```bash
    git add server.js
    git commit -m "Optimize Ffmpeg memory usage for mobile uploads"
    git push origin main
    ```
3.  **Chờ Render triển khai lại** và thử lại trên cả máy tính và điện thoại.

Lần này, quá trình chuyển đổi sẽ ổn định hơn rất nhiều, ngay cả với các file lớn từ điện tho
