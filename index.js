const express = require('express');
const app = express();
const cors = require('cors');
const PORT = 3000;

app.use(cors({
  origin: 'http://localhost:4000',
}));

app.get('/', (req, res) => {
  res.send('Hello from Express');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
