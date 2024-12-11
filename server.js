const express = require('express');
const app = express();
const port = process.env.port || 3000;

const aggregationRoutes = require('./routes/aggregation');

app.use(express.json());

app.use('/api/aggregation', aggregationRoutes);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
