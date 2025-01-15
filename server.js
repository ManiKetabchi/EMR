import express from 'express';
import aggregationRoutes from './routes/aggregation.js';

const app = express();
const port = process.env.PORT || 3000; 

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Routes 
app.use('/api/aggregation', aggregationRoutes);

//Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});