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

async function main() {
    if (process.env.MONGO_URL === undefined) dotenv.config()

    console.log("Connecting to DB...")
    const db = await MongoDB.connect(process.env.MONGO_URL)
    console.log("Connected to DB")
    
    const posts = db.getMutableNullableRepository<Post>("posts", {
        title: required(String),
        body: required(String),
        timestamp: required(Date),
        category: required(String),
        author: reference("users", true)
    })

    const users = db.getMutableNullableRepository<User>("users", {
        email: required(String),
        name: required(String),
        role: required(String)
    })

    const credentials = db.getMutableNullableRepository<LinkedCredentials>("credentials", {
        email: required(String),
        password: required(String),
        user: reference("users", true)
    })
    
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

    const usersRoute = createRouter(CredentialsController, new CredentialsController(credentials, users))
    koaApp.use(usersRoute.routes())
    koaApp.use(usersRoute.allowedMethods())
    
    const usersRouter = createRouter(UsersController, new UsersController(users))
    koaApp.use(usersRouter.routes())
    koaApp.use(usersRouter.allowedMethods())
    
    const postsRouter = createRouter(PostsController, new PostsController(credentials, posts))
    koaApp.use(postsRouter.routes())
    koaApp.use(postsRouter.allowedMethods())
    
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
