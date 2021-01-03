import { isObject, isString } from "../utils/checkType"
import { EMAIL_REGEXP } from "../utils/email"
import { MongoSchema, required, reference } from "@peregrine/mongo-connect"

export interface Credentials {
    email: string
    password: string
}

export interface LinkedCredentials extends Credentials {
    user: string
}

export const Credentials = {
    areCredentials: (credentials: any): credentials is Credentials => {
        return isObject<Credentials>(credentials) && isString(credentials.email) && 
            isString(credentials.password) && EMAIL_REGEXP.test(credentials.email)
    },
    isCredentialsWithEmail: (credentials: any): credentials is Omit<Credentials, "password"> => {
        return isObject<Credentials>(credentials) && isString(credentials.email) && 
            EMAIL_REGEXP.test(credentials.email)
    },
    isCredentialsWithPassword: (credentials: any): credentials is Omit<Credentials, "email"> => {
        return isObject<Credentials>(credentials) && isString(credentials.password)
    },
    scheme: {
        email: {
            ...required(String),
            index: true
        },
        password: required(String),
        user: reference("users", true)
    } as MongoSchema<LinkedCredentials>
}
