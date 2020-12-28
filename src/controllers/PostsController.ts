import { Auth, BasicAuth, BearerToken, Body, CachedFor, Controller, DefaultStatusCode, HttpDelete, HttpGet, HttpPost, HttpStatusCodes, ID, Path, Query, Res } from "@peregrine/koa-with-decorators"
import { DocumentQueryBuilder, DocumentsArrayQueryBuilder, Filter, MutableRepository, Repository, WithId } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { verifyAuthentication } from "../data/verifyAuthentication"
import { Comment } from "../domain/Comment"
import { LinkedCredentials } from "../domain/Credentials"
import { Post } from "../domain/Post"
import { User } from "../domain/User"

@Controller("/posts")
export class PostsController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly usersRepo: Repository<User>,
        private readonly posts: MutableRepository<Post>
    ) {}

    protected static getPostPreference(userHallway: string | null, first: WithId<Post>, second: WithId<Post>): number {
        const differenceInHours = Math.round((first.timestamp.getTime() - second.timestamp.getTime()) / 1000 / 60 / 60)
        if(userHallway === null) return differenceInHours
        // Award additional points if the post was made in the same hallway
        const thresholdInHours = 36
        const scoreForFirst = (differenceInHours > 0 ? differenceInHours : 0) + (first.hallway === userHallway ? thresholdInHours : 0)
        const scoreForSecond = (differenceInHours < 0 ? differenceInHours * -1 : 0) + (second.hallway === userHallway ? thresholdInHours : 0)
        // Preference if score is the same
        const hallwayBasedPreference = 
            first.hallway === userHallway && second.hallway !== userHallway ? -1 : 
            second.hallway === userHallway && first.hallway !== userHallway ? 1 : 0
        return scoreForFirst === scoreForSecond ? hallwayBasedPreference : scoreForSecond - scoreForFirst
    }

    @HttpGet
    @DefaultStatusCode(HttpStatusCodes.OK)
    @CachedFor(90, "seconds")
    public async getAllPosts(
        @Auth auth: BearerToken | BasicAuth | null,
        @Query("categories") categoriesQuery: string | undefined, 
        @Query("inlineAuthor") inlineAuthor: "true" | "false" | undefined, 
        @Query("inlineComments") inlineComments: "true" | "false" | undefined, 
        @Res response: Response
    ) {
        const user = await this.usersRepo.getById((await verifyAuthentication(auth, this.credentialsRepo)).user)
        const categories = (categoriesQuery as string | null | undefined)?.split(",") ?? null
        const filter: Filter<Post> = { location: user?.location }
        if(categories !== null) filter.category = { $in: categories }
        let query = this.posts.filterAndQuery(filter, { sort: { timestamp: "desc" } })
        if (inlineComments === "true") {
            let tmp = query.inlineReferencedObject<Comment>("comments")
            query = (inlineAuthor === "true" ? 
                tmp.inlineReferencedSubObject<User, "comments">("comments", "author") : 
                tmp) as unknown as DocumentsArrayQueryBuilder<Post>
        }
        if (inlineAuthor === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentsArrayQueryBuilder<Post>

        response.body = (await query.getResult()).sort((first, second) => PostsController.getPostPreference(user?.hallway ?? null, first, second))
    }

    @HttpGet
    @Path("/:id")
    @DefaultStatusCode(HttpStatusCodes.OK)
    @CachedFor(90, "seconds")
    public async getPostById(
        @ID id: string,
        @Query("inlineAuthor") inlineAuthor: "true" | "false" | undefined, 
        @Query("inlineComments") inlineComments: "true" | "false" | undefined, 
        @Res response: Response
    ) {
        let query = this.posts.queryById(id)
        if (inlineComments === "true") {
            let tmp = query.inlineReferencedObject<Comment>("comments")
            query = (inlineAuthor === "true" ? 
                tmp.inlineReferencedSubObject<User, "comments">("comments", "author") : 
                tmp) as unknown as DocumentQueryBuilder<Post>
        }
        if (inlineAuthor === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Post>
        
        const item = await query.getResult()
        if(item === null) {
            response.status = HttpStatusCodes.NotFound
        } else {
            response.body = item
        }
    }

    @HttpPost
    @DefaultStatusCode(HttpStatusCodes.Created)
    public async createPost(
        @Auth auth: BearerToken | BasicAuth | null,
        @Body body: Partial<Post>,
        @Query("inlineAuthor") inlineAuthor: "true" | "false" | undefined, 
        @Res response: Response
    ) {
        const authorId = (await verifyAuthentication(auth, this.credentialsRepo))?.user?.toString()
        const user = await this.usersRepo.getById(authorId)
        body.author = authorId
        body.comments = []
        body.hallway = user?.hallway
        body.location = user?.location
        if (!Post.isSerialisedPost(body)) {
            response.status = HttpStatusCodes.BadRequest
            response.body = {
                message: "Invalid request body"
            }
        } else {
            const post = Post.deserialisePost(body)
            const createdPost = await this.posts.add(post)

            if (createdPost === null)
                throw new Error("Unkown error")

            let query = this.posts.queryById(createdPost.id)
            if (inlineAuthor === "true")
                query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Post>

            response.body = await query.getResult()
        }
    }

    @HttpDelete
    @Path("/:id")
    @DefaultStatusCode(HttpStatusCodes.NoContent)
    public async deleteComment(
        @Auth auth: BearerToken | BasicAuth | null,
        @ID id: string,
        @Res response: Response
    ) {
        const userId = (await verifyAuthentication(auth, this.credentialsRepo))?.user?.toString()
        const user = await this.usersRepo.getById(userId)
        const post = await this.posts.getById(id)

        if(post?.author?.toString() !== userId && user?.role !== "admin") {
            response.status = HttpStatusCodes.Unauthorized
            return
        }

        await this.posts.patch(id, { deleted: true })
    }
}
