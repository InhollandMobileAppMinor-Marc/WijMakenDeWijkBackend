import { isObject, isString } from "../utils/checkType"
import { MongoSchema, required } from "@peregrine/mongo-connect"

export interface User {
    name: string
    role: "admin" | "user"
    houseNumber: string
    hallway: string
    location: string
}

export const User = {
    isUser: (user: any): user is User => {
        return isObject(user) && isString(user.name) && isString(user.role) 
            && isString(user.houseNumber) && isString(user.hallway) && isString(user.location)
    },
    scheme: {
        name: required(String),
        role: required(String),
        houseNumber: required(String),
        hallway: required(String),
        location: required(String)
    } as MongoSchema<User>
}
