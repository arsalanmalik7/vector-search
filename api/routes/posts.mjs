import express from 'express'
import { client } from './../../mongodb.mjs'
import { ObjectId } from 'mongodb';
import { customAlphabet } from 'nanoid';
import pineconeClient, { openai as openaiClient } from '../../pinecone.mjs';


const db = client.db('cruddb');
const col = db.collection("posts");
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)


const pcIndex = pineconeClient.index(process.env.PINECONE_INDEX_NAME);
console.log("process.env.PINECONE_INDEX_NAME: ", process.env.PINECONE_INDEX_NAME);

let router = express.Router()

router.post('/post', async (req, res, next) => {
    // console.log('this is the post request');

    if (
        !req.body.title || !req.body.text
    ) {
        res.status(403).send(`required parameters are: {
            title: "abc posts title",
            text: "some posts text"
        } `);
        return;
    }
    try {

        const response = await openaiClient.embeddings.create({
            model: "text-embedding-ada-002",
            input: `${req.body.title} ${req.body.text}`,
        })

        const vector = response?.data[0]?.embedding
        console.log("vector: ", vector);

        const upsertResponse = await pcIndex.upsert([{
            id: nanoid(),
            values: vector,
            metadata: {
                title: req.body.title,
                text: req.body.text,
                createdAt: new Date().getTime(),
            }
        }])
        console.log("upsertResponse: ", upsertResponse);


        res.send("Post created!")
    } catch (e) {
        console.log("error inserting pinecone: ", e);
        res.status(500).send({ message: 'server error, please try later' });
    }



})


router.get('/posts', (req, res, next) => {

    setTimeout(async () => {

        try {
            const response = await openaiClient.embeddings.create({
                model: "text-embedding-ada-002",
                input: "",
            });
            const vector = response?.data[0]?.embedding
            console.log("vector: ", vector);

            const queryResponse = await pcIndex.query({
                vector: vector,
                topK: 10000,
                includeValues: true,
                includeMetadata: true
            });

            queryResponse.matches.map(eachMatch => {
                console.log(`score ${eachMatch.score.toFixed(1)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
            })
            console.log(`${queryResponse.matches.length} records found `);

            const formattedOutput = queryResponse.matches.map(eachMatch => ({
                text: eachMatch?.metadata?.text,
                title: eachMatch?.metadata?.title,
                _id: eachMatch?.id,
            }))

            res.send(formattedOutput);

        } catch (e) {
            console.log("error getting data pinecone: ", e);
            res.status(500).send('server error, please try later');
        }
    }, 1000);

})

router.get('/post/:postId', async (req, res, next) => {



    try {
        const postId = await col.findOne({ _id: new ObjectId(req.params.postId) });
        if (postId) {
            console.log(postId);
            res.send(postId);
        } else {
            res.status(404).send("Post not found ");
        }
    } catch (error) {
        console.error("Error finding post:", error);
        res.status(500).send("Error finding post");
    }

})

router.get(`/search`, async (req, res, next) => {
    try {
        const response = await openaiClient.embeddings.create({
            model: "text-embedding-ada-002",
            input: req.query.q,
        });
        const vector = response?.data[0]?.embedding
        console.log("vector: ", vector);

        const queryResponse = await pcIndex.query({
            vector: vector,
            topK: 20,
            includeValues: false,
            includeMetadata: true
        });

        queryResponse.matches.map(eachMatch => {
            console.log(`score ${eachMatch.score.toFixed(1)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
        })
        console.log(`${queryResponse.matches.length} records found `);

        const formattedOutput = queryResponse.matches.map(eachMatch => ({
            text: eachMatch?.metadata?.text,
            title: eachMatch?.metadata?.title,
            _id: eachMatch?.id,
        }))

        res.send(formattedOutput);

    } catch (e) {
        console.log("error getting data pinecone: ", e);
        res.status(500).send('server error, please try later');
    }

})


router.put('/post/:postId', async (req, res, next) => {



    try {

        const response = await openaiClient.embeddings.create({
            model: "text-embedding-ada-002",
            input: `${req.body.title} ${req.body.text}`,
        })

        const vector = response?.data[0]?.embedding
        console.log("vector: ", vector);

        const upsertResponse = await pcIndex.upsert([{
            id: req.params.postId,
            values: vector,
            metadata: {
                title: req.body.title,
                text: req.body.text,
            }
        }])
        console.log("upsertResponse: ", upsertResponse);


        res.send("Post updated!")


    } catch (error) {
        console.error("Error finding post:", error);
        res.status(500).send("Error finding post");
    }
})
router.delete(`/post/:postId`, async (req, res, next) => {

    try {

        const deleteReponse = await pcIndex.deleteOne(req.params.postId);

        console.log("deleteReponse: ", deleteReponse);
        res.send("Post deleted!")
    } catch (error) {
        console.log("error deleting pinecone: ", error);
        res.status(500).send('server error, please try later');
    }


})
export default router