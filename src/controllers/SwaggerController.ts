import { CachedFor, Controller, DefaultStatusCode, HttpGet, HttpStatusCodes, Res } from "@peregrine/koa-with-decorators"
import { getOpenApiPathsJson } from "@peregrine/koa-with-decorators/build/main/preview"
import { Response } from "koa"

@Controller("/swagger")
export class SwaggerController {
    private readonly endpoints: (new (...args: any[]) => Object)[]

    constructor(
        ...endpoints: (new (...args: any[]) => Object)[]
    ) {
        this.endpoints = endpoints
    }

    @HttpGet
    @DefaultStatusCode(HttpStatusCodes.OK)
    @CachedFor(18, "hours")
    public async generateSwaggerScript(@Res response: Response) {
        const swaggerScript: {[key: string]: any} = {
            openapi: "3.0.1",
            info: {
                title: "Wij maken de Wijk API",
                version: "v1"
            },
            servers: [
                {
                    url: "https://wij-maken-de-wijk.herokuapp.com/api/v1/"
                }
            ],
            paths: {},
            components: {
                securitySchemes: {}
            }
        }

        for (const endpoint of this.endpoints) {
            const { paths, components } = getOpenApiPathsJson(endpoint)
            for(const path in paths) {
                swaggerScript.paths[path] = paths[path]
            }
            const securitySchemes = components.securitySchemes
            for (const scheme in securitySchemes) {
                if(!(scheme in swaggerScript.components.securitySchemes)) {
                    swaggerScript.components.securitySchemes[scheme] = securitySchemes[scheme]
                }
            }
        }

        response.set("Access-Control-Allow-Origin", "*")
        response.body = swaggerScript
    }
}
