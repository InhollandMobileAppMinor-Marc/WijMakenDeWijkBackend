import { BasicAuth, BearerToken, attachRoutesToRouter, HttpStatusCodes } from "@peregrine/koa-with-decorators"
import dotenv from "dotenv"
import { MongoDB } from "@peregrine/mongo-connect"
import Koa, { Context, Next } from "koa"
import bodyParser from "koa-bodyparser"
import { PostsController } from "./controllers/PostsController"
import { Post } from "./domain/Post"
import { promisify } from "./utils/promisify"
import { User } from "./domain/User"
import { CredentialsController } from "./controllers/CredentialsController"
import { Credentials } from "./domain/Credentials"
import { UsersController } from "./controllers/UsersController"
import { Comment } from "./domain/Comment"
import { CommentsController } from "./controllers/CommentsController"
import { Notification } from "./domain/Notification"
import { NotificationsController } from "./controllers/NotificationsController"
import { StatusController } from "./controllers/StatusController"
import { SwaggerController } from "./controllers/SwaggerController"
import Router from "@koa/router"
import { isString } from "./utils/checkType"
import { verifyAuthentication } from "./data/verifyAuthentication"

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

    // Remove default response body, catch all errors.
    koaApp.use(async (ctx: Context, next: Next) => {
        let nxt: any
        try {
            nxt = await next()
        } catch (err) {
            console.error(err)
            ctx.response.status = HttpStatusCodes.InternalServerError
        }
    
        const statusCode = ctx.response.status as number | null ?? HttpStatusCodes.NotFound
        ctx.response.body = ctx.response.body ?? ""
        ctx.response.status = statusCode
        
        return nxt
    })

    koaApp.use(async ({ request, response }, next) => {
        if(
            request.path.startsWith(apiPath) && 
            !request.path.startsWith(`${apiPath}/login`) && 
            !request.path.startsWith(`${apiPath}/register`) && 
            !request.path.startsWith(`${apiPath}/status`) && 
            !request.path.startsWith(`${apiPath}/swagger`)
        ) {
            try {
                const authHeader = request.get("Authorization")
                if (!isString(authHeader) || authHeader === "")
                    throw new Error("No Authorization header provided")
                        
                let authObj: BearerToken | BasicAuth | null = null
                        
                if (authHeader.startsWith("Basic")) {
                    authObj = new BasicAuth(authHeader.replace("Basic ", ""))
                } else if (authHeader.startsWith("Bearer")) {
                    authObj = new BearerToken(authHeader.replace("Bearer ", ""))
                }
            
                await verifyAuthentication(authObj, credentials)
            } catch (error) {
                response.status = HttpStatusCodes.Unauthorized
                response.body = {
                    message: error instanceof Error ? error.message : "Unknown Error"
                }
                return
            }
        }

        return await next()
    })

    const apiPath = "/api/v1"

    let apiVersionZeroRoute = new Router({
        prefix: apiPath
    })

    apiVersionZeroRoute = attachRoutesToRouter(
        new CredentialsController(credentials, users), 
        apiVersionZeroRoute
    )

    apiVersionZeroRoute = attachRoutesToRouter(
        new StatusController(credentials, users), 
        apiVersionZeroRoute
    )

    apiVersionZeroRoute = attachRoutesToRouter(
        new UsersController(credentials, users), 
        apiVersionZeroRoute
    )

    apiVersionZeroRoute = attachRoutesToRouter(
        new PostsController(credentials, users, posts), 
        apiVersionZeroRoute
    )

    apiVersionZeroRoute = attachRoutesToRouter(
        new CommentsController(credentials, users, comments, posts, notifications), 
        apiVersionZeroRoute
    )

    apiVersionZeroRoute = attachRoutesToRouter(
        new NotificationsController(credentials, notifications), 
        apiVersionZeroRoute
    )

    apiVersionZeroRoute = attachRoutesToRouter(
        new SwaggerController(
            CredentialsController, 
            StatusController, 
            UsersController, 
            PostsController, 
            CommentsController, 
            NotificationsController
        ), apiVersionZeroRoute
    )

    koaApp.use(apiVersionZeroRoute.routes())
    koaApp.use(apiVersionZeroRoute.allowedMethods())
    
    const port = process.env.PORT ?? 8080
    
    console.log("Starting server...")
    await promisify((cb) => koaApp.listen(port, cb))
    
    console.log(`Server is running on port ${port}`)
}

main().catch(err => console.error(err))
