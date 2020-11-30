import { isObject, isString } from "../utils/checkType"

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
    }
}
