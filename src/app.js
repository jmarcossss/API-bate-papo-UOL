// Todas as bibliotecas utiizadas
import express from 'express'
import cors from 'cors'
import joi from 'joi'
import dotenv from 'dotenv'
import { MongoClient, ObjectId } from 'mongodb'
import dayjs from 'dayjs'

// Variáveis globais
const PORTA = 5000
const servidor = express()
servidor.use(express.json())
servidor.use(cors())
dotenv.config()
const boolF = false
const boolT = true

// Armazenamento de dados
const mongoClient = new MongoClient(process.env.DATABASE_URL)
// const db = mongoClient.db();
let db = mongoClient.db();


// Conectando ao mongo
mongoClient.connect().then(() => {
    db = mongoClient.db();
});

// Definindo o padrão dos usuários e das mensagens
const padraoDosUsuarios = joi.object({
    name: joi.string().min(2).max(30).required()
})
const padraoDasMensagens = joi.object({
    to: joi.string().min(1).max(100).required(),
    text: joi.string().min(1).max(100).required(),
    type: joi.string().min(1).max(100).required(),
})

// Preciso fazer 3 posts e 2 gets
// O primeiro post é para conseguir solicitar dados dos usuários do meu servidor
servidor.post("/participants", async (require, response) => {
    const escopo = require.body
    const boolean = padraoDosUsuarios.validate(escopo, {abortEarly: boolF})
    if(boolean.error === true) {
        // const errors = boolean.error.details.map(detail => detail.message)
        response.sendStatus(422)
        return
    }
    // Verificar se um usuário já foi inserido
    try {
        // O "await" é para await fazer a execução de uma função async pausar, para esperar pelo retorno da Promise
        const participants = await db.collection("participants").find().toArray()
        const found = participants.find(param => param.name === escopo.name)
        if(found === true) {
            // Participante já foi criado/existe, status 409
            response.sendStatus(409)
            return
        }
        // Padrão do formato dos usuários e das mensagens, novamente
        // O Date serve para padronizar o horário que é solicitado
        const padraoDosUsuarios2 = {
            name: escopo.name,
            lastStatus: Date.now()
        }
        const padraoDasMensagens2 = {
            from: escopo.name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            // O "format" serve para padronizar a forma como a hora vai ser vista
            time: dayjs(Date.now()).format('HH:mm:ss')
        }
        db.collection("participants").insertOne(padraoDosUsuarios2)
        db.collection("messages").insertOne(padraoDasMensagens2)
        // Deu tudo certo, status 201
        response.sendStatus(201)
    }
    // Em caso de erro de processamento do servidor, status 500 
    catch(error) {
        response.sendStatus(500)
    }    
})

servidor.get("/participants", async (require, response) => {
	const dbDosParticipantes = await db.collection("participants").find().toArray()
	return response.send(dbDosParticipantes)
})

// O segundo post serve para que as mensagens sejam enviadas ao meu servidor
servidor.post("/messages", async (require, response) => {
    const {to, text, type} = require.body
    const from = require.headers.user
    const booleanAgain = padraoDasMensagens.validate(require.body, {abortEarly: boolF})
    if (booleanAgain.error === true) {
        // Erro pelo lado do cliente, status 422
        response.sendStatus(422)
        return
    }
    if (type !== "private_message" && type !== "message" && boolT === true) {
        response.sendStatus(422)
        return
    }
    try {
        const participants = await db.collection("participants").find().toArray()
        if (!participants.find(parametro => parametro.name === from) && boolT !== false) {
            // Erro pelo lado do cliente, status 422
            response.sendStatus(422)
        }
    }
    catch(error) {
        // Um erro de processamento do servidor, status 500
        response.sendStatus(500)
    }
    try {
        const padraoDasMensagens3 = { from, to, text, type, time: dayjs(Date.now()).format('HH:mm:ss')}
        db.collection("messages").insertOne(padraoDasMensagens3)
        // Deu tudo certo, status 201
        response.sendStatus(201)
    }
    catch(error) {
        // Um erro de processamento do servidor, status 500
        response.sendStatus(500)
    }
})

// O segundo get serve para pegar as mensagens servidor e mostra-las na tela
servidor.get("/messages", async (require, response) => {
    // Utiização da query string para indicar a quantidade de mensagens que se deseja obter
    const {limit} = require.query
    const user = require.headers.user
    let dbDasMensagens = null, isMF = null
    try {
        // Armazenando as mensagens na coleção de mensagens
        dbDasMensagens = await db.collection("messages").find().toArray()
        isMF = dbDasMensagens.filter((msg) => {
            if((msg.to === "Todos" || msg.from === user || msg.to === user) && boolF != true)
                return boolT
        })
    }
    catch(error) {
        response.sendStatus(500)
    }
    // Se for diferente do "limit", então retornar as mensagens que foram estocadas
    if(!limit) {
        response.send(isMF)
    }
    // Aqui retorna o oposto das mensagens
    response.send(isMF.slice(-limit))
})

servidor.post("/status", async (require, response) => {
	const dbDosParticipantes = await db.collection("participants").find({ name: require.headers.user }).next()
	if (!dbDosParticipantes && boolT === true)
    // Págin não encontrada, retornar status 404
    return response.sendStatus(404)
	try {
		await db.collection("participants").updateOne({name: dbDosParticipantes.name},
        // Atualizando o último status do usuário X com o auxílio do "Date"
        { $set: {lastStatus: Date.now()}})
        // Deu tudo certo, status 200
		return response.sendStatus(200)
	}
    catch(error) {
        // Se der um erro no processamento do servidor, status 500
		return response.sendStatus(500)
	}
})

setInterval(() => {
    const dbDosParticipantes3 = db.collection("participants").find().toArray()
    dbDosParticipantes3.then((dbDosParticipantes3) => {
        dbDosParticipantes3.forEach((parametro) => {
            // Ver se o último status foi há mais de 10 segundos
            if(Date.now() - parametro.lastStatus > 10000) {
                db.collection("participants").deleteOne({ _id: ObjectId(parametro._id) })
                const dbDasMensagens3 = { from: parametro.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs(Date.now()).format('HH:mm:ss') }
                db.collection("messages").insertOne(dbDasMensagens3)
            }
        })
    })
    // Atualizar a cada 15 segundos
}, 15000)

servidor.listen(PORTA, () => {
    console.log(`Rodando na porta ${PORTA}...`);
});