import express from 'express'
import path from 'path';
const __dirname = path.resolve();
import 'dotenv/config';
import  cors from 'cors';
import postRouter from './api/routes/posts.mjs';



const app = express();
app.use(express.json());
app.use(cors());




app.use(express.static(path.join(__dirname, './frontend/build')))


app.use('/api', postRouter);




const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`posting app listening on ${PORT} `)
})