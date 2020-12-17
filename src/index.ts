import { createRouter } from "@peregrine/koa-with-decorators"
import dotenv from "dotenv"
import { MongoDB } from "@peregrine/mongo-connect"
import Koa, { Context, Next } from "koa"
import bodyParser from "koa-bodyparser"
import { PostsController } from "./controllers/PostsController"
import { Post } from "./domain/Post"
import { promisify } from "./utils/promisify"
import { User } from "./domain/User"
import { CredentialsController } from "./controllers/CredentialsController"
import { getUserFromRequest } from "./data/getUserFromRequest"
import { Credentials } from "./domain/Credentials"
import { UsersController } from "./controllers/UsersController"
import { Comment } from "./domain/Comment"
import { CommentsController } from "./controllers/CommentsController"
import { Notification } from "./domain/Notification"
import { NotificationsController } from "./controllers/NotificationsController"
import { StatusController } from "./controllers/StatusController"
import Router from "@koa/router"

async function main() {
    if (process.env.MONGO_URL === undefined) dotenv.config()

    console.log("Connecting to DB...")
    const db = await MongoDB.connect(process.env.MONGO_URL)
    console.log("Connected to DB")

    const mongoErrorHandler = (error: Error) => {
        console.error(error)
        return true
    }

    const users = db.getMutableRepository("users", User.scheme, mongoErrorHandler)

    const comments = db.getMutableRepository("comments", Comment.scheme, mongoErrorHandler)

    const notifications = db.getMutableRepository("notifications", Notification.scheme, mongoErrorHandler)
    
    const posts = db.getMutableRepository("posts", Post.scheme, mongoErrorHandler)

    const credentials = db.getMutableRepository("credentials", Credentials.scheme, mongoErrorHandler)
    
    const koaApp = new Koa()
    koaApp.use(bodyParser())

    const apiVersionZeroRoute = new Router({
        prefix: "/api/v0"
    })

    apiVersionZeroRoute.use(async ({ request, response }, next) => {
        if(
            !request.path.startsWith("/api/v0/login") && 
            !request.path.startsWith("/api/v0/register") && 
            !request.path.startsWith("/api/v0/status")
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

    const credentialsRouter = createRouter(new CredentialsController(credentials, users))
    apiVersionZeroRoute.use(credentialsRouter.routes())
    apiVersionZeroRoute.use(credentialsRouter.allowedMethods())

    const statusRouter = createRouter(new StatusController(credentials, users))
    apiVersionZeroRoute.use(statusRouter.routes())
    apiVersionZeroRoute.use(statusRouter.allowedMethods())
    
    const usersRouter = createRouter(new UsersController(users))
    apiVersionZeroRoute.use(usersRouter.routes())
    apiVersionZeroRoute.use(usersRouter.allowedMethods())
    
    const postsRouter = createRouter(new PostsController(credentials, users, posts))
    apiVersionZeroRoute.use(postsRouter.routes())
    apiVersionZeroRoute.use(postsRouter.allowedMethods())
    
    const commentsRouter = createRouter(new CommentsController(credentials, comments, posts, notifications))
    apiVersionZeroRoute.use(commentsRouter.routes())
    apiVersionZeroRoute.use(commentsRouter.allowedMethods())
    
    const notificationsRouter = createRouter(new NotificationsController(credentials, notifications))
    apiVersionZeroRoute.use(notificationsRouter.routes())
    apiVersionZeroRoute.use(notificationsRouter.allowedMethods())

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
