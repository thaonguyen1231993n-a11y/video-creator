const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

// --- KIỂM TRA BIẾN MÔI TRƯỜNG ---
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('!!!!!! LỖI NGHIÊM TRỌNG: Thiếu cấu hình Cloudinary.');
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

// Endpoint để kiểm tra
app.get('/', (req, res) => {
    res.send('Backend đang hoạt động. Sẵn sàng cấp chữ ký tải lên.');
});

// --- Endpoint cấp chữ ký bảo mật ---
app.get('/api/sign-upload', (req, res) => {
    const timestamp = Math.round((new Date).getTime()/1000);

    // Ký vào tất cả các tham số sẽ được gửi từ frontend (trừ file và api_key)
    const params_to_sign = {
        timestamp: timestamp,
        eager: 'f_mp4,vc_h264,ac_aac'
    };

    try {
        // Dùng API Secret để tạo chữ ký
        const signature = cloudinary.utils.api_sign_request(params_to_sign, apiSecret);
        
        // Gửi các thông tin cần thiết về cho frontend
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
