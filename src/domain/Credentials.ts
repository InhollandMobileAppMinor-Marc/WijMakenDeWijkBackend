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
        return isObject(credentials) && isString(credentials.email) && isString(credentials.password)
            && EMAIL_REGEXP.test(credentials.email)
    },
    scheme: {
        email: required(String),
        password: required(String),
        user: reference("users", true)
    } as MongoSchema<LinkedCredentials>
}
