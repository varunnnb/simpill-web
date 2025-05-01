const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('./models/user');
const Medication = require('./models/Medication');

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27018/simpill';
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';

// Set Mongoose strictQuery to suppress deprecation warning
mongoose.set('strictQuery', true);

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Serve dashboard.html for /dashboard route
app.get('/dashboard', (req, res) => {
  console.log('Serving /dashboard');
  res.sendFile(path.join(__dirname, 'dashboard.html'), (err) => {
    if (err) {
      console.error('Error serving dashboard.html:', err);
      res.status(500).send('Error loading dashboard');
    }
  });
});

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Signup request:', { email });
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    console.log('User created:', email);
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    console.error('Signup error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login request:', { email });
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
    console.log('Login successful:', email);
    res.status(200).json({ token });
  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/medications', authenticateToken, async (req, res) => {
  try {
    const { name, dosage, time, frequency } = req.body;
    console.log('Add medication request:', { name, dosage, time, frequency });
    if (!name || !dosage || !time || !frequency) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const medication = new Medication({
      userId: req.user.userId,
      name,
      dosage,
      time,
      frequency
    });
    await medication.save();
    console.log('Medication saved:', medication);
    res.status(201).json(medication);
  } catch (error) {
    console.error('Add medication error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/medications', authenticateToken, async (req, res) => {
  try {
    const medications = await Medication.find({ userId: req.user.userId });
    console.log('Fetched medications for user:', req.user.userId);
    res.status(200).json(medications);
  } catch (error) {
    console.error('Fetch medications error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/medications/:id/taken', authenticateToken, async (req, res) => {
  try {
    const medication = await Medication.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    medication.lastTaken = new Date();
    await medication.save();
    console.log('Medication marked as taken:', medication);
    res.status(200).json(medication);
  } catch (error) {
    console.error('Mark taken error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/medications/:id', authenticateToken, async (req, res) => {
  try {
    const medication = await Medication.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    console.log('Medication deleted:', medication);
    res.status(200).json({ message: 'Medication deleted' });
  } catch (error) {
    console.error('Delete medication error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});