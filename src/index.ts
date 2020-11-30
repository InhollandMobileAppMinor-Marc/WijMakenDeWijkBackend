import { createRouter } from "@peregrine/koa-with-decorators"
import dotenv from "dotenv"
import { MongoDB, reference, required } from "@peregrine/mongo-connect"
import Koa, { Context, Next } from "koa"
import bodyParser from "koa-bodyparser"
import { PostsController } from "./controllers/PostsController"
import { Post } from "./domain/Post"
import { promisify } from "./utils/promisify"
import { User } from "./domain/User"
import { CredentialsController } from "./controllers/CredentialsController"
import { getUserFromRequest } from "./data/getUserFromRequest"
import { LinkedCredentials } from "./domain/Credentials"
import { UsersController } from "./controllers/UsersController"
import { Comment } from "./domain/Comment"
import { CommentsController } from "./controllers/CommentsController"

async function main() {
    if (process.env.MONGO_URL === undefined) dotenv.config()

    console.log("Connecting to DB...")
    const db = await MongoDB.connect(process.env.MONGO_URL)
    console.log("Connected to DB")

    const mongoErrorHandler = (error: Error) => {
        console.error(error)
        return true
    }

    const users = db.getMutableRepository<User>("users", {
        name: required(String),
        role: required(String),
        houseNumber: required(String),
        hallway: required(String),
        location: required(String)
    }, mongoErrorHandler)

    const comments = db.getMutableRepository<Comment>("comments", {
        body: required(String),
        timestamp: required(Date),
        author: reference("users", true),
        post: reference("posts", true)
    }, mongoErrorHandler)
    
    const posts = db.getMutableRepository<Post>("posts", {
        title: required(String),
        body: required(String),
        timestamp: required(Date),
        category: required(String),
        author: reference("users", true),
        comments: {
            type: [reference("comments", true)],
            required: true
        }
    }, mongoErrorHandler)

    const credentials = db.getMutableRepository<LinkedCredentials>("credentials", {
        email: required(String),
        password: required(String),
        user: reference("users", true)
    }, mongoErrorHandler)
    
    const koaApp = new Koa()
    koaApp.use(bodyParser())

    koaApp.use(async ({ request, response }, next) => {
        if(
            request.path.startsWith("/api/v0") && 
            !request.path.startsWith("/api/v0/login") && 
            !request.path.startsWith("/api/v0/register")
        ) {
            try {
                await getUserFromRequest(credentials, request)
            } catch (error) {
                response.status = 401
                response.body = {
                    message: error instanceof Error ? error.message : "Unknown Error"
                }
                return
            }
        }

        return await next()
    })

    const credentialsRouter = createRouter(CredentialsController, new CredentialsController(credentials, users))
    koaApp.use(credentialsRouter.routes())
    koaApp.use(credentialsRouter.allowedMethods())
    
    const usersRouter = createRouter(UsersController, new UsersController(users))
    koaApp.use(usersRouter.routes())
    koaApp.use(usersRouter.allowedMethods())
    
    const postsRouter = createRouter(PostsController, new PostsController(credentials, posts, comments))
    koaApp.use(postsRouter.routes())
    koaApp.use(postsRouter.allowedMethods())
    
    const commentsRouter = createRouter(CommentsController, new CommentsController(comments))
    koaApp.use(commentsRouter.routes())
    koaApp.use(commentsRouter.allowedMethods())

    // Remove default response body, catch all errors.
    koaApp.use(async (ctx: Context, next: Next) => {
        try {
            await next()
        } catch (err) {
            console.error(err)
            ctx.response.status = 500
        }
    
        const statusCode = ctx.response.status as number | null ?? 404
        ctx.response.body = ctx.response.body ?? ""
        ctx.response.status = statusCode
    })
    
    const port = process.env.PORT ?? 8080
    
    console.log("Starting server...")
    await promisify((cb) => koaApp.listen(port, cb))
    
    console.log(`Server is running on port ${port}`)
}

main().catch(err => console.error(err))
