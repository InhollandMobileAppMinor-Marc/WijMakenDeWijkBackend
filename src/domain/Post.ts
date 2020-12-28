import { isArray, isBoolean, isObject, isString } from "../utils/checkType"
import moment from "moment"
import { MongoSchema, required, reference } from "@peregrine/mongo-connect"

interface BasePost {
    title: string
    body: string
    category: string
    author: string
    comments: string[]
    hallway: string
    location: string
    deleted: boolean
}

export interface SerialisedPost extends BasePost {
    timestamp: string
}

export interface Post extends BasePost {
    timestamp: Date
}

export const Post = {
    isSerialisedPost: (post: any): post is SerialisedPost => {
        return isObject<SerialisedPost>(post) && isString(post.title) && isString(post.body) 
            && isString(post.timestamp) && isString(post.category) && isString(post.author)
            && isArray(post.comments) && isString(post.hallway) && isString(post.location)
            && isBoolean(post.deleted)
    },
    deserialisePost: (post: SerialisedPost): Post => {
        return {
            title: post.title,
            body: post.body,
            timestamp: moment(post.timestamp).toDate(),
            category: post.category,
            author: post.author,
            comments: post.comments,
            hallway: post.hallway,
            location: post.location,
            deleted: post.deleted
        }
    },
    scheme: {
        title: required(String),
        body: required(String),
        timestamp: required(Date),
        category: required(String),
        author: reference("users", true),
        comments: {
            type: [reference("comments", true)],
            required: true
        },
        hallway: required(String),
        location: {
            ...required(String),
            index: true
        },
        deleted: {
            ...required(Boolean),
            default: false
        }
    } as MongoSchema<Post>
}
