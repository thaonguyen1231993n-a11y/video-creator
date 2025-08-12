const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

// --- TỰ KIỂM TRA BIẾN MÔI TRƯỜNG ---
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('!!!!!! LỖI NGHIÊM TRỌNG: Thiếu cấu hình Cloudinary.');
  process.exit(1);
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

// Endpoint để kiểm tra
app.get('/', (req, res) => {
    res.send('Backend đang hoạt động. Sẵn sàng cấp chữ ký tải lên.');
});

// --- Endpoint mới: Cấp chữ ký bảo mật ---
app.get('/api/sign-upload', (req, res) => {
    // Tạo một timestamp (tính bằng giây)
    const timestamp = Math.round((new Date).getTime()/1000);

    // Các tham số bạn muốn ký
    // eager: ra lệnh cho Cloudinary chuyển đổi sang mp4 ngay lập tức
    const params_to_sign = {
        timestamp: timestamp,
        eager: 'f_mp4,vc_h264,ac_aac' 
    };

    try {
        // Dùng API Secret để tạo chữ ký
        const signature = cloudinary.utils.api_sign_request(params_to_sign, apiSecret);
        
        // Gửi chữ ký, timestamp và api_key về cho frontend
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
