import express from 'express';
import dotenv from 'dotenv';
import { connectDb } from './database/db.js';
import courseRoutes from './routes/course.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import PayOS from '@payos/node';
import cors from 'cors';

dotenv.config();

export const payos = new PayOS(
  '8e2d87dd-616c-4f44-ae6b-34931597c7b7',
  '7d968734-5608-4f00-a5ff-5247c55e8d39',
  '157b118b1793fd17721fd1b4494feda58420f226760cf458e31cf7d1a603a974',
);

const app = express();

// CORS configuration
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // allowedHeaders: ['Content-Type', 'Authorization'], // Thêm header Authorization nếu bạn dùng token
  credentials: true, // Cho phép gửi cookie nếu cần
};

app.use(cors(corsOptions)); // Apply CORS configuration

app.use(express.static('public'));
app.use(express.json());

const CLIENT_DOMAIN = `${process.env.frontendurl}`;

const orderCode = Math.floor(Math.random() * 10000);
app.post('/api/create-payment-link', async (req, res) => {
  // Nhận các tham số từ request body
  const { amount, description } = req.body;

  if (!amount || !description) {
    return res.status(400).send('Amount and description are required');
  }

  // Tạo orderCode mới mỗi lần request
  const orderCode = Math.floor(Math.random() * 10000);

  const order = {
    amount: amount, // Sử dụng giá trị amount từ request body
    description: description, // Sử dụng giá trị description từ request body
    orderCode: orderCode,

    returnUrl: `${CLIENT_DOMAIN}/success`,
    cancelUrl: `${CLIENT_DOMAIN}/cancel`,
  };

  try {
    const paymentLink = await payos.createPaymentLink(order);
    res.json({ checkoutUrl: paymentLink.checkoutUrl, orderCode: orderCode });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.use('/uploads', express.static('uploads'));
app.use('/api', userRoutes);
app.use('/api', courseRoutes);
app.use('/api', adminRoutes);

app.post('/receive-hook', async (req, res) => {
  console.log(req.body);
  res.status(200).json(req.body);
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
  connectDb();
});
