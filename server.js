const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

// --- PHIÊN BẢN GỠ LỖI ---
// Tạm thời vô hiệu hóa việc dừng ứng dụng để kiểm tra log
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// if (!cloudName || !apiKey || !apiSecret) {
//   console.error('!!!!!! LỖI NGHIÊM TRỌNG: Thiếu cấu hình Cloudinary.');
//   process.exit(1);
// }

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

// Endpoint để kiểm tra và ghi log
app.get('/', (req, res) => {
    console.log('--- KIỂM TRA BIẾN MÔI TRƯỜNG ---');
    console.log(`CLOUDINARY_CLOUD_NAME: ${cloudName ? 'OK' : '!!! THIẾU !!!'}`);
    console.log(`CLOUDINARY_API_KEY: ${apiKey ? 'OK' : '!!! THIẾU !!!'}`);
    console.log(`CLOUDINARY_API_SECRET: ${apiSecret ? 'OK' : '!!! THIẾU !!!'}`);
    console.log('------------------------------------');
    res.send('Backend đang hoạt động. Vui lòng kiểm tra tab "Logs" trên Render để xem trạng thái cấu hình.');
});

// --- Endpoint mới: Cấp chữ ký bảo mật ---
app.get('/api/sign-upload', (req, res) => {
    if (!cloudName || !apiKey || !apiSecret) {
        return res.status(500).json({ error: "Lỗi cấu hình máy chủ: Thiếu thông tin Cloudinary." });
    }

    const timestamp = Math.round((new Date).getTime()/1000);
    const params_to_sign = {
        timestamp: timestamp,
        eager: 'f_mp4,vc_h264,ac_aac'
    };

    try {
        const signature = cloudinary.utils.api_sign_request(params_to_sign, apiSecret);
        res.json({
            signature: signature,
            timestamp: timestamp,
            api_key: apiKey
        });
    } catch (error) {
        console.error("Lỗi khi tạo chữ ký:", error);
        res.status(500).json({ error: "Không thể tạo chữ ký tải lên." });
    }
});


app.listen(port, () => {
    console.log(`Máy chủ cấp chữ ký đang chạy tại cổng ${port}`);
});
