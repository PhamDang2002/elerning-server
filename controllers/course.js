import TryCatch from '../middlewares/TryCatch.js';
import { Courses } from '../models/Courses.js';
import { Lecture } from '../models/Lecture.js';
import { User } from '../models/User.js';
import crypto from 'crypto';
import { Payment } from '../models/Payment.js';
import { Progress } from '../models/Progress.js';

export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find();
  res.json({
    courses,
  });
});

export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  res.json({
    course,
  });
});

export const fetchLectures = TryCatch(async (req, res) => {
  const lectures = await Lecture.find({ course: req.params.id });

  const user = await User.findById(req.user._id);

  if (user.role === 'admin') {
    return res.json({ lectures });
  }

  if (!user.subscription.includes(req.params.id))
    return res.status(400).json({
      message: 'You have not subscribed to this course',
    });

  res.json({ lectures });
});

export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  const user = await User.findById(req.user._id);

  if (user.role === 'admin') {
    return res.json({ lecture });
  }

  if (!user.subscription.includes(lecture.course))
    return res.status(400).json({
      message: 'You have not subscribed to this course',
    });

  res.json({ lecture });
});

export const getMyCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find({ _id: req.user.subscription });

  res.json({
    courses,
  });
});

export const checkout = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);

  const course = await Courses.findById(req.params.id);

  if (user.subscription.includes(course._id)) {
    return res.status(400).json({
      message: 'You already have this course',
    });
  }

  const options = {
    amount: Number(course.price * 100),
    currency: 'INR',
  };

  const order = await instance.orders.create(options);

  res.status(201).json({
    order,
    course,
  });
});

export const paymentVerification = TryCatch(async (req, res) => {
  const courseId = req.params.id;

  // Tìm course và user
  const course = await Courses.findById(courseId);
  const user = await User.findById(req.user._id);

  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }

  if (user.subscription.includes(course._id)) {
    return res.status(400).json({
      message: 'You already have this course',
    });
  }

  // Thêm khoá học vào danh sách đã đăng ký
  user.subscription.push(course._id);

  // Tạo progress rỗng
  await Progress.create({
    course: course._id,
    completedLectures: [],
    user: req.user._id,
  });

  await user.save();

  res.status(200).json({
    message: 'Course Verified and Added Successfully',
  });
});

export const addProgress = TryCatch(async (req, res) => {
  const { course, lectureId } = req.query;

  // Find the user's progress for the course
  let progress = await Progress.findOne({
    user: req.user._id,
    course: course,
  });

  if (!progress) {
    // If no progress found, create a new progress record
    progress = await Progress.create({
      user: req.user._id,
      course: course,
      completedLectures: [],
    });
  }

  // Check if the lecture has already been completed
  if (progress.completedLectures.includes(lectureId)) {
    return res.json({
      message: 'Progress recorded',
    });
  }

  // Add the current lecture to completedLectures
  progress.completedLectures.push(lectureId);

  await progress.save();

  res.status(201).json({
    message: 'New Progress added',
  });
});

export const getYourProgress = TryCatch(async (req, res) => {
  const progress = await Progress.find({
    user: req.user._id,
    course: req.query.course,
  });

  if (!progress) return res.status(404).json({ message: 'null' });

  const allLectures = (await Lecture.find({ course: req.query.course })).length;

  const completedLectures = progress[0].completedLectures.length;

  const courseProgressPercentage = (completedLectures * 100) / allLectures;

  res.json({
    courseProgressPercentage,
    completedLectures,
    allLectures,
    progress,
  });
});
